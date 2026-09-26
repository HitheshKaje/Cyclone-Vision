import os
import sys
import time
from fastapi import APIRouter, File, UploadFile, HTTPException
from services.ml_service import ml_service

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
        # Read image directly in memory (zero disk I/O)
        t0 = time.perf_counter()
        image_bytes = await image.read()
        img_bgr = ml_service.decode_image_bytes(image_bytes)
        t_read = time.perf_counter() - t0

        # Run Objective 1 detection using cached in-memory model
        result, t_prep, t_infer = ml_service.run_detection(img_bgr)
        t_total = time.perf_counter() - t_start

        # Performance diagnostics
        print(f"[PERF] Image read: {t_read:.4f}s")
        print(f"[PERF] Image preprocessing: {t_prep:.4f}s")
        print(f"[PERF] Detection inference: {t_infer:.4f}s")
        print(f"[PERF] Total detection API: {t_total:.4f}s")

        return result

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
