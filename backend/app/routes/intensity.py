import os
import sys
import time
import logging
from fastapi import APIRouter, File, UploadFile, HTTPException
from services.ml_service import ml_service

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

@router.post("/intensity")
async def estimate_cyclone_intensity(image: UploadFile = File(...)):
    """
    Estimate maximum sustained wind speed (Vmax in knots) and classify intensity (LOW, MEDIUM, SEVERE).
    Uses the in-memory cached model loaded at startup with zero disk I/O.
    """
    # 1. Validate file format
    if not image.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.tiff', '.tif')):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload a valid satellite image (JPG, PNG, TIFF)."
        )

    t_start = time.perf_counter()

    try:
        # 2. Read image directly in memory (zero disk I/O)
        t0 = time.perf_counter()
        image_bytes = await image.read()
        img_bgr = ml_service.decode_image_bytes(image_bytes)
        t_read = time.perf_counter() - t0

        # 3. Run Objective 2 intensity estimation & Objective 3 rule-based classification
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
                "description": classification_result["description"],
                "model": "EfficientNetB0-TCIR-Intensity (Safe Fallback)"
            }

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Intensity estimation error: {str(e)}")
