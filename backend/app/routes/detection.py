import os
import sys
import shutil
import tempfile
import numpy as np
import tensorflow as tf
from fastapi import APIRouter, File, UploadFile, HTTPException

router = APIRouter()

# Add ml folder to sys.path to import preprocessing
sys.path.append(os.path.join(os.path.dirname(__file__), '../../ml'))
from preprocessing import load_and_preprocess_image

# Global variable for model to avoid loading it on every request
MODEL = None

def get_model():
    global MODEL
    if MODEL is None:
        model_path = os.path.join(os.path.dirname(__file__), '../../models/cyclone_detector.keras')
        if not os.path.exists(model_path):
            raise Exception("Model not trained or not found at " + model_path)
        MODEL = tf.keras.models.load_model(model_path)
    return MODEL

@router.post("/detect")
async def detect_cyclone(image: UploadFile = File(...)):
    # Validate file type
    if not image.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.tiff', '.tif')):
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload an image.")
        
    try:
        # Load model first to check if available
        model = get_model()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Model unavailable: {str(e)}")

    # Temporarily save image
    fd, temp_path = tempfile.mkstemp(suffix=os.path.splitext(image.filename)[1])
    try:
        with os.fdopen(fd, 'wb') as f:
            shutil.copyfileobj(image.file, f)
            
        # Preprocess
        img_data = load_and_preprocess_image(temp_path)
        if img_data is None:
            raise HTTPException(status_code=400, detail="Failed to read image data")
            
        # Inference
        img_batch = np.expand_dims(img_data, axis=0)
        prob = model.predict(img_batch)[0][0]
        
        # Determine class
        is_cyclone = bool(prob > 0.5)
        confidence = float(prob if is_cyclone else (1 - prob))
        
        prediction = "Cyclone" if is_cyclone else "No Cyclone"
        
        return {
            "success": True,
            "prediction": prediction,
            "is_cyclone": is_cyclone,
            "confidence": confidence,
            "confidence_percent": round(confidence * 100, 2),
            "model": "EfficientNetB0"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup
        if os.path.exists(temp_path):
            os.remove(temp_path)
