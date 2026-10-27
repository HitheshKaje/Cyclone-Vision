"""
CycloSafe - Dynamic Analysis & Scans API Routes
Direct MongoDB persistence layer for Satellite Scans, Model Inferences, and Command Center Stats.
Zero static data.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

from services.db import (
    save_analysis,
    get_all_analyses,
    delete_analysis_by_id,
    clear_all_analyses,
    get_analysis_stats,
    seed_default_analyses_if_empty,
    get_db
)

router = APIRouter()


class AnalysisRecordPayload(BaseModel):
    id: Optional[str] = None
    fileName: Optional[str] = "satellite_scan.jpg"
    imagePreview: Optional[str] = None
    detection: Optional[Dict[str, Any]] = None
    intensity: Optional[Dict[str, Any]] = None
    classification: Optional[Dict[str, Any]] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    subbasin: Optional[str] = None
    hasRadiusLines: Optional[bool] = False
    coordMethod: Optional[str] = None
    coordConfidence: Optional[float] = None
    timestamp: Optional[str] = None


@router.get("/analysis/stats")
async def get_live_analysis_stats():
    """
    Returns real-time dynamic statistics directly aggregated from MongoDB.
    Powers the 4 Command Center Stat Cards on HomePage:
    1. Detected Cyclones (This Season)
    2. High Risk Areas (Active)
    3. Total Scans (System Usage)
    4. Avg Confidence (Model Accuracy)
    """
    stats = get_analysis_stats()
    return stats


@router.get("/analysis/history")
async def get_analysis_history(limit: int = Query(200, ge=1, le=1000)):
    """
    Fetches all historical satellite analysis records directly from MongoDB.
    Sorted descending by creation timestamp.
    """
    records = get_all_analyses(limit=limit)
    return {
        "success": True,
        "count": len(records),
        "source": "mongodb",
        "records": records
    }


@router.post("/analysis")
async def create_analysis_record(payload: AnalysisRecordPayload):
    """
    Persists a completed satellite analysis inference directly to MongoDB cyclosafe.analyses.
    Instantly updates live stats, history, and command center graphs.
    """
    try:
        data = payload.dict()
        saved = save_analysis(data)
        return {
            "success": True,
            "message": "Analysis saved to MongoDB successfully",
            "record": saved
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save analysis to MongoDB: {str(e)}")


@router.delete("/analysis/{scan_id}")
async def delete_single_analysis(scan_id: str):
    """
    Deletes an analysis record directly from MongoDB by its ID.
    """
    deleted = delete_analysis_by_id(scan_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Analysis with ID {scan_id} not found or already deleted")
    return {
        "success": True,
        "message": f"Analysis {scan_id} deleted successfully from MongoDB"
    }


@router.delete("/analysis")
async def clear_all_history():
    """
    Clears all analysis history from MongoDB.
    """
    cleared = clear_all_analyses()
    return {
        "success": cleared,
        "message": "All analysis records cleared from MongoDB"
    }


@router.post("/analysis/reset-seed")
async def reset_seed_analyses():
    """
    Re-seeds baseline verified satellite observations into MongoDB.
    """
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="MongoDB is unavailable")
    clear_all_analyses()
    seed_default_analyses_if_empty(db)
    stats = get_analysis_stats()
    return {
        "success": True,
        "message": "MongoDB analyses re-seeded with verified historical observations",
        "stats": stats
    }
