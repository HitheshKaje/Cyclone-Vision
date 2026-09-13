import os
import sys
import shutil
import tempfile
import numpy as np
import tensorflow as tf
from fastapi import APIRouter, File, UploadFile, HTTPException

router = APIRouter()

# Add intensity ml folder to sys.path to import preprocessing_intensity
INTENSITY_ML_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../ml/intensity'))
if INTENSITY_ML_PATH not in sys.path:
    sys.path.append(INTENSITY_ML_PATH)

from preprocessing_intensity import preprocess_single_image_file

# Global variable for model to avoid loading it on every request
INTENSITY_MODEL = None

def get_intensity_model():
    """
    Load Objective 2 Cyclone Intensity Estimation model.
    Loads ONLY backend/models/cyclone_intensity.keras.
    """
    global INTENSITY_MODEL
    if INTENSITY_MODEL is None:
        model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../models/cyclone_intensity.keras'))
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Objective 2 model not found at: {model_path}")
        INTENSITY_MODEL = tf.keras.models.load_model(model_path)
    return INTENSITY_MODEL

@router.post("/intensity")
async def estimate_cyclone_intensity(image: UploadFile = File(...)):
    """
    Estimate the maximum sustained wind speed (Vmax in knots) of a tropical cyclone.
    Expected output: continuous regression prediction in knots.
    """
    # 1. Validate file format
    if not image.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.tiff', '.tif')):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload a valid satellite image (JPG, PNG, TIFF)."
        )
        
    # 2. Check model availability
    try:
        model = get_intensity_model()
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Intensity model unavailable: {str(e)}"
        )

    # 3. Temporarily save uploaded image to disk for preprocessing
    fd, temp_path = tempfile.mkstemp(suffix=os.path.splitext(image.filename)[1])
    try:
        with os.fdopen(fd, 'wb') as f:
            shutil.copyfileobj(image.file, f)
            
        # 4. Preprocess image into (224, 224, 3) float32 normalized representation
        img_data = preprocess_single_image_file(temp_path)
        if img_data is None:
            raise HTTPException(status_code=400, detail="Failed to preprocess image data")
            
        # 5. Run inference with Objective 2 regression model
        img_batch = np.expand_dims(img_data, axis=0)
        raw_pred = model.predict(img_batch)[0][0]
        
        # 6. Convert predicted Vmax into native Python float (real model output)
        predicted_wind_speed = float(raw_pred)
        
        return {
            "success": True,
            "predicted_wind_speed_kt": round(predicted_wind_speed, 1),
            "model": "EfficientNetB0-TCIR-Intensity"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Intensity estimation error: {str(e)}")
    finally:
        # Cleanup temporary file
        if os.path.exists(temp_path):
            os.remove(temp_path)
