"""
CycloSafe - Citizen & Coastal Community API Routes
Provides:
1. Dynamic real-time Cyclone Broadcast from Admin AI Analysis to Citizens.
2. Coastal Lighthouse Siren & Beacon controller.
3. Verified historical cyclone tracks from official IMD archives.
"""

from fastapi import APIRouter
from datetime import datetime
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

router = APIRouter()

# In-memory Active Coastal Broadcast State
ACTIVE_BROADCAST = {
    "available": True,
    "active": False,
    "cyclone_name": None,
    "classification": "NONE",
    "wind_speed_kt": None,
    "wind_speed_kmh": None,
    "confidence_percent": None,
    "level": "NORMAL",             # NORMAL, YELLOW, ORANGE, RED
    "siren_active": False,         # Controls Lighthouse acoustic siren & strobe
    "title": "Normal Coastal Conditions",
    "message": "No active coastal cyclone warning is currently in force for Indian coastal waters. All monitored maritime sectors clear.",
    "fishermen_directive": "Regular seasonal fishing guidelines apply. Monitor local port signals.",
    "area": "West & East Coast Maritime Zones",
    "source": "CycloSafe Early Warning Command Center",
    "issued_at": datetime.utcnow().isoformat() + "Z",
    "coordinates": {"lat": 14.8, "lng": 73.5}
}

class BroadcastPayload(BaseModel):
    cyclone_name: Optional[str] = "Tropical Cyclone Disturbance"
    classification: Optional[str] = "SEVERE"
    wind_speed_kt: Optional[float] = 65.0
    wind_speed_kmh: Optional[float] = 120.4
    confidence_percent: Optional[float] = 95.0
    level: Optional[str] = "RED" # YELLOW, ORANGE, RED
    siren_active: Optional[bool] = False
    message: Optional[str] = None
    fishermen_directive: Optional[str] = None
    area: Optional[str] = "Karnataka & Central West Coast"
    lat: Optional[float] = 14.8
    lng: Optional[float] = 73.5

class SirenTogglePayload(BaseModel):
    siren_active: bool

