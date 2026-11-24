"""
Settings Routes - AI Models & Early Warning System Configuration
Provides persistent configuration endpoints for AI Vision Engines, Model Parameters,
Confidence Thresholds, and API Key Management backed by MongoDB.
"""

import os
import re
import time
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
import requests
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from services.db import get_db

logger = logging.getLogger("uvicorn.error")
router = APIRouter(prefix="/settings", tags=["Settings"])

ENV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

DEFAULT_AI_SETTINGS = {
    "category": "ai_models",
    "primary_engine": "gemini_vision",
    "gemini_model": "gemini-flash-lite-latest",
    "detection_confidence_threshold": 50,
    "domain_gate_mode": "strict",
    "gale_warning_threshold_kts": 64,
    "extreme_cyclone_threshold_kts": 90,
    "super_cyclone_threshold_kts": 120,
    "auto_siren_trigger": True,
    "track_prediction_model": "bilstm_spire_ensemble",
    "multimodal_temperature": 0.2,
    "max_image_dimension": 800,
    "active_models": [
        {
            "id": "det_obj1",
            "name": "Objective 1: Cyclone Vision Detector",
            "type": "Detection",
            "architecture": "EfficientNetB0 + Multimodal Vision Embeddings",
            "weights": "best_cyclone_detector_finalModel2.keras",
            "status": "Active / Operational",
            "accuracy": "99.4%",
            "latency": "< 1.5s"
        },
        {
            "id": "int_obj2",
            "name": "Objective 2: TCIR Intensity Regression",
            "type": "Intensity (Wind Speed)",
            "architecture": "EfficientNetB0 Regression + Dvorak Telemetry",
            "weights": "best_cyclone_intensity_v2.keras",
            "status": "Active / Operational",
            "rmse": "8.4 kts",
            "latency": "< 2.0s"
        },
        {
            "id": "trk_obj3",
            "name": "Objective 3: 5-Day BiLSTM Track Trajectory",
            "type": "Track Trajectory",
            "architecture": "2-Layer Bidirectional LSTM (128/64 units)",
            "weights": "cyclone_track_lstm.keras",
            "status": "Active / Operational",
            "lead_time": "120 Hours",
            "mae": "18.2 km"
        },
        {
            "id": "spr_obj4",
            "name": "Objective 4: Spire Meteorological Track Stream",
            "type": "Agency Forecast",
            "architecture": "Spire / JTWC / IMD Multi-Agency Steering",
            "status": "Active / Synced",
            "basins": "NI, BB, AS"
        }
    ]
}


def mask_key(key: Optional[str]) -> str:
    """Masks API keys for safe transmission to the frontend UI."""
    if not key or len(key.strip()) < 8:
        return ""
    clean = key.strip()
    return f"{clean[:6]}...{clean[-4:]}"


def update_env_variable(key_name: str, key_val: str) -> None:
    """Safely updates or appends an environment variable in backend/.env file."""
    if not os.path.exists(ENV_PATH):
        try:
            with open(ENV_PATH, "w", encoding="utf-8") as f:
                f.write(f"{key_name}={key_val}\n")
            return
        except Exception as e:
            logger.warning(f"Failed to create .env: {e}")
            return

    try:
        lines = []
        key_found = False
        with open(ENV_PATH, "r", encoding="utf-8") as f:
            for line in f:
                stripped = line.strip()
                if stripped.startswith(f"{key_name}=") or stripped.startswith(f"{key_name} ="):
                    lines.append(f"{key_name}={key_val}\n")
                    key_found = True
                else:
                    lines.append(line)
        if not key_found:
            lines.append(f"{key_name}={key_val}\n")

        with open(ENV_PATH, "w", encoding="utf-8") as f:
            f.writelines(lines)
    except Exception as e:
        logger.warning(f"Failed to update .env variable {key_name}: {e}")


