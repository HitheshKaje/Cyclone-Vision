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
from routes import detection, intensity, classification


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan handler:
    Loads all models (Detection, Intensity, Classification) once at application startup.
    Pre-warms the models so user requests never suffer from cold-start or disk-loading delays.
    Models stay resident in memory across requests.
    """
    ml_service.load_all_models()
    yield
    # Cleanup logic if needed at shutdown


app = FastAPI(
    title="CycloneVision API",
    description="AI-Driven Tropical Cyclone Detection and Monitoring API",
    lifespan=lifespan
)

# Setup CORS to allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include existing routes
app.include_router(detection.router, prefix="/api")
app.include_router(intensity.router, prefix="/api")
app.include_router(classification.router, prefix="/api")


@app.post("/api/analyze")
async def analyze_cyclone_image(image: UploadFile = File(...)):
    """
    Unified Single-Request Pipeline:
      Upload Image
      -> In-Memory Read (Zero Disk I/O)
      -> Objective 1 Cyclone Detection
      -> If NO CYCLONE: Return detection result (skips Intensity & Classification)
      -> If CYCLONE: Objective 2 Intensity Estimation -> Objective 3 Classification
      -> Final Result
    """
    if not image.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.tiff', '.tif')):
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload an image.")

    try:
        image_bytes = await image.read()
        return ml_service.run_full_pipeline(image_bytes)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
def read_root():
    return {"message": "Welcome to CycloneVision API", "models_loaded": ml_service.is_loaded}


if __name__ == "__main__":
    import uvicorn
    os.chdir(APP_DIR)
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