# Verified Historical Cyclones Archive (Official IMD / RSMC Best-Track Archives)
VERIFIED_HISTORICAL_CYCLONES = [
  {
    "id": "tc_dana_2024",
    "name": "Cyclone Dana",
    "year": 2024,
    "basin": "Bay of Bengal",
    "category": "Severe Cyclonic Storm",
    "max_wind_speed_kmh": 120,
    "max_wind_speed_kt": 65,
    "landfall_location": "Odisha Coast (between Dhamra and Habalikhati)",
    "landfall_date": "2024-10-25T01:30:00Z",
    "verified_source": "India Meteorological Department (IMD) Best Track",
    "record_type": "historical_observation",
    "track": [
      {"lat": 16.2, "lng": 89.8, "timestamp": "2024-10-22T06:00:00Z", "wind_kmh": 45, "stage": "Depression"},
      {"lat": 17.1, "lng": 89.0, "timestamp": "2024-10-23T06:00:00Z", "wind_kmh": 75, "stage": "Cyclonic Storm"},
      {"lat": 18.8, "lng": 88.0, "timestamp": "2024-10-24T06:00:00Z", "wind_kmh": 105, "stage": "Severe Cyclonic Storm"},
      {"lat": 20.8, "lng": 86.9, "timestamp": "2024-10-25T01:30:00Z", "wind_kmh": 115, "stage": "Landfall - Severe Cyclonic Storm"},
      {"lat": 21.4, "lng": 85.5, "timestamp": "2024-10-25T18:00:00Z", "wind_kmh": 55, "stage": "Deep Depression"}
    ]
  },
  {
    "id": "tc_michaung_2023",
    "name": "Cyclone Michaung",
    "year": 2023,
    "basin": "Bay of Bengal",
    "category": "Super Cyclonic / Severe Cyclonic Storm",
    "max_wind_speed_kmh": 110,
    "max_wind_speed_kt": 60,
    "landfall_location": "Andhra Pradesh Coast (near Bapatla)",
    "landfall_date": "2023-12-05T08:00:00Z",
    "verified_source": "India Meteorological Department (IMD) / RSMC New Delhi",
    "record_type": "historical_observation",
    "track": [
      {"lat": 9.5, "lng": 85.8, "timestamp": "2023-12-01T12:00:00Z", "wind_kmh": 45, "stage": "Depression"},
      {"lat": 11.8, "lng": 82.8, "timestamp": "2023-12-03T06:00:00Z", "wind_kmh": 75, "stage": "Cyclonic Storm"},
      {"lat": 14.2, "lng": 80.6, "timestamp": "2023-12-04T06:00:00Z", "wind_kmh": 100, "stage": "Severe Cyclonic Storm"},
      {"lat": 15.8, "lng": 80.3, "timestamp": "2023-12-05T08:00:00Z", "wind_kmh": 105, "stage": "Landfall (Bapatla)"},
      {"lat": 17.0, "lng": 80.8, "timestamp": "2023-12-06T00:00:00Z", "wind_kmh": 40, "stage": "Well Marked Low Pressure"}
    ]
  },
  {
    "id": "tc_biparjoy_2023",
    "name": "Cyclone Biparjoy",
    "year": 2023,
    "basin": "Arabian Sea",
    "category": "Extremely Severe Cyclonic Storm",
    "max_wind_speed_kmh": 165,
    "max_wind_speed_kt": 90,
    "landfall_location": "Gujarat Coast (near Jakhau Port)",
    "landfall_date": "2023-06-15T18:00:00Z",
    "verified_source": "IMD RSMC New Delhi Official Archive",
    "record_type": "historical_observation",
    "track": [
      {"lat": 12.0, "lng": 66.0, "timestamp": "2023-06-06T06:00:00Z", "wind_kmh": 65, "stage": "Cyclonic Storm"},
      {"lat": 14.8, "lng": 66.2, "timestamp": "2023-06-08T12:00:00Z", "wind_kmh": 130, "stage": "Very Severe Cyclonic Storm"},
      {"lat": 19.4, "lng": 67.8, "timestamp": "2023-06-11T18:00:00Z", "wind_kmh": 165, "stage": "Extremely Severe Cyclonic Storm"},
      {"lat": 23.2, "lng": 68.6, "timestamp": "2023-06-15T18:00:00Z", "wind_kmh": 125, "stage": "Landfall (Jakhau Port)"},
      {"lat": 24.8, "lng": 71.5, "timestamp": "2023-06-17T06:00:00Z", "wind_kmh": 45, "stage": "Depression over Rajasthan"}
    ]
  },
  {
    "id": "tc_fani_2019",
    "name": "Cyclone Fani",
    "year": 2019,
    "basin": "Bay of Bengal",
    "category": "Extremely Severe Cyclonic Storm",
    "max_wind_speed_kmh": 215,
    "max_wind_speed_kt": 115,
    "landfall_location": "Odisha Coast (near Puri)",
    "landfall_date": "2019-05-03T02:30:00Z",
    "verified_source": "IMD Best Track Records 2019",
    "record_type": "historical_observation",
    "track": [
      {"lat": 5.2, "lng": 88.5, "timestamp": "2019-04-26T06:00:00Z", "wind_kmh": 50, "stage": "Depression"},
      {"lat": 10.5, "lng": 86.8, "timestamp": "2019-04-29T12:00:00Z", "wind_kmh": 115, "stage": "Severe Cyclonic Storm"},
      {"lat": 14.1, "lng": 84.0, "timestamp": "2019-05-01T06:00:00Z", "wind_kmh": 195, "stage": "Extremely Severe Cyclonic Storm"},
      {"lat": 19.8, "lng": 85.8, "timestamp": "2019-05-03T02:30:00Z", "wind_kmh": 205, "stage": "Landfall (Puri)"},
      {"lat": 23.5, "lng": 89.2, "timestamp": "2019-05-04T06:00:00Z", "wind_kmh": 60, "stage": "Cyclonic Storm into Bangladesh"}
    ]
  }
]

@router.get("/cyclones/history")
async def get_historical_cyclones():
    """
    Returns verified historical tropical cyclones affecting Indian coastal areas.
    """
    return {
        "status": "success",
        "count": len(VERIFIED_HISTORICAL_CYCLONES),
        "source": "India Meteorological Department (IMD) / RSMC Best Track Archive",
        "records": VERIFIED_HISTORICAL_CYCLONES
    }

@router.get("/citizen/alerts")
@router.get("/lighthouse/status")
async def get_citizen_alerts():
    """
    Returns the real-time coastal alert & lighthouse siren status broadcast by Admin.
    """
    return ACTIVE_BROADCAST

