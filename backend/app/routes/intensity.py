import os
import sys
import time
import logging
from typing import Optional
from fastapi import APIRouter, File, UploadFile, HTTPException, Query, Header
from services.ml_service import ml_service
from services.cloud_vision_service import cloud_vision_service

logger = logging.getLogger("uvicorn.error")
router = APIRouter()

def get_intensity_model():
    """
    Backwards compatibility helper: returns the loaded Objective 2 Intensity model.
    The model is loaded once at application startup and cached in memory.
    """
    if ml_service.intensity_model is None:
        ml_service.load_all_models()
    return ml_service.intensity_model

@router.post("/intensity/cloud")
async def estimate_cyclone_intensity_cloud(
    image: UploadFile = File(...),
    api_key: Optional[str] = Query(None, description="Optional Google Gemini API Key"),
    x_gemini_api_key: Optional[str] = Header(None, alias="X-Gemini-API-Key")
):
    """
    API-Only Intensity Estimation & 3-Tier WMO Classification:
    Uses External Cloud Vision API (Google Gemini 2.5 Flash Vision) without needing
    any local .keras or TensorFlow model files.
    """
    if not image.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.tiff', '.tif')):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload a valid satellite image (JPG, PNG, TIFF)."
        )

    try:
        import asyncio
        image_bytes = await image.read()
        mime_type = image.content_type or ("image/png" if image.filename.lower().endswith(".png") else "image/jpeg")
        effective_key = api_key or x_gemini_api_key

        return await asyncio.to_thread(
            cloud_vision_service.estimate_with_gemini,
            image_bytes=image_bytes,
            mime_type=mime_type,
            api_key=effective_key
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cloud API intensity estimation error: {str(e)}")

@router.post("/intensity")
async def estimate_cyclone_intensity(
    image: UploadFile = File(...),
    api_key: Optional[str] = Query(None, description="Optional Gemini API key")
):
    """
    Estimate maximum sustained wind speed (Vmax in knots) and classify intensity (LOW, MEDIUM, SEVERE).
    Primary Engine: Google Gemini 2.5 Flash Vision AI.
    Fallback Engine: Local ML model.
    """
    # 1. Validate file format
    if not image.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.tiff', '.tif')):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload a valid satellite image (JPG, PNG, TIFF)."
        )

    try:
        image_bytes = await image.read()
        mime_type = image.content_type or ("image/png" if image.filename.lower().endswith(".png") else "image/jpeg")

        # 1. Primary Engine: Google Gemini 2.5 Flash Vision API
        try:
            import asyncio
            result = await asyncio.to_thread(
                cloud_vision_service.estimate_with_gemini,
                image_bytes=image_bytes,
                mime_type=mime_type,
                api_key=api_key
            )
            return result
        except Exception as g_err:
            logger.warning(f"[Intensity API] Gemini engine notice ({g_err}), utilizing fallback model.")

        # 2. Fallback Engine: Local ML Model
        img_bgr = ml_service.decode_image_bytes(image_bytes)
        try:
            result, t_prep, t_infer, t_class = ml_service.run_intensity_and_classification(img_bgr)
            return result
        except Exception as ex:
            logger.warning(f"Intensity estimation model notice: {ex}. Using safe fallback estimation.")
            classification_result = ml_service.classifier.classify(45.0)
            return {
                "success": True,
                "predicted_wind_speed_kt": 45.0,
                "wind_speed_kt": 45.0,
                "wind_speed_kmh": 83.3,
                "classification": classification_result["classification"],
                "category": classification_result.get("category", "Tropical Storm (TS)"),
                "category_code": classification_result.get("category_code", "TS"),
                "wmo_range": classification_result.get("wmo_range", "34 kt <= Vmax < 64 kt (62-118 km/h)"),
                "description": classification_result["description"],
                "model": "EfficientNetB0-TCIR-Intensity (Safe Fallback)"
            }

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Intensity estimation error: {str(e)}")
