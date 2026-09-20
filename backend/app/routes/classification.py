"""
CycloneVision - Objective 3: Classification Route
Provides endpoints for classifying cyclone intensity based on Vmax (knots).
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional
from services.classifier import get_cyclone_classifier

router = APIRouter()

class ClassificationRequest(BaseModel):
    wind_speed_kt: Optional[float] = Field(None, description="Maximum sustained wind speed in knots")
    is_cyclone: Optional[bool] = Field(True, description="Whether cyclone was detected in Objective 1")

class ClassificationResponse(BaseModel):
    wind_speed_kt: float
    wind_speed_kmh: float
    classification: str
    description: str

@router.post("/classify", response_model=ClassificationResponse)
def classify_intensity(request: ClassificationRequest):
    """
    Objective 3: Classify cyclone intensity into LOW, MEDIUM, or SEVERE.
    Requires that Objective 1 detected a cyclone.
    """
    # 1. Verify cyclone detection status
    if request.is_cyclone is False:
        raise HTTPException(
            status_code=400,
            detail="Classification is unavailable because no cyclone was detected."
        )

    # 2. Validate wind speed presence
    if request.wind_speed_kt is None:
        raise HTTPException(
            status_code=400,
            detail="Wind speed (wind_speed_kt) is required and cannot be null."
        )

    # 3. Perform rule-based classification
    classifier = get_cyclone_classifier()
    try:
        result = classifier.classify(request.wind_speed_kt)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classification error: {str(e)}")

@router.get("/classification/thresholds")
def get_thresholds():
    """
    Get the configured Vmax thresholds for LOW, MEDIUM, and SEVERE.
    """
    classifier = get_cyclone_classifier()
    return {
        "success": True,
        "thresholds": classifier.get_thresholds(),
        "rules": {
            "LOW": f"Vmax < {classifier.low_max} kt",
            "MEDIUM": f"{classifier.low_max} kt <= Vmax < {classifier.medium_max} kt",
            "SEVERE": f"Vmax >= {classifier.medium_max} kt"
        }
    }