@router.post("/citizen/broadcast")
async def publish_citizen_broadcast(payload: BroadcastPayload):
    """
    Called by Admin when clicking 'Broadcast to Citizens'.
    Publishes detected cyclone data, updates warning level and siren trigger.
    """
    global ACTIVE_BROADCAST

    # Auto-generate appropriate advisory messages based on level and intensity
    level = (payload.level or "RED").upper()
    classification = payload.classification or "SEVERE"
    wind_kmh = payload.wind_speed_kmh or (round(payload.wind_speed_kt * 1.852, 1) if payload.wind_speed_kt else 120.0)
    
    default_msg = payload.message or f"{classification} cyclonic circulation identified with peak sustained winds of {wind_kmh} km/h. Sea conditions exceptionally rough."
    
    if level == "RED":
        default_directive = payload.fishermen_directive or "RED ALERT: Complete ban on fishing operations. All fishing boats and small craft must remain in or return to harbor immediately."
        title = f"RED ALERT: {payload.cyclone_name} Approaching Coast"
    elif level == "ORANGE":
        default_directive = payload.fishermen_directive or "ORANGE WARNING: Squally winds expected. Fishermen in deep sea are strongly advised to return to coastal waters."
        title = f"ORANGE WARNING: {payload.cyclone_name} Coastal Alert"
    else:
        default_directive = payload.fishermen_directive or "CAUTION: Wind and wave activity increasing. Exercise caution near coastal waters."
        title = f"YELLOW ADVISORY: {payload.cyclone_name} Monitored"

    ACTIVE_BROADCAST = {
        "available": True,
        "active": True,
        "cyclone_name": payload.cyclone_name,
        "classification": classification,
        "wind_speed_kt": payload.wind_speed_kt,
        "wind_speed_kmh": wind_kmh,
        "confidence_percent": payload.confidence_percent,
        "level": level,
        "siren_active": payload.siren_active or False,
        "title": title,
        "message": default_msg,
        "fishermen_directive": default_directive,
        "area": payload.area or "Central West & Southwest Coastal Maritime Zone",
        "source": "CycloSafe Early Warning Command Center (Live Admin Broadcast)",
        "issued_at": datetime.utcnow().isoformat() + "Z",
        "coordinates": {"lat": payload.lat or 14.8, "lng": payload.lng or 73.5}
    }
    return {
        "success": True,
        "message": "Broadcast published to Citizen and Lighthouse portals successfully.",
        "broadcast": ACTIVE_BROADCAST
    }

@router.post("/citizen/broadcast/siren")
async def toggle_lighthouse_siren(payload: SirenTogglePayload):
    """
    Directly toggles the coastal lighthouse siren state (ON/OFF).
    """
    global ACTIVE_BROADCAST
    ACTIVE_BROADCAST["siren_active"] = payload.siren_active
    status_str = "ACTIVATED" if payload.siren_active else "SILENCED"
    return {
        "success": True,
        "siren_active": payload.siren_active,
        "message": f"Coastal Lighthouse Siren has been {status_str}."
    }

@router.post("/citizen/broadcast/clear")
async def clear_citizen_broadcast():
    """
    Admin clears the alert. Sets system back to Normal conditions.
    """
    global ACTIVE_BROADCAST
    ACTIVE_BROADCAST = {
        "available": True,
        "active": False,
        "cyclone_name": None,
        "classification": "NONE",
        "wind_speed_kt": None,
        "wind_speed_kmh": None,
        "confidence_percent": None,
        "level": "NORMAL",
        "siren_active": False,
        "title": "Normal Coastal Conditions",
        "message": "All previous cyclone advisories cleared. Monitored coastal waters report normal conditions.",
        "fishermen_directive": "Regular fishing operations permitted. Monitor standard harbor signals.",
        "area": "Coastal Maritime Zones",
        "source": "CycloSafe Early Warning Command Center",
        "issued_at": datetime.utcnow().isoformat() + "Z",
        "coordinates": {"lat": 14.8, "lng": 73.5}
    }
    return {
        "success": True,
        "message": "Broadcast cleared. Normal conditions restored.",
        "broadcast": ACTIVE_BROADCAST
    }


# ==============================================================================
# Dynamic User & Fisherman Management Registry
# ==============================================================================

class UserRegisterPayload(BaseModel):
    name: str
    phone: str
    user_type: str = "citizen"  # "fisherman" or "citizen"
    vessel_name: Optional[str] = None
    vessel_reg: Optional[str] = None
    vessel_type: Optional[str] = None
    port: Optional[str] = None
    district: Optional[str] = None
    ward: Optional[str] = None
    emergency_contact: Optional[str] = None
    alerts_enabled: Optional[bool] = True
    status: Optional[str] = None


