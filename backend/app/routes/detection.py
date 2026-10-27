import os
import sys
import time
import logging
from fastapi import APIRouter, File, UploadFile, HTTPException
from services.ml_service import ml_service
from services.cloud_vision_service import cloud_vision_service

logger = logging.getLogger("uvicorn.error")
router = APIRouter()

def get_model():
    """
    Backwards compatibility helper: returns the loaded Objective 1 Detection model.
    The model is loaded once at application startup and cached in memory.
    """
    if ml_service.detection_model is None:
        ml_service.load_all_models()
    return ml_service.detection_model

@router.post("/detect")
async def detect_cyclone(image: UploadFile = File(...)):
    # Validate file type
    if not image.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.tiff', '.tif')):
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload an image.")

    t_start = time.perf_counter()

    try:
        image_bytes = await image.read()
        mime_type = image.content_type or ("image/png" if image.filename.lower().endswith(".png") else "image/jpeg")

        # 1. Primary Engine: High-Accuracy Google Gemini Vision AI
        try:
            result = cloud_vision_service.detect_with_gemini(image_bytes, mime_type=mime_type)
            t_total = time.perf_counter() - t_start
            logger.info(f"[Detect API] Powered by {result.get('source')} in {t_total:.2f}s")
            return result
        except Exception as g_err:
            logger.warning(f"[Detect API] Gemini engine exception ({g_err}), utilizing fallback model.")

        # 2. Fallback Engine: Local ML Model
        img_bgr = ml_service.decode_image_bytes(image_bytes)
        result, t_prep, t_infer = ml_service.run_detection(img_bgr)
        return result

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
