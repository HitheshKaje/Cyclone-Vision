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
    Backwards compatibility helper: returns None. Local ML model execution disabled per configuration.
    """
    return None

@router.post("/intensity/cloud")
async def estimate_cyclone_intensity_cloud(
    image: UploadFile = File(...),
    api_key: Optional[str] = Query(None, description="Optional Google Gemini API Key"),
    x_gemini_api_key: Optional[str] = Header(None, alias="X-Gemini-API-Key")
):
    """
    API-Only Intensity Estimation & 3-Tier WMO Classification:
    Uses External Cloud Vision API (Google Gemini Vision) exclusively without local models.
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
        raise HTTPException(status_code=502, detail=f"Cloud API intensity estimation error: {str(e)}")

@router.post("/intensity")
async def estimate_cyclone_intensity(
    image: UploadFile = File(...),
    api_key: Optional[str] = Query(None, description="Optional Gemini API key")
):
    """
    Estimate maximum sustained wind speed (Vmax in knots) and classify intensity (LOW, MEDIUM, SEVERE).
    Engine: Google Gemini Vision AI API (Exclusively).
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

        import asyncio
        result = await asyncio.to_thread(
            cloud_vision_service.estimate_with_gemini,
            image_bytes=image_bytes,
            mime_type=mime_type,
            api_key=api_key
        )
        return result
    except Exception as g_err:
        logger.error(f"[Intensity API] Gemini engine error: {g_err}")
        raise HTTPException(
            status_code=502,
            detail=f"Google Gemini Vision API intensity estimation error: {str(g_err)}. Please verify your API key."
        )

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Intensity estimation error: {str(e)}")