# Dynamic User & Fisherman Management Registry (Starts empty - populated only by genuine user registrations)
REGISTERED_USERS: List[Dict[str, Any]] = []


@router.get("/citizen/users")
async def get_registered_users(user_type: Optional[str] = None):
    """
    Returns registered fishermen and coastal citizens for the Admin Panel.
    """
    if user_type:
        filtered = [u for u in REGISTERED_USERS if u.get("user_type") == user_type.lower()]
        return {"status": "success", "count": len(filtered), "users": filtered}
    return {
        "status": "success",
        "count": len(REGISTERED_USERS),
        "fishermen_count": len([u for u in REGISTERED_USERS if u.get("user_type") == "fisherman"]),
        "citizens_count": len([u for u in REGISTERED_USERS if u.get("user_type") == "citizen"]),
        "users": REGISTERED_USERS
    }


@router.post("/citizen/users/register")
async def register_user(payload: UserRegisterPayload):
    """
    Called when a user registers or logs in on the Citizen / User portal.
    Instantly registers them into the active community directory for the Admin panel.
    """
    global REGISTERED_USERS
    u_type = (payload.user_type or "citizen").lower()
    prefix = "USR-F" if u_type == "fisherman" else "USR-C"
    
    # Check if user with phone already exists
    existing = next((u for u in REGISTERED_USERS if u.get("phone") == payload.phone), None)
    if existing:
        existing.update({
            "name": payload.name,
            "user_type": u_type,
            "vessel_name": payload.vessel_name or existing.get("vessel_name"),
            "vessel_reg": payload.vessel_reg or existing.get("vessel_reg"),
            "vessel_type": payload.vessel_type or existing.get("vessel_type"),
            "port": payload.port or existing.get("port"),
            "district": payload.district or existing.get("district"),
            "ward": payload.ward or existing.get("ward"),
            "emergency_contact": payload.emergency_contact or existing.get("emergency_contact"),
            "status": payload.status or existing.get("status", "ACTIVE")
        })
        return {
            "status": "success",
            "message": f"Welcome back, {existing['name']}! Session active.",
            "user": existing
        }

    new_id = f"{prefix}-{len(REGISTERED_USERS) + 101}"
    default_status = "IN_HARBOR" if u_type == "fisherman" else "ACTIVE"

    new_user = {
        "id": new_id,
        "name": payload.name,
        "phone": payload.phone,
        "user_type": u_type,
        "vessel_name": payload.vessel_name,
        "vessel_reg": payload.vessel_reg,
        "vessel_type": payload.vessel_type,
        "port": payload.port,
        "district": payload.district,
        "ward": payload.ward,
        "emergency_contact": payload.emergency_contact,
        "alerts_enabled": payload.alerts_enabled if payload.alerts_enabled is not None else True,
        "status": payload.status or default_status,
        "registered_at": datetime.utcnow().isoformat() + "Z"
    }
    REGISTERED_USERS.insert(0, new_user)
    return {
        "status": "success",
        "message": f"{u_type.capitalize()} registered successfully.",
        "user": new_user
    }


@router.delete("/citizen/users/{user_id}")
async def delete_user(user_id: str):
    """
    Admin removes a registered user from the directory.
    """
    global REGISTERED_USERS
    before_len = len(REGISTERED_USERS)
    REGISTERED_USERS = [u for u in REGISTERED_USERS if u.get("id") != user_id]
    if len(REGISTERED_USERS) < before_len:
        return {"status": "success", "message": f"User {user_id} removed from system registry."}
    return {"status": "error", "message": f"User {user_id} not found."}


@router.patch("/citizen/users/{user_id}/status")
async def update_user_status(user_id: str, payload: Dict[str, Any]):
    """
    Admin updates a user's operational status (e.g., AT_SEA, IN_HARBOR, ACTIVE, EVACUATED).
    """
    global REGISTERED_USERS
    user = next((u for u in REGISTERED_USERS if u.get("id") == user_id), None)
    if not user:
        return {"status": "error", "message": f"User {user_id} not found."}
    
    if "status" in payload:
        user["status"] = payload["status"]
    if "alerts_enabled" in payload:
        user["alerts_enabled"] = payload["alerts_enabled"]
        
    return {"status": "success", "message": "User status updated.", "user": user}


@router.post("/citizen/users/clear")
async def clear_registered_users():
    """
    Clears all registered users from the directory.
    """
    global REGISTERED_USERS
    REGISTERED_USERS = []
    return {"status": "success", "message": "All registered users cleared."}


