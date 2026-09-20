"""
CycloneVision - Objective 3: Cyclone Classification Service
Rule-based classification module operating on top of Objective 2 intensity estimation.
Categorizes cyclone intensity (Vmax in knots) into LOW, MEDIUM, or SEVERE.
"""

import os
from typing import Dict, Any, Optional

# Configurable thresholds (knots). Default to 34.0 kt and 64.0 kt (Standard meteorological scale).
DEFAULT_LOW_MAX = float(os.getenv("CYCLONE_LOW_MAX", "34.0"))
DEFAULT_MEDIUM_MAX = float(os.getenv("CYCLONE_MEDIUM_MAX", "64.0"))

class CycloneClassifier:
    """
    Modular, deterministic rule-based classifier.
    
    Rules:
      LOW:    Vmax < LOW_MAX
      MEDIUM: LOW_MAX <= Vmax < MEDIUM_MAX
      SEVERE: Vmax >= MEDIUM_MAX
    """

    def __init__(self, low_max: float = DEFAULT_LOW_MAX, medium_max: float = DEFAULT_MEDIUM_MAX):
        if low_max >= medium_max:
            raise ValueError(f"LOW_MAX ({low_max}) must be strictly less than MEDIUM_MAX ({medium_max})")
        self.low_max = float(low_max)
        self.medium_max = float(medium_max)

    def get_thresholds(self) -> Dict[str, float]:
        return {
            "low_max": self.low_max,
            "medium_max": self.medium_max
        }

    def classify(self, wind_speed_kt: Optional[float]) -> Dict[str, Any]:
        """
        Classify maximum sustained wind speed (knots).
        
        Returns:
            Dict containing:
              - wind_speed_kt (float)
              - wind_speed_kmh (float)
              - classification (str: "LOW" | "MEDIUM" | "SEVERE")
              - description (str)
        """
        if wind_speed_kt is None:
            raise ValueError("Wind speed cannot be None or missing.")

        try:
            vmax = float(wind_speed_kt)
        except (ValueError, TypeError):
            raise ValueError(f"Invalid wind speed value: {wind_speed_kt}")

        if vmax < 0:
            raise ValueError(f"Wind speed cannot be negative: {vmax}")

        # Conversion: 1 knot = 1.852 km/h
        wind_speed_kmh = round(vmax * 1.852, 1)
        wind_speed_kt_rounded = round(vmax, 1)

        if vmax < self.low_max:
            classification = "LOW"
            description = "Low-intensity tropical disturbance / depression"
        elif vmax < self.medium_max:
            classification = "MEDIUM"
            description = "Moderate-intensity cyclonic storm"
        else:
            classification = "SEVERE"
            description = "High-intensity severe tropical cyclone"

        return {
            "wind_speed_kt": wind_speed_kt_rounded,
            "wind_speed_kmh": wind_speed_kmh,
            "classification": classification,
            "description": description
        }

# Singleton instance for consistent app-wide usage
_default_classifier = CycloneClassifier()

def get_cyclone_classifier() -> CycloneClassifier:
    return _default_classifier
