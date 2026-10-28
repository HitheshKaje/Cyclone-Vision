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
    Backwards compatibility helper: returns None. Local ML model execution disabled per configuration.
    """
    return None

@router.post("/detect")
async def detect_cyclone(image: UploadFile = File(...)):
    # Validate file type
    if not image.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.tiff', '.tif')):
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload an image.")

    t_start = time.perf_counter()

    try:
        image_bytes = await image.read()
        mime_type = image.content_type or ("image/png" if image.filename.lower().endswith(".png") else "image/jpeg")

        # 0. Strict Domain Gate: Must be a genuine Earth meteorological satellite image
        img_bgr = ml_service.decode_image_bytes(image_bytes)
        is_valid_domain, domain_reason = ml_service.validate_satellite_domain(img_bgr)
        if not is_valid_domain:
            t_total = time.perf_counter() - t_start
            logger.info(f"[Detect API] Domain Gate Rejected: {domain_reason}")
            return {
                "success": True,
                "prediction": "Invalid Satellite Image",
                "status": "INVALID IMAGE (NOT A SATELLITE IMAGE)",
                "status_label": "Invalid Satellite Image",
                "is_cyclone": False,
                "is_valid_satellite": False,
                "confidence": 0.0,
                "confidence_percent": 0.0,
                "validation_message": domain_reason,
                "description": domain_reason,
                "source": "Satellite Domain Ingestion Gate",
                "inference_time_ms": round(t_total * 1000, 1)
            }

        # 1. Primary Engine: High-Accuracy Google Gemini Vision AI API (Exclusively)
        try:
            result = cloud_vision_service.detect_with_gemini(image_bytes, mime_type=mime_type)
            if result.get("is_valid_satellite") is False:
                return result
        except Exception as g_err:
            logger.error(f"[Detect API] Gemini engine error: {g_err}")
            raise HTTPException(
                status_code=502,
                detail=f"Google Gemini Vision API detection error: {str(g_err)}. Please verify your API key."
            )

        # 3. Ensure coordinates are attached if cyclone is detected
        if result.get("is_cyclone") and (result.get("latitude") is None or result.get("longitude") is None):
            try:
                from routes.track import extract_coordinates_from_image
                coords = extract_coordinates_from_image(img_bgr, filename=image.filename)
                if coords.get("detected"):
                    result["latitude"] = coords.get("latitude")
                    result["longitude"] = coords.get("longitude")
                    result["subbasin"] = coords.get("subbasin")
                    result["has_coordinates"] = True
            except Exception as coord_err:
                logger.warning(f"Coordinate extraction notice: {coord_err}")

        t_total = time.perf_counter() - t_start
        logger.info(f"[Detect API] Powered by {result.get('source', 'CycloneVision Model')} in {t_total:.2f}s")
        return result

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
