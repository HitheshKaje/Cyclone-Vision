"""
Authentication Routes - Admin & Coastal User Authentication
Provides secure, separate endpoints for Admin and Citizen/Fisherman access
backed by MongoDB persistence.
"""

import re
import secrets
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, Field

from services.db import (
    find_user_by_identifier,
    verify_password,
    hash_password,
    sanitize_user,
    save_user,
    get_db
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
PHONE_REGEX = re.compile(r"^[6-9]\d{9}$")


class LoginRequest(BaseModel):
    login_type: str = Field(..., description="'mobile' or 'email'")
    identifier: str = Field(..., description="Mobile number or email address")
    password: str = Field(..., description="User or admin password")
    role_target: str = Field("user", description="'admin' or 'user'")


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, description="Full Name")
    login_type: str = Field("mobile", description="'mobile' or 'email'")
    phone: str = Field(..., description="10-digit mobile phone number")
    email: Optional[str] = Field(None, description="Optional email address")
    password: str = Field(..., min_length=6, description="Password (at least 6 characters)")
    user_type: str = Field("citizen", description="'citizen' or 'fisherman'")
    port: Optional[str] = None
    district: Optional[str] = None
    ward: Optional[str] = None
    vessel_name: Optional[str] = None
    vessel_reg: Optional[str] = None
    vessel_type: Optional[str] = None
    emergency_contact: Optional[str] = None
    status: Optional[str] = None


@router.post("/login")
async def login(payload: LoginRequest):
    """
    Validates user or admin credentials based on either Mobile Number or Email.
    Updates last_login in MongoDB and returns authenticated profile & session token.
    """
    clean_identifier = payload.identifier.strip()
    login_type = payload.login_type.lower()
    role_target = payload.role_target.lower()

    # 1. Validation checks
    if not clean_identifier:
        field_name = "Mobile number" if login_type == "mobile" else "Email address"
        raise HTTPException(status_code=400, detail=f"{field_name} is required.")

    if login_type == "mobile":
        # Remove any leading +91 or dashes
        digits = re.sub(r"\D", "", clean_identifier)
        if len(digits) == 12 and digits.startswith("91"):
            digits = digits[2:]
        if len(digits) != 10 or not PHONE_REGEX.match(digits):
            raise HTTPException(
                status_code=400, 
                detail="Please enter a valid 10-digit mobile number (e.g. 9876543210)."
            )
        clean_identifier = digits

    elif login_type == "email":
        if not EMAIL_REGEX.match(clean_identifier):
            raise HTTPException(
                status_code=400, 
                detail="Please enter a valid email address (e.g. user@domain.com)."
            )

    if not payload.password:
        raise HTTPException(status_code=400, detail="Password is required.")

    # 2. Lookup in MongoDB
    user = find_user_by_identifier(clean_identifier)
    if not user:
        raise HTTPException(
            status_code=401, 
            detail="Account not found. Please verify your mobile/email or register."
        )

    # 3. Route Security & Role Isolation
    user_role = (user.get("role") or "coastal_user").lower()
    
    if role_target == "admin":
        if user_role != "admin":
            raise HTTPException(
                status_code=403, 
                detail="Access denied: Admin credentials are required for this route."
            )
    else:
        # User portal login
        if user_role == "admin":
            raise HTTPException(
                status_code=403,
                detail="Admin accounts must use the dedicated Admin Portal (/admin/login)."
            )

    # 4. Verify password
    stored_hash = user.get("password_hash")
    if not stored_hash or not verify_password(payload.password, stored_hash):
        raise HTTPException(status_code=401, detail="Invalid password. Please try again.")

    # 5. Update last_login in MongoDB
    db = get_db()
    if db is not None:
        db["users"].update_one(
            {"_id": user["_id"]},
            {"$set": {"last_login": datetime.utcnow().isoformat() + "Z"}}
        )

    # 6. Issue secure session token
    token = secrets.token_urlsafe(32)

    return {
        "status": "success",
        "message": f"Welcome back, {user.get('name', 'User')}!",
        "token": token,
        "user": sanitize_user(user)
    }


@router.post("/register")
async def register(payload: RegisterRequest):
    """
    Registers a new coastal citizen or fisherman into MongoDB.
    Validates mobile format, uniqueness, and profile requirements.
    """
    clean_name = payload.name.strip()
    if len(clean_name) < 2:
        raise HTTPException(status_code=400, detail="Please enter a valid full name (min 2 characters).")

    # Clean and validate phone
    digits = re.sub(r"\D", "", payload.phone.strip())
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    if len(digits) != 10 or not PHONE_REGEX.match(digits):
        raise HTTPException(
            status_code=400, 
            detail="Please enter a valid 10-digit mobile number (e.g. 9876543210)."
        )

    # Validate optional email
    clean_email = payload.email.strip().lower() if payload.email and payload.email.strip() else None
    if clean_email:
        if "@" in clean_email and "." not in clean_email.split("@")[-1]:
            clean_email = f"{clean_email}.com"
        if not EMAIL_REGEX.match(clean_email):
            raise HTTPException(
                status_code=400, 
                detail="Please enter a valid email address (e.g. user@domain.com) or leave it blank."
            )

    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    # Check for duplicate user in MongoDB
    existing_phone = find_user_by_identifier(digits)
    if existing_phone:
        raise HTTPException(
            status_code=409, 
            detail="An account with this mobile number already exists. Please login."
        )

    if clean_email:
        existing_email = find_user_by_identifier(clean_email)
        if existing_email:
            raise HTTPException(
                status_code=409, 
                detail="An account with this email address already exists. Please login."
            )

    # Determine user type and operational status
    u_type = payload.user_type.lower()
    if u_type not in ["fisherman", "citizen"]:
        u_type = "citizen"

    default_status = "IN_HARBOR" if u_type == "fisherman" else "ACTIVE"
    status = payload.status or default_status

    # Generate user ID
    timestamp_suffix = str(int(datetime.utcnow().timestamp()))[-4:]
    prefix = "USR-F" if u_type == "fisherman" else "USR-C"
    user_id = f"{prefix}-{timestamp_suffix}"

    # Build new user document
    new_user = {
        "id": user_id,
        "name": clean_name,
        "phone": digits,
        "mobile": digits,
        "email": clean_email,
        "role": "coastal_user",
        "user_type": u_type,
        "status": status,
        "password_hash": hash_password(payload.password),
        "port": payload.port if u_type == "fisherman" else None,
        "vessel_name": payload.vessel_name.strip() if payload.vessel_name and u_type == "fisherman" else None,
        "vessel_reg": payload.vessel_reg.strip() if payload.vessel_reg and u_type == "fisherman" else None,
        "vessel_type": payload.vessel_type if u_type == "fisherman" else None,
        "district": payload.district or "Coastal District",
        "ward": payload.ward.strip() if payload.ward and u_type == "citizen" else None,
        "emergency_contact": payload.emergency_contact.strip() if payload.emergency_contact else None,
        "alerts_enabled": True,
        "registered_at": datetime.utcnow().isoformat() + "Z",
        "created_at": datetime.utcnow().isoformat() + "Z",
        "last_login": datetime.utcnow().isoformat() + "Z"
    }

    try:
        save_user(new_user)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error saving user: {str(e)}")

    token = secrets.token_urlsafe(32)

    return {
        "status": "success",
        "message": f"Welcome, {clean_name}! Account created successfully.",
        "token": token,
        "user": sanitize_user(new_user)
    }
