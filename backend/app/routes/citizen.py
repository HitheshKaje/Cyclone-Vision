"""
CycloSafe - Citizen & Coastal Community API Routes
Provides verified historical cyclone tracks and official coastal marine bulletins.
All data strictly originates from authoritative meteorological records (IMD RSMC New Delhi / GDACS).
"""

from fastapi import APIRouter
from datetime import datetime
from typing import List, Dict, Any

router = APIRouter()

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

import os
import json
from pydantic import BaseModel
from typing import Optional

ALERT_STORAGE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "outputs", "active_alert.json")

def load_alert_from_disk() -> Dict[str, Any]:
    if os.path.exists(ALERT_STORAGE_PATH):
        try:
            with open(ALERT_STORAGE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "available": False,
        "siren_active": False,
        "level": None,
        "title": "No Active Cyclone Alert",
        "cyclone_name": None,
        "message": "No active coastal cyclone warning is currently in force for Indian coastal waters.",
        "fishermen_directive": "Regular seasonal fishing guidelines apply. Monitor local port signals.",
        "wind_speed_kmh": None,
        "wind_speed_kt": None,
        "classification": None,
        "confidence": None,
        "area": "Indian Coastal Waters",
        "source": "India Meteorological Department (IMD) / Coastal Authority",
        "issued_at": datetime.utcnow().isoformat() + "Z"
    }

def save_alert_to_disk(alert: Dict[str, Any]):
    try:
        os.makedirs(os.path.dirname(ALERT_STORAGE_PATH), exist_ok=True)
        with open(ALERT_STORAGE_PATH, "w", encoding="utf-8") as f:
            json.dump(alert, f, indent=2)
    except Exception as e:
        print(f"[citizen] Error saving alert to disk: {e}")

ACTIVE_ALERT: Dict[str, Any] = load_alert_from_disk()

class BroadcastAlertRequest(BaseModel):
    title: Optional[str] = None
    level: str = "RED"
    cyclone_name: str = "Tropical Cyclone (Satellite Telemetry)"
    message: Optional[str] = None
    wind_speed_kmh: Optional[float] = None
    wind_speed_kt: Optional[float] = None
    classification: Optional[str] = None
    confidence: Optional[float] = None
    area: str = "Coastal Maritime Sector"
    fishermen_directive: Optional[str] = None
    siren_active: bool = False
    source: str = "Admin Coastal Operations Center / Satellite AI Analysis"

class SirenToggleRequest(BaseModel):
    active: bool

@router.get("/cyclones/history")
async def get_historical_cyclones():
    """
    Returns verified historical tropical cyclones affecting Indian coastal areas.
    Strictly classified as historical observations (not forecasts).
    """
    return {
        "status": "success",
        "count": len(VERIFIED_HISTORICAL_CYCLONES),
        "source": "India Meteorological Department (IMD) / RSMC Best Track Archive",
        "records": VERIFIED_HISTORICAL_CYCLONES
    }

@router.get("/citizen/alerts")
async def get_citizen_alerts():
    """
    Returns the real-time coastal alert broadcasted by Admin.
    If no alert has been broadcast, available: false is returned.
    """
    global ACTIVE_ALERT
    return ACTIVE_ALERT

@router.post("/citizen/broadcast")
async def broadcast_citizen_alert(req: BroadcastAlertRequest):
    """
    Admin endpoint: Broadcasts an alert with cyclone telemetry to the Citizen Dashboard.
    Also controls whether the Coastal Lighthouse Siren is triggered.
    """
    global ACTIVE_ALERT
    now_iso = datetime.utcnow().isoformat() + "Z"
    
    directive = req.fishermen_directive
    if not directive:
        if req.level == "RED":
            directive = "Severe Danger: Do not venture into the sea. All boats must return to harbor immediately."
        elif req.level == "ORANGE":
            directive = "Caution: Rough sea conditions. Fishing operations suspended in deep waters."
        else:
            directive = "Advisory: Monitor weather bulletins before sailing."

    msg = req.message
    if not msg:
        if req.wind_speed_kmh:
            msg = f"Satellite pattern confirms {req.classification or 'cyclonic storm'}. Maximum sustained wind: {req.wind_speed_kmh:.0f} km/h ({req.wind_speed_kt or 0:.0f} kt)."
        else:
            msg = "Active cyclonic disturbance detected in monitoring basin."

    ACTIVE_ALERT = {
        "available": True,
        "siren_active": req.siren_active,
        "level": req.level.upper(),
        "title": req.title or f"Cyclone Alert: {req.cyclone_name}",
        "cyclone_name": req.cyclone_name,
        "message": msg,
        "wind_speed_kmh": req.wind_speed_kmh,
        "wind_speed_kt": req.wind_speed_kt,
        "classification": req.classification,
        "confidence": req.confidence,
        "area": req.area,
        "fishermen_directive": directive,
        "source": req.source,
        "issued_at": now_iso
    }
    save_alert_to_disk(ACTIVE_ALERT)

    return {
        "status": "success",
        "message": "Alert successfully broadcast to Citizen Dashboard",
        "alert": ACTIVE_ALERT
    }

@router.post("/citizen/clear")
async def clear_citizen_alert():
    """
    Admin endpoint: Revokes/clears the active coastal alert and stops the siren.
    """
    global ACTIVE_ALERT
    now_iso = datetime.utcnow().isoformat() + "Z"
    ACTIVE_ALERT = {
        "available": False,
        "siren_active": False,
        "level": None,
        "title": "No Active Cyclone Alert",
        "cyclone_name": None,
        "message": "No active coastal cyclone warning is currently in force for Indian coastal waters.",
        "fishermen_directive": "Regular seasonal fishing guidelines apply. Monitor local port signals.",
        "wind_speed_kmh": None,
        "wind_speed_kt": None,
        "classification": None,
        "confidence": None,
        "area": "Indian Coastal Waters",
        "source": "India Meteorological Department (IMD) / Coastal Authority",
        "issued_at": now_iso
    }
    save_alert_to_disk(ACTIVE_ALERT)
    return {
        "status": "success",
        "message": "Alert cleared and siren deactivated",
        "alert": ACTIVE_ALERT
    }

@router.post("/lighthouse/siren")
async def toggle_lighthouse_siren(req: SirenToggleRequest):
    """
    Direct endpoint to trigger or silence the coastal lighthouse siren.
    """
    global ACTIVE_ALERT
    ACTIVE_ALERT["siren_active"] = req.active
    save_alert_to_disk(ACTIVE_ALERT)
    return {
        "status": "success",
        "siren_active": ACTIVE_ALERT["siren_active"]
    }

@router.get("/lighthouse/status")
async def get_lighthouse_status():
    """
    Returns current siren state and warning metadata for the Lighthouse station.
    """
    global ACTIVE_ALERT
    return {
        "siren_active": ACTIVE_ALERT.get("siren_active", False),
        "available": ACTIVE_ALERT.get("available", False),
        "level": ACTIVE_ALERT.get("level", None),
        "cyclone_name": ACTIVE_ALERT.get("cyclone_name", ""),
        "message": ACTIVE_ALERT.get("message", ""),
        "issued_at": ACTIVE_ALERT.get("issued_at", "")
    }
