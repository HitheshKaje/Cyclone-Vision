import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import detection, intensity

app = FastAPI(title="CycloneVision API", description="AI-Driven Tropical Cyclone Detection API")

# Setup CORS to allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For dev, restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(detection.router, prefix="/api")
app.include_router(intensity.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to CycloneVision API"}

if __name__ == "__main__":
    import uvicorn
    # Make sure we run from the app directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