def sanitize_settings(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Prepares settings document for frontend presentation with masked sensitive keys."""
    res = dict(doc)
    res.pop("_id", None)
    
    # Read live environment keys
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    spire_key = os.getenv("SPIRE_API_KEY", "")

    res["gemini_api_key_masked"] = mask_key(gemini_key)
    res["has_gemini_key"] = bool(gemini_key and len(gemini_key) > 10)
    res["spire_api_key_masked"] = mask_key(spire_key)
    res["has_spire_key"] = bool(spire_key and len(spire_key) > 8)

    return res


class AIModelSettingsUpdate(BaseModel):
    primary_engine: Optional[str] = Field(None, description="'gemini_vision', 'hybrid', or 'offline_physics'")
    gemini_model: Optional[str] = Field(None, description="Active Gemini model variant")
    gemini_api_key: Optional[str] = Field(None, description="Optional new Gemini API Key to persist")
    spire_api_key: Optional[str] = Field(None, description="Optional new Spire Weather API Key")
    detection_confidence_threshold: Optional[int] = Field(None, ge=10, le=95, description="Detection threshold (10-95%)")
    domain_gate_mode: Optional[str] = Field(None, description="'strict', 'balanced', or 'permissive'")
    gale_warning_threshold_kts: Optional[int] = Field(None, ge=30, le=120)
    extreme_cyclone_threshold_kts: Optional[int] = Field(None, ge=60, le=150)
    super_cyclone_threshold_kts: Optional[int] = Field(None, ge=90, le=180)
    auto_siren_trigger: Optional[bool] = None
    track_prediction_model: Optional[str] = None
    multimodal_temperature: Optional[float] = Field(None, ge=0.0, le=1.0)


class TestKeyRequest(BaseModel):
    api_key: Optional[str] = None
    model: Optional[str] = "gemini-flash-lite-latest"


@router.get("/ai-models")
async def get_ai_model_settings():
    """
    Fetches the active AI & Model configurations from MongoDB.
    Initializes default configuration if not previously created.
    """
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    settings_col = db["settings"]
    current = settings_col.find_one({"category": "ai_models"})
    
    if not current:
        initial = dict(DEFAULT_AI_SETTINGS)
        initial["created_at"] = datetime.utcnow().isoformat() + "Z"
        initial["updated_at"] = datetime.utcnow().isoformat() + "Z"
        try:
            settings_col.insert_one(initial)
            current = settings_col.find_one({"category": "ai_models"})
        except Exception as e:
            logger.error(f"Error seeding default AI settings: {e}")
            current = initial

    return {
        "status": "success",
        "settings": sanitize_settings(current)
    }


@router.put("/ai-models")
async def update_ai_model_settings(payload: AIModelSettingsUpdate):
    """
    Updates AI Model parameters, thresholds, and API keys dynamically.
    Persists configuration in MongoDB and environment files.
    """
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    settings_col = db["settings"]
    current = settings_col.find_one({"category": "ai_models"}) or dict(DEFAULT_AI_SETTINGS)

    updates = {}
    if payload.primary_engine is not None:
        updates["primary_engine"] = payload.primary_engine
    if payload.gemini_model is not None:
        updates["gemini_model"] = payload.gemini_model
    if payload.detection_confidence_threshold is not None:
        updates["detection_confidence_threshold"] = payload.detection_confidence_threshold
        # Update in-memory ML service detection threshold
        try:
            from services.ml_service import ml_service
            from services.cloud_vision_service import cloud_vision_service
            ml_service.detection_threshold = float(payload.detection_confidence_threshold) / 100.0
            cloud_vision_service.detection_confidence_threshold = float(payload.detection_confidence_threshold)
            if payload.gemini_model:
                cloud_vision_service.preferred_model = payload.gemini_model
        except Exception:
            pass
    if payload.domain_gate_mode is not None:
        updates["domain_gate_mode"] = payload.domain_gate_mode
    if payload.gale_warning_threshold_kts is not None:
        updates["gale_warning_threshold_kts"] = payload.gale_warning_threshold_kts
    if payload.extreme_cyclone_threshold_kts is not None:
        updates["extreme_cyclone_threshold_kts"] = payload.extreme_cyclone_threshold_kts
    if payload.super_cyclone_threshold_kts is not None:
        updates["super_cyclone_threshold_kts"] = payload.super_cyclone_threshold_kts
    if payload.auto_siren_trigger is not None:
        updates["auto_siren_trigger"] = payload.auto_siren_trigger
    if payload.track_prediction_model is not None:
        updates["track_prediction_model"] = payload.track_prediction_model
    if payload.multimodal_temperature is not None:
        updates["multimodal_temperature"] = payload.multimodal_temperature

    # Process Gemini API Key update if a new real key was provided (not masked)
    if payload.gemini_api_key and "..." not in payload.gemini_api_key:
        clean_key = payload.gemini_api_key.strip()
        if len(clean_key) >= 20:
            os.environ["GEMINI_API_KEY"] = clean_key
            update_env_variable("GEMINI_API_KEY", clean_key)
            logger.info("Updated GEMINI_API_KEY from Settings panel.")

    # Process Spire API Key update if provided
    if payload.spire_api_key and "..." not in payload.spire_api_key:
        clean_spire = payload.spire_api_key.strip()
        if len(clean_spire) >= 10:
            os.environ["SPIRE_API_KEY"] = clean_spire
            update_env_variable("SPIRE_API_KEY", clean_spire)
            logger.info("Updated SPIRE_API_KEY from Settings panel.")

    updates["updated_at"] = datetime.utcnow().isoformat() + "Z"

    settings_col.update_one(
        {"category": "ai_models"},
        {"$set": updates},
        upsert=True
    )

    updated_doc = settings_col.find_one({"category": "ai_models"})
    return {
        "status": "success",
        "message": "AI and model configurations successfully saved to MongoDB.",
        "settings": sanitize_settings(updated_doc)
    }


@router.post("/ai-models/test-gemini")
async def test_gemini_connection(payload: TestKeyRequest):
    """
    Directly tests the Google Gemini Vision API connectivity and measures response latency.
    """
    key_to_test = payload.api_key.strip() if payload.api_key and "..." not in payload.api_key else os.getenv("GEMINI_API_KEY", "")
    if not key_to_test:
        raise HTTPException(status_code=400, detail="No Gemini API Key provided or found in environment.")

    model_name = payload.model or "gemini-flash-lite-latest"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"

    headers = {
        "x-goog-api-key": key_to_test,
        "Content-Type": "application/json"
    }

    test_payload = {
        "contents": [{"parts": [{"text": "Hello, respond with OK."}]}],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 10}
    }

    t0 = time.perf_counter()
    try:
        import asyncio
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: requests.post(url, headers=headers, json=test_payload, timeout=8.0)
        )
        latency_ms = round((time.perf_counter() - t0) * 1000, 1)

        if response.status_code == 200:
            return {
                "success": True,
                "message": f"Gemini Vision API verified! Response received in {latency_ms}ms.",
                "model": model_name,
                "latency_ms": latency_ms
            }
        else:
            error_data = {}
            try:
                error_data = response.json()
            except Exception:
                pass
            msg = error_data.get("error", {}).get("message", f"HTTP {response.status_code}")
            return {
                "success": False,
                "message": f"API Error ({response.status_code}): {msg}",
                "latency_ms": latency_ms
            }
    except requests.exceptions.Timeout:
        return {
            "success": False,
            "message": "Connection timed out (>8s) reaching Google Gemini API.",
            "latency_ms": 8000
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Network exception: {str(e)}",
            "latency_ms": 0
        }


@router.post("/ai-models/reset")
async def reset_ai_model_settings():
    """
    Resets AI & Model settings to optimal default parameters in MongoDB.
    """
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    settings_col = db["settings"]
    reset_doc = dict(DEFAULT_AI_SETTINGS)
    reset_doc["updated_at"] = datetime.utcnow().isoformat() + "Z"

    settings_col.update_one(
        {"category": "ai_models"},
        {"$set": reset_doc},
        upsert=True
    )

    updated_doc = settings_col.find_one({"category": "ai_models"})
    return {
        "status": "success",
        "message": "AI and model configurations reset to factory defaults.",
        "settings": sanitize_settings(updated_doc)
    }


DEFAULT_MAP_SETTINGS = {
    "category": "map_settings",
    "default_view_mode": "tactical",
    "default_layer": "wind",
    "default_basemap": "satellite_base",
    "show_forecast_track": True,
    "center_lat": 15.0,
    "center_lon": 82.0,
    "default_zoom": 5,
    "wind_particles": True
}

DEFAULT_NOTIFICATION_SETTINGS = {
    "category": "notification_settings",
    "sound_alerts": True,
    "auto_siren_trigger": True,
    "sms_broadcast": True,
    "email_alerts": True,
    "coastal_bulletins": True,
    "sound_volume": 80,
    "browser_push": False
}


class MapSettingsUpdate(BaseModel):
    default_view_mode: Optional[str] = Field(None, description="'tactical' or 'windy_engine'")
    default_layer: Optional[str] = Field(None, description="'wind', 'precipitation', 'temperature', 'humidity', 'pressure', 'satellite', 'radar'")
    default_basemap: Optional[str] = Field(None, description="'satellite_base', 'street', 'ocean', 'terrain'")
    show_forecast_track: Optional[bool] = None
    center_lat: Optional[float] = None
    center_lon: Optional[float] = None
    default_zoom: Optional[int] = None
    wind_particles: Optional[bool] = None


class NotificationSettingsUpdate(BaseModel):
    sound_alerts: Optional[bool] = None
    auto_siren_trigger: Optional[bool] = None
    sms_broadcast: Optional[bool] = None
    email_alerts: Optional[bool] = None
    coastal_bulletins: Optional[bool] = None
    sound_volume: Optional[int] = Field(None, ge=0, le=100)
    browser_push: Optional[bool] = None


@router.get("/map")
async def get_map_settings():
    """Fetches active map settings from MongoDB."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    col = db["settings"]
    current = col.find_one({"category": "map_settings"})
    if not current:
        initial = dict(DEFAULT_MAP_SETTINGS)
        initial["created_at"] = datetime.utcnow().isoformat() + "Z"
        initial["updated_at"] = datetime.utcnow().isoformat() + "Z"
        try:
            col.insert_one(initial)
            current = col.find_one({"category": "map_settings"})
        except Exception:
            current = initial

    if current and "_id" in current:
        current.pop("_id", None)
    return {"status": "success", "settings": current}


@router.put("/map")
async def update_map_settings(payload: MapSettingsUpdate):
    """Updates map settings dynamically in MongoDB."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    col = db["settings"]
    updates = {k: v for k, v in payload.dict(exclude_unset=True).items() if v is not None}
    updates["updated_at"] = datetime.utcnow().isoformat() + "Z"

    col.update_one({"category": "map_settings"}, {"$set": updates}, upsert=True)
    updated = col.find_one({"category": "map_settings"})
    if updated and "_id" in updated:
        updated.pop("_id", None)
    return {"status": "success", "message": "Map settings updated successfully.", "settings": updated}


@router.get("/notifications")
async def get_notification_settings():
    """Fetches active notification settings from MongoDB."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    col = db["settings"]
    current = col.find_one({"category": "notification_settings"})
    if not current:
        initial = dict(DEFAULT_NOTIFICATION_SETTINGS)
        initial["created_at"] = datetime.utcnow().isoformat() + "Z"
        initial["updated_at"] = datetime.utcnow().isoformat() + "Z"
        try:
            col.insert_one(initial)
            current = col.find_one({"category": "notification_settings"})
        except Exception:
            current = initial

    if current and "_id" in current:
        current.pop("_id", None)
    return {"status": "success", "settings": current}


@router.put("/notifications")
async def update_notification_settings(payload: NotificationSettingsUpdate):
    """Updates notification settings dynamically in MongoDB."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    col = db["settings"]
    updates = {k: v for k, v in payload.dict(exclude_unset=True).items() if v is not None}
    updates["updated_at"] = datetime.utcnow().isoformat() + "Z"

    col.update_one({"category": "notification_settings"}, {"$set": updates}, upsert=True)
    updated = col.find_one({"category": "notification_settings"})
    if updated and "_id" in updated:
        updated.pop("_id", None)
    return {"status": "success", "message": "Notification preferences updated successfully.", "settings": updated}
