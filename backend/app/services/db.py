"""
Database Service - MongoDB Connection & User Persistence Layer
Connects to MongoDB cyclosafe database for authenticating Admin and Community Users
"""

import os
import secrets
import hashlib
from datetime import datetime
from typing import Optional, Dict, Any, List
import pymongo
from pymongo.errors import PyMongoError

# Database configuration from environment or defaults
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "cyclosafe")
ADMIN_PASSWORD = os.getenv("CYCLOSAFE_ADMIN_PASSWORD", "Admin@123SecurePassword")
ADMIN_MOBILE = os.getenv("CYCLOSAFE_ADMIN_MOBILE", "9999999999")

_client = None
_db = None


def get_db():
    """Returns connected MongoDB database instance with auto-reconnect."""
    global _client, _db
    if _db is not None:
        try:
            # Ping database to verify connection
            _client.admin.command('ping')
            return _db
        except Exception:
            _client = None
            _db = None

    try:
        _client = pymongo.MongoClient(MONGODB_URI, serverSelectionTimeoutMS=3000)
        _db = _client[MONGODB_DATABASE]
        return _db
    except Exception as e:
        print(f"[MongoDB] Connection error: {e}")
        return None


def hash_password(password: str, salt: Optional[str] = None) -> str:
    """Generate PBKDF2-HMAC-SHA256 password hash with salt."""
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()
    return f"{salt}$100000${hashed}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify password against stored PBKDF2 hash."""
    if not stored_hash:
        return False
    try:
        parts = stored_hash.split('$')
        if len(parts) == 3:
            salt, iterations_str, expected = parts
            iterations = int(iterations_str)
            computed = hashlib.pbkdf2_hmac(
                'sha256',
                password.encode('utf-8'),
                salt.encode('utf-8'),
                iterations
            ).hex()
            return secrets.compare_digest(computed, expected)
        # Direct comparison fallback
        return secrets.compare_digest(password, stored_hash)
    except Exception:
        return False


def sanitize_user(user: Dict[str, Any]) -> Dict[str, Any]:
    """Strip sensitive fields before returning user document to clients."""
    if not user:
        return None
    clean = dict(user)
    clean.pop("_id", None)
    clean.pop("password_hash", None)
    clean.pop("password", None)
    clean.pop("salt", None)
    return clean


def init_db():
    """
    Initializes database indexes and ensures default Admin user exists.
    """
    db = get_db()
    if db is None:
        print("[MongoDB] Warning: Database unavailable at startup. Will retry on demand.")
        return False

    try:
        users = db["users"]
        
        # Ensure default Admin user exists
        admin_doc = users.find_one({"role": "admin"})
        if not admin_doc:
            admin_user = {
                "id": "ADM-001",
                "name": "Command Center Admin",
                "email": "admin@cyclosafe.org",
                "phone": ADMIN_MOBILE,
                "mobile": ADMIN_MOBILE,
                "role": "admin",
                "user_type": "admin",
                "status": "ACTIVE",
                "password_hash": hash_password(ADMIN_PASSWORD),
                "coastal_region": "National Operations Center",
                "created_at": datetime.utcnow().isoformat() + "Z",
                "last_login": None
            }
            users.insert_one(admin_user)
            print(f"[MongoDB] Default Admin seeded successfully (Email: admin@cyclosafe.org, Mobile: {ADMIN_MOBILE})")
        else:
            update_fields = {}
            if not admin_doc.get("mobile") and not admin_doc.get("phone"):
                update_fields["mobile"] = ADMIN_MOBILE
                update_fields["phone"] = ADMIN_MOBILE
            elif admin_doc.get("mobile") and not admin_doc.get("phone"):
                update_fields["phone"] = admin_doc.get("mobile")
            elif not admin_doc.get("mobile") and admin_doc.get("phone"):
                update_fields["mobile"] = admin_doc.get("phone")
                
            if not admin_doc.get("password_hash"):
                update_fields["password_hash"] = hash_password(ADMIN_PASSWORD)
            
            if update_fields:
                try:
                    users.update_one({"_id": admin_doc["_id"]}, {"$set": update_fields})
                    print(f"[MongoDB] Admin synced with fields: {list(update_fields.keys())}")
                except Exception as ex:
                    print(f"[MongoDB] Admin field sync note: {ex}")

        print("[MongoDB] Connected and initialized successfully.")
        return True
    except Exception as e:
        print(f"[MongoDB] Init error: {e}")
        return False


def find_user_by_identifier(identifier: str) -> Optional[Dict[str, Any]]:
    """
    Find user by either email or phone/mobile number.
    Handles trimming and case-insensitive email search.
    """
    db = get_db()
    if db is None:
        return None

    clean_id = identifier.strip()
    users = db["users"]
    
    # Check phone/mobile or email
    query = {
        "$or": [
            {"phone": clean_id},
            {"mobile": clean_id},
            {"email": {"$regex": f"^{clean_id}$", "$options": "i"}}
        ]
    }
    return users.find_one(query)


def save_user(user_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Inserts or updates a user in MongoDB.
    """
    db = get_db()
    if db is None:
        raise RuntimeError("MongoDB connection is unavailable")

    users = db["users"]
    user_id = user_data.get("id")
    
    if user_id:
        users.update_one({"id": user_id}, {"$set": user_data}, upsert=True)
    else:
        users.insert_one(user_data)
        
    return user_data


def get_community_users(user_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Returns registered fishermen and citizens from MongoDB (excludes system admins).
    """
    db = get_db()
    if db is None:
        return []

    users = db["users"]
    query: Dict[str, Any] = {"role": {"$ne": "admin"}}
    
    if user_type:
        query["user_type"] = user_type.lower()
        
    cursor = users.find(query).sort("registered_at", pymongo.DESCENDING)
    results = []
    for doc in cursor:
        results.append(sanitize_user(doc))
    return results


def delete_user_by_id(user_id: str) -> bool:
    """
    Deletes user by ID from MongoDB.
    """
    db = get_db()
    if db is None:
        return False
    users = db["users"]
    res = users.delete_one({"id": user_id, "role": {"$ne": "admin"}})
    return res.deleted_count > 0


def update_user_status_in_db(user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Updates status and settings of a user in MongoDB.
    """
    db = get_db()
    if db is None:
        return None
    users = db["users"]
    users.update_one({"id": user_id}, {"$set": updates})
    doc = users.find_one({"id": user_id})
    return sanitize_user(doc)


def clear_community_users_in_db() -> bool:
    """
    Clears all community users while preserving admin accounts.
    """
    db = get_db()
    if db is None:
        return False
    users = db["users"]
    users.delete_many({"role": {"$ne": "admin"}})
    return True
