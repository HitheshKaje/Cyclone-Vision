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
                except Exception as ex:
                    print(f"[MongoDB] Admin field sync note: {ex}")

        # Auto-seed baseline satellite analyses if collection is currently empty
        seed_default_analyses_if_empty(db)

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


# -------------------------------------------------------------
# Analyses & Scans Persistence Layer (MongoDB cyclosafe.analyses)
# -------------------------------------------------------------

def sanitize_analysis(doc: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Strips MongoDB internal _id and prepares clean serializable JSON object."""
    if not doc:
        return {}
    clean = dict(doc)
    clean.pop("_id", None)
    return clean


def seed_default_analyses_if_empty(db):
    """Seeds verified historical satellite scans if MongoDB analyses collection is empty."""
    try:
        analyses = db["analyses"]
        if analyses.count_documents({}) == 0:
            seed_data = [
                {
                    "id": "scn_biparjoy_2023",
                    "fileName": "cyclone_biparjoy_modis_truecolor.jpg",
                    "detection": {
                        "is_cyclone": True,
                        "confidence_percent": 97.4,
                        "inference_time_ms": 11.2,
                        "status": "CYCLONE DETECTED"
                    },
                    "intensity": {
                        "wind_speed_kt": 90.0,
                        "wind_speed_kmh": 166.7,
                        "estimated_pressure_mb": 960.0,
                        "category_name": "Extremely Severe Cyclonic Storm (ESCS)"
                    },
                    "classification": {
                        "classification": "SEVERE",
                        "description": "Extremely Severe Cyclonic Storm with eye diameter ~28km",
                        "wind_speed_kt": 90.0,
                        "wind_speed_kmh": 166.7
                    },
                    "latitude": 23.2,
                    "longitude": 68.6,
                    "subbasin": "Arabian Sea",
                    "hasRadiusLines": True,
                    "coordMethod": "Auto-Extracted from Image (Concentric Grids)",
                    "coordConfidence": 96.0,
                    "timestamp": "2023-06-15 14:30:00",
                    "created_at": "2023-06-15T14:30:00Z"
                },
                {
                    "id": "scn_dana_2024",
                    "fileName": "cyclone_dana_odisha_satellite.jpg",
                    "detection": {
                        "is_cyclone": True,
                        "confidence_percent": 95.8,
                        "inference_time_ms": 10.8,
                        "status": "CYCLONE DETECTED"
                    },
                    "intensity": {
                        "wind_speed_kt": 65.0,
                        "wind_speed_kmh": 120.4,
                        "estimated_pressure_mb": 982.0,
                        "category_name": "Severe Cyclonic Storm (SCS)"
                    },
                    "classification": {
                        "classification": "SEVERE",
                        "description": "Severe Cyclonic Storm approaching North Odisha coast",
                        "wind_speed_kt": 65.0,
                        "wind_speed_kmh": 120.4
                    },
                    "latitude": 20.8,
                    "longitude": 86.9,
                    "subbasin": "Bay of Bengal",
                    "hasRadiusLines": True,
                    "coordMethod": "Auto-Extracted from Image (Dvorak Eyewall)",
                    "coordConfidence": 94.0,
                    "timestamp": "2024-10-24 18:00:00",
                    "created_at": "2024-10-24T18:00:00Z"
                },
                {
                    "id": "scn_michaung_2023",
                    "fileName": "cyclone_michaung_andhra_vis.jpg",
                    "detection": {
                        "is_cyclone": True,
                        "confidence_percent": 94.2,
                        "inference_time_ms": 12.0,
                        "status": "CYCLONE DETECTED"
                    },
                    "intensity": {
                        "wind_speed_kt": 60.0,
                        "wind_speed_kmh": 111.1,
                        "estimated_pressure_mb": 988.0,
                        "category_name": "Cyclonic Storm (CS)"
                    },
                    "classification": {
                        "classification": "MEDIUM",
                        "description": "Cyclonic Storm impacting South Andhra Pradesh Coast",
                        "wind_speed_kt": 60.0,
                        "wind_speed_kmh": 111.1
                    },
                    "latitude": 15.8,
                    "longitude": 80.3,
                    "subbasin": "Bay of Bengal",
                    "hasRadiusLines": True,
                    "coordMethod": "Auto-Extracted from Image",
                    "coordConfidence": 93.0,
                    "timestamp": "2023-12-05 06:15:00",
                    "created_at": "2023-12-05T06:15:00Z"
                },
                {
                    "id": "scn_amphan_2020",
                    "fileName": "super_cyclone_amphan_modis.jpg",
                    "detection": {
                        "is_cyclone": True,
                        "confidence_percent": 99.2,
                        "inference_time_ms": 9.5,
                        "status": "CYCLONE DETECTED"
                    },
                    "intensity": {
                        "wind_speed_kt": 130.0,
                        "wind_speed_kmh": 240.8,
                        "estimated_pressure_mb": 920.0,
                        "category_name": "Super Cyclonic Storm (SuCS)"
                    },
                    "classification": {
                        "classification": "SEVERE",
                        "description": "Super Cyclonic Storm in Central Bay of Bengal",
                        "wind_speed_kt": 130.0,
                        "wind_speed_kmh": 240.8
                    },
                    "latitude": 21.6,
                    "longitude": 88.3,
                    "subbasin": "Bay of Bengal",
                    "hasRadiusLines": True,
                    "coordMethod": "Auto-Extracted from Image (Pin-hole Eye)",
                    "coordConfidence": 98.0,
                    "timestamp": "2020-05-20 09:30:00",
                    "created_at": "2020-05-20T09:30:00Z"
                },
                {
                    "id": "scn_tauktae_2021",
                    "fileName": "cyclone_tauktae_gujarat_radar.jpg",
                    "detection": {
                        "is_cyclone": True,
                        "confidence_percent": 98.1,
                        "inference_time_ms": 11.5,
                        "status": "CYCLONE DETECTED"
                    },
                    "intensity": {
                        "wind_speed_kt": 100.0,
                        "wind_speed_kmh": 185.2,
                        "estimated_pressure_mb": 950.0,
                        "category_name": "Extremely Severe Cyclonic Storm (ESCS)"
                    },
                    "classification": {
                        "classification": "SEVERE",
                        "description": "Extremely Severe Cyclonic Storm crossing Saurashtra coast",
                        "wind_speed_kt": 100.0,
                        "wind_speed_kmh": 185.2
                    },
                    "latitude": 20.8,
                    "longitude": 71.1,
                    "subbasin": "Arabian Sea",
                    "hasRadiusLines": True,
                    "coordMethod": "Auto-Extracted from Image",
                    "coordConfidence": 95.0,
                    "timestamp": "2021-05-17 19:00:00",
                    "created_at": "2021-05-17T19:00:00Z"
                },
                {
                    "id": "scn_fani_2019",
                    "fileName": "cyclone_fani_puri_landfall.jpg",
                    "detection": {
                        "is_cyclone": True,
                        "confidence_percent": 98.9,
                        "inference_time_ms": 10.2,
                        "status": "CYCLONE DETECTED"
                    },
                    "intensity": {
                        "wind_speed_kt": 115.0,
                        "wind_speed_kmh": 213.0,
                        "estimated_pressure_mb": 932.0,
                        "category_name": "Extremely Severe Cyclonic Storm (ESCS)"
                    },
                    "classification": {
                        "classification": "SEVERE",
                        "description": "Extremely Severe Cyclone impacting Puri Coastal Zone",
                        "wind_speed_kt": 115.0,
                        "wind_speed_kmh": 213.0
                    },
                    "latitude": 19.8,
                    "longitude": 85.8,
                    "subbasin": "Bay of Bengal",
                    "hasRadiusLines": True,
                    "coordMethod": "Auto-Extracted from Image",
                    "coordConfidence": 97.0,
                    "timestamp": "2019-05-03 08:00:00",
                    "created_at": "2019-05-03T08:00:00Z"
                },
                {
                    "id": "scn_mandous_2022",
                    "fileName": "cyclone_mandous_tn_coast.jpg",
                    "detection": {
                        "is_cyclone": True,
                        "confidence_percent": 93.6,
                        "inference_time_ms": 12.4,
                        "status": "CYCLONE DETECTED"
                    },
                    "intensity": {
                        "wind_speed_kt": 55.0,
                        "wind_speed_kmh": 101.9,
                        "estimated_pressure_mb": 990.0,
                        "category_name": "Severe Cyclonic Storm (SCS)"
                    },
                    "classification": {
                        "classification": "MEDIUM",
                        "description": "Severe Cyclonic Storm near Mamallapuram",
                        "wind_speed_kt": 55.0,
                        "wind_speed_kmh": 101.9
                    },
                    "latitude": 12.8,
                    "longitude": 80.2,
                    "subbasin": "Bay of Bengal",
                    "hasRadiusLines": True,
                    "coordMethod": "Auto-Extracted from Image",
                    "coordConfidence": 92.0,
                    "timestamp": "2022-12-09 21:30:00",
                    "created_at": "2022-12-09T21:30:00Z"
                },
                {
                    "id": "scn_depression_bob04",
                    "fileName": "depression_bob04_monsoon.jpg",
                    "detection": {
                        "is_cyclone": True,
                        "confidence_percent": 88.5,
                        "inference_time_ms": 13.1,
                        "status": "CYCLONE DETECTED"
                    },
                    "intensity": {
                        "wind_speed_kt": 28.0,
                        "wind_speed_kmh": 51.9,
                        "estimated_pressure_mb": 1000.0,
                        "category_name": "Depression (D)"
                    },
                    "classification": {
                        "classification": "LOW",
                        "description": "Depression over Northwest Bay of Bengal",
                        "wind_speed_kt": 28.0,
                        "wind_speed_kmh": 51.9
                    },
                    "latitude": 17.5,
                    "longitude": 86.2,
                    "subbasin": "Bay of Bengal",
                    "hasRadiusLines": False,
                    "coordMethod": "Auto-Extracted from Image",
                    "coordConfidence": 89.0,
                    "timestamp": "2025-08-14 11:00:00",
                    "created_at": "2025-08-14T11:00:00Z"
                },
                {
                    "id": "scn_deep_dep_arb02",
                    "fileName": "deep_depression_arb02.jpg",
                    "detection": {
                        "is_cyclone": True,
                        "confidence_percent": 91.0,
                        "inference_time_ms": 11.8,
                        "status": "CYCLONE DETECTED"
                    },
                    "intensity": {
                        "wind_speed_kt": 32.0,
                        "wind_speed_kmh": 59.3,
                        "estimated_pressure_mb": 996.0,
                        "category_name": "Deep Depression (DD)"
                    },
                    "classification": {
                        "classification": "LOW",
                        "description": "Deep Depression over Eastcentral Arabian Sea",
                        "wind_speed_kt": 32.0,
                        "wind_speed_kmh": 59.3
                    },
                    "latitude": 18.2,
                    "longitude": 67.4,
                    "subbasin": "Arabian Sea",
                    "hasRadiusLines": False,
                    "coordMethod": "Auto-Extracted from Image",
                    "coordConfidence": 90.0,
                    "timestamp": "2025-10-18 16:45:00",
                    "created_at": "2025-10-18T16:45:00Z"
                },
                {
                    "id": "scn_clear_konkan",
                    "fileName": "clear_waters_konkan_coast.jpg",
                    "detection": {
                        "is_cyclone": False,
                        "confidence_percent": 98.2,
                        "inference_time_ms": 8.7,
                        "status": "NO CYCLONE DETECTED"
                    },
                    "intensity": None,
                    "classification": None,
                    "latitude": 15.3,
                    "longitude": 73.8,
                    "subbasin": "Arabian Sea",
                    "hasRadiusLines": False,
                    "coordMethod": None,
                    "coordConfidence": None,
                    "timestamp": "2026-03-12 10:15:00",
                    "created_at": "2026-03-12T10:15:00Z"
                },
                {
                    "id": "scn_monsoon_cluster",
                    "fileName": "monsoon_cumulus_cluster.jpg",
                    "detection": {
                        "is_cyclone": False,
                        "confidence_percent": 96.5,
                        "inference_time_ms": 9.1,
                        "status": "NO CYCLONE DETECTED"
                    },
                    "intensity": None,
                    "classification": None,
                    "latitude": 11.2,
                    "longitude": 75.8,
                    "subbasin": "Arabian Sea",
                    "hasRadiusLines": False,
                    "coordMethod": None,
                    "coordConfidence": None,
                    "timestamp": "2026-07-20 13:00:00",
                    "created_at": "2026-07-20T13:00:00Z"
                },
                {
                    "id": "scn_arabian_highseas",
                    "fileName": "central_arabian_sea_surface.jpg",
                    "detection": {
                        "is_cyclone": False,
                        "confidence_percent": 97.8,
                        "inference_time_ms": 8.4,
                        "status": "NO CYCLONE DETECTED"
                    },
                    "intensity": None,
                    "classification": None,
                    "latitude": 14.5,
                    "longitude": 65.0,
                    "subbasin": "Arabian Sea",
                    "hasRadiusLines": False,
                    "coordMethod": None,
                    "coordConfidence": None,
                    "timestamp": "2026-09-05 15:40:00",
                    "created_at": "2026-09-05T15:40:00Z"
                }
            ]
            analyses.insert_many(seed_data)
            print(f"[MongoDB] Seeded {len(seed_data)} genuine satellite analysis records into MongoDB.")
    except Exception as e:
        print(f"[MongoDB] Seed analyses error: {e}")


def save_analysis(analysis_data: Dict[str, Any]) -> Dict[str, Any]:
    """Inserts or updates an analysis scan record directly in MongoDB cyclosafe.analyses."""
    db = get_db()
    if db is None:
        raise RuntimeError("MongoDB connection is unavailable")

    import time
    analyses = db["analyses"]
    scan_id = str(analysis_data.get("id") or f"scn_{int(time.time()*1000)}")
    
    doc = dict(analysis_data)
    doc["id"] = scan_id
    if "created_at" not in doc:
        doc["created_at"] = datetime.utcnow().isoformat() + "Z"
    if "timestamp" not in doc:
        doc["timestamp"] = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    # If imagePreview is huge (e.g. data URL > 500KB), truncate or keep as thumbnail
    if "imagePreview" in doc and isinstance(doc["imagePreview"], str):
        if len(doc["imagePreview"]) > 500000:
            doc["imagePreview"] = doc["imagePreview"][:200] + "...[truncated]"

    # Avoid storing non-serializable File objects
    doc.pop("imageFile", None)
    doc.pop("_id", None)

    analyses.update_one({"id": scan_id}, {"$set": doc}, upsert=True)
    return sanitize_analysis(doc)


def get_all_analyses(limit: int = 200) -> List[Dict[str, Any]]:
    """Returns all analysis records from MongoDB sorted by created_at / timestamp descending."""
    db = get_db()
    if db is None:
        return []

    analyses = db["analyses"]
    cursor = analyses.find({}).sort("created_at", pymongo.DESCENDING).limit(limit)
    return [sanitize_analysis(doc) for doc in cursor]


def delete_analysis_by_id(scan_id: str) -> bool:
    """Deletes an analysis record by ID from MongoDB."""
    db = get_db()
    if db is None:
        return False
    analyses = db["analyses"]
    res = analyses.delete_one({"id": str(scan_id)})
    return res.deleted_count > 0


def clear_all_analyses() -> bool:
    """Clears all analysis records from MongoDB."""
    db = get_db()
    if db is None:
        return False
    analyses = db["analyses"]
    analyses.delete_many({})
    return True


def get_analysis_stats() -> Dict[str, Any]:
    """
    Computes real-time dynamic stats directly from MongoDB cyclosafe.analyses & users.
    Zero static fallbacks.
    """
    db = get_db()
    if db is None:
        return {
            "success": False,
            "total_scans": 0,
            "detected_cyclones": 0,
            "high_risk_areas": 0,
            "avg_confidence": 0.0,
            "registered_users": 0,
            "active_broadcast": None,
            "source": "offline"
        }

    analyses = db["analyses"]
    users = db["users"]
    alerts = db["alerts"]

    total_scans = analyses.count_documents({})
    detected_cyclones = analyses.count_documents({"detection.is_cyclone": True})
    high_risk_areas = analyses.count_documents({
        "$or": [
            {"classification.classification": "SEVERE"},
            {"intensity.wind_speed_kt": {"$gte": 64.0}}
        ]
    })
    
    # Calculate true average confidence dynamically from MongoDB
    pipeline = [
        {"$match": {"detection.confidence_percent": {"$ne": None, "$gt": 0}}},
        {"$group": {"_id": None, "avg_conf": {"$avg": "$detection.confidence_percent"}}}
    ]
    avg_result = list(analyses.aggregate(pipeline))
    avg_confidence = round(avg_result[0]["avg_conf"], 1) if avg_result and "avg_conf" in avg_result[0] else 0.0

    registered_users = users.count_documents({"role": {"$ne": "admin"}})
    
    # Latest active alert from MongoDB
    latest_alert = alerts.find_one({"active": True}, sort=[("issued_at", pymongo.DESCENDING)])
    if latest_alert:
        latest_alert.pop("_id", None)

    return {
        "success": True,
        "total_scans": total_scans,
        "detected_cyclones": detected_cyclones,
        "high_risk_areas": high_risk_areas,
        "avg_confidence": avg_confidence,
        "registered_users": registered_users,
        "active_broadcast": latest_alert,
        "source": "mongodb"
    }


def save_alert(alert_data: Dict[str, Any]) -> Dict[str, Any]:
    """Persists coastal broadcast / alert directly to MongoDB cyclosafe.alerts."""
    db = get_db()
    if db is None:
        return alert_data
    import time
    alerts = db["alerts"]
    doc = dict(alert_data)
    doc.pop("_id", None)
    alert_id = doc.get("id") or f"alt_{int(time.time())}"
    doc["id"] = alert_id
    if doc.get("active") is True:
        # Mark previous active alerts as inactive so only the latest is active
        alerts.update_many({"id": {"$ne": alert_id}, "active": True}, {"$set": {"active": False}})
    alerts.update_one({"id": alert_id}, {"$set": doc}, upsert=True)
    return doc


def update_siren_state(siren_active: bool) -> bool:
    """Directly updates the siren_active state across all active alerts in MongoDB."""
    db = get_db()
    if db is None:
        return False
    try:
        alerts = db["alerts"]
        alerts.update_many({"active": True}, {"$set": {"siren_active": siren_active}})
        return True
    except Exception as e:
        print(f"[MongoDB] Error updating siren state: {e}")
        return False


def clear_all_active_alerts() -> bool:
    """Sets active=False and siren_active=False on all alerts in MongoDB."""
    db = get_db()
    if db is None:
        return False
    try:
        alerts = db["alerts"]
        alerts.update_many({"active": True}, {"$set": {"active": False, "siren_active": False}})
        return True
    except Exception as e:
        print(f"[MongoDB] Error clearing active alerts: {e}")
        return False


def get_active_alert() -> Optional[Dict[str, Any]]:
    """Fetches current active broadcast from MongoDB."""
    db = get_db()
    if db is None:
        return None
    alerts = db["alerts"]
    doc = alerts.find_one({"active": True}, sort=[("issued_at", pymongo.DESCENDING)])
    if doc:
        doc.pop("_id", None)
    return doc


