import os
import sys
import time

# Ensure immediate console output flushing
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(line_buffering=True)
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(line_buffering=True)

from contextlib import asynccontextmanager
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Ensure app directory is on path
APP_DIR = os.path.dirname(os.path.abspath(__file__))
if APP_DIR not in sys.path:
    sys.path.insert(0, APP_DIR)

from services.ml_service import ml_service
from services.cloud_vision_service import cloud_vision_service
from services.db import init_db, get_db
from routes import detection, intensity, classification, live_map, citizen, track, auth, analysis


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan handler:
    Initializes MongoDB connection and seeds admin user.
    Note: EfficientNetB0 local models are retained on disk but not loaded into memory
    per user configuration to use Google Gemini Vision API exclusively.
    """
    init_db()
    yield
    # Cleanup logic if needed at shutdown


app = FastAPI(
    title="CycloneVision API",
    description="AI-Driven Tropical Cyclone Detection and Monitoring API",
    lifespan=lifespan
)

# Setup CORS to allow React frontend across localhost and 127.0.0.1
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8001",
        "http://127.0.0.1:8001",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include existing routes
app.include_router(auth.router, prefix="/api")
app.include_router(detection.router, prefix="/api")
app.include_router(intensity.router, prefix="/api")
app.include_router(classification.router, prefix="/api")
app.include_router(live_map.router, prefix="/api")
app.include_router(citizen.router, prefix="/api")
app.include_router(track.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")


@app.post("/api/analyze")
async def analyze_cyclone_image(image: UploadFile = File(...)):
    """
    Unified Single-Request Pipeline powered by Google Gemini 2.5 Flash Vision AI:
      Upload Image
      -> Gemini Multimodal Vision Inference
      -> Objective 1 Cyclone Detection
      -> Objective 2 Intensity Estimation
      -> Objective 3 WMO Classification & Dvorak T-number
    """
    if not image.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.tiff', '.tif')):
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload an image.")

    try:
        image_bytes = await image.read()
        mime_type = image.content_type or ("image/png" if image.filename.lower().endswith(".png") else "image/jpeg")

        try:
            return cloud_vision_service.full_pipeline_with_gemini(image_bytes, mime_type=mime_type)
        except Exception as g_err:
            raise HTTPException(status_code=502, detail=f"Google Gemini Vision API analysis error: {str(g_err)}")

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
def read_root():
    return {
        "message": "Welcome to CycloneVision API",
        "engine": "Google Gemini Vision Cloud AI (API Only)",
        "status": "Online"
    }

@app.get("/api/system/status")
def get_system_status():
    import json
    
    # Try to load real metrics from disk
    dataset_name = "NASA GIBS / TCIR / Google Gemini Vision"
    images_count = "Not available"
    version = "v2.0-API"
    last_updated = "Not available"
    
    metrics_path = os.path.join(APP_DIR, "..", "outputs", "metrics", "results.json")
    if os.path.exists(metrics_path):
        try:
            with open(metrics_path, "r") as f:
                data = json.load(f)
                images_count = data.get("total_test_images", "Not available")
                version = "v1.0"
                last_updated = time.ctime(os.path.getmtime(metrics_path))
        except:
            pass

    return {
        "status": {
            "api": "Online",
            "database": "Online (MongoDB: cyclosafe)" if get_db() is not None else "Offline (MongoDB unavailable)",
            "model": "Online (Google Gemini Vision API)"
        },
        "model_version": "Google Gemini Vision Cloud API (Active)",
        "dataset": {
            "name": dataset_name,
            "images": images_count,
            "classes": ["No_Cyclone", "Cyclone"],
            "version": version,
            "last_updated": last_updated
        }
    }


if __name__ == "__main__":
    import uvicorn
    os.chdir(APP_DIR)
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
