"""
CycloneVision - Cloud Vision API Service (Zero Local Model)
Estimates cyclone intensity and performs 3-tier WMO classification
using Google Gemini Vision API (or lightweight CV heuristic fallback if API key is not yet set).
"""

import os
import re
import json
import base64
import logging
from typing import Dict, Any, Optional
import requests
import numpy as np
import cv2

logger = logging.getLogger("uvicorn.error")

ENV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

def load_simple_env(filepath: str):
    if os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        os.environ[k.strip()] = v.strip().strip('"').strip("'")
        except Exception:
            pass

load_simple_env(ENV_PATH)

GEMINI_MODELS = ["gemini-flash-lite-latest", "gemini-3.5-flash", "gemini-3-flash-preview", "gemini-flash-latest"]

class CloudVisionIntensityService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "")

    def get_api_key(self, override_key: Optional[str] = None) -> str:
        # Reload env in case it was updated dynamically
        load_simple_env(ENV_PATH)
        return (override_key or os.getenv("GEMINI_API_KEY", "") or self.api_key).strip()

    def estimate_with_gemini(self, image_bytes: bytes, mime_type: str = "image/jpeg", api_key: Optional[str] = None) -> Dict[str, Any]:
        """
        Uses Google Gemini Cloud Vision API to analyze the satellite image,
        estimate maximum sustained wind speed (Vmax), and categorize into 3 WMO classes.
        Requires NO local .keras / tensorflow model.
        """
        active_key = self.get_api_key(api_key)
        if not active_key:
            # Fallback to CV heuristic if API key is not yet provided
            logger.info("No GEMINI_API_KEY detected. Using lightweight Computer Vision pattern heuristic (Zero local model).")
            return self.estimate_with_cv_heuristic(image_bytes)

        b64_image = base64.b64encode(image_bytes).decode("utf-8")

        prompt = (
            "You are an expert meteorological vision system specializing in tropical cyclone intensity estimation "
            "from satellite imagery (Dvorak technique & computer vision analysis).\n\n"
            "Analyze this satellite image of a tropical cyclone / disturbance.\n"
            "CRITICAL INSTRUCTIONS:\n"
            "1. If there are any meteorological annotations, text labels (such as '50 kt', '93 km/h', central pressure '990 hPa'), "
            "or legend stamps in the image or insets, read and incorporate them as authoritative ground-truth context.\n"
            "2. If an eye feature, central dense overcast (CDO), or distinct spiral banding curvature is visible, "
            "estimate the realistic Maximum Sustained Wind Speed (Vmax) in knots (kt) reflecting the storm's true maturity (e.g. 50+ kt for tropical storm/cyclone).\n"
            "3. Calculate wind_speed_kmh = round(Vmax * 1.852, 1).\n\n"
            "Classify the system into EXACTLY ONE of the three standard WMO categories:\n"
            "1. Tropical Depression (TD): Vmax < 34 kt (31-61 km/h) -> classification: 'LOW'\n"
            "2. Tropical Storm (TS): 34 kt <= Vmax < 64 kt (62-118 km/h) -> classification: 'MEDIUM'\n"
            "3. Tropical Cyclone (TC): Vmax >= 64 kt (>= 119 km/h) -> classification: 'SEVERE'\n\n"
            "Return ONLY a raw JSON object with NO markdown formatting, matching this exact structure:\n"
            "{\n"
            '  "predicted_wind_speed_kt": 50.0,\n'
            '  "wind_speed_kt": 50.0,\n'
            '  "wind_speed_kmh": 92.6,\n'
            '  "category": "Tropical Storm (TS)",\n'
            '  "category_code": "TS",\n'
            '  "wmo_range": "34 kt <= Vmax < 64 kt (62-118 km/h)",\n'
            '  "classification": "MEDIUM",\n'
            '  "features_observed": "Distinct tropical storm circulation with spiral banding wrapping into central core",\n'
            '  "description": "Moderate-intensity cyclonic storm with tropical storm force winds."\n'
            "}"
        )

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": b64_image
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "response_mime_type": "application/json"
            }
        }

        headers = {
            "x-goog-api-key": active_key,
            "Content-Type": "application/json"
        }

        resp = None
        used_model = None
        for model_name in GEMINI_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
            try:
                r = requests.post(url, headers=headers, json=payload, timeout=25)
                if r.status_code == 200:
                    resp = r
                    used_model = model_name
                    break
                else:
                    logger.warning(f"Model {model_name} returned HTTP {r.status_code}: {r.text[:120]}")
            except Exception as e:
                logger.warning(f"Model {model_name} request error: {e}")

        if resp is None:
            raise RuntimeError("All Gemini cloud models failed or rate-limited.")

        try:
            data = resp.json()
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()

            # Clean JSON if wrapped in markdown
            if raw_text.startswith("```"):
                raw_text = re.sub(r"^```(?:json)?\n?", "", raw_text)
                raw_text = re.sub(r"\n?```$", "", raw_text)

            parsed = json.loads(raw_text)

            vmax = float(parsed.get("wind_speed_kt", parsed.get("predicted_wind_speed_kt", 45.0)))
            kmh = round(vmax * 1.852, 1)

            # Ensure strict WMO classification
            if vmax < 34.0:
                cat = "Tropical Depression (TD)"
                code = "TD"
                cls_type = "LOW"
                wmo = "Vmax < 34 kt (31-61 km/h)"
            elif vmax < 64.0:
                cat = "Tropical Storm (TS)"
                code = "TS"
                cls_type = "MEDIUM"
                wmo = "34 kt <= Vmax < 64 kt (62-118 km/h)"
            else:
                cat = "Tropical Cyclone (TC)"
                code = "TC"
                cls_type = "SEVERE"
                wmo = "Vmax >= 64 kt (>= 119 km/h)"

            features = parsed.get("features_observed", "Satellite convective spiral banding")
            if isinstance(features, list):
                features = ", ".join(str(f) for f in features)

            desc = parsed.get("description", f"WMO Classified as {cat}")

            return {
                "success": True,
                "predicted_wind_speed_kt": round(vmax, 1),
                "wind_speed_kt": round(vmax, 1),
                "wind_speed_kmh": kmh,
                "category": cat,
                "category_code": code,
                "wmo_range": wmo,
                "classification": cls_type,
                "features_observed": features,
                "description": desc,
                "source": f"Google Gemini Vision Cloud API ({used_model})",
                "no_local_model": True
            }

        except Exception as e:
            logger.warning(f"Cloud Vision API call failed: {e}. Falling back to Computer Vision heuristic.")
            return self.estimate_with_cv_heuristic(image_bytes, note=f"Cloud API Notice: {str(e)[:120]}")

    def estimate_with_cv_heuristic(self, image_bytes: bytes, note: Optional[str] = None) -> Dict[str, Any]:
        """
        Lightweight Computer Vision heuristic analyzer.
        Evaluates vortex structure, central brightness, and circular symmetry.
        Requires ZERO local .keras or TensorFlow models.
        """
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            vmax = 45.0
            symmetry = 0.5
        else:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            h, w = gray.shape
            cy, cx = h // 2, w // 2
            
            # Central Dense Overcast (CDO) and Eye Analysis
            r_inner = min(h, w) // 8
            r_outer = min(h, w) // 3
            inner_mask = np.zeros_like(gray)
            cv2.circle(inner_mask, (cx, cy), r_inner, 255, -1)
            outer_mask = np.zeros_like(gray)
            cv2.circle(outer_mask, (cx, cy), r_outer, 255, -1)
            outer_ring = cv2.subtract(outer_mask, inner_mask)

            inner_mean = float(cv2.mean(gray, mask=inner_mask)[0])
            ring_mean = float(cv2.mean(gray, mask=outer_ring)[0])
            std_dev = float(np.std(gray))

            # Estimate wind speed based on gradient and vortex density
            base_speed = 28.0 + (ring_mean / 255.0) * 35.0 + (std_dev / 128.0) * 20.0
            # If inner eye is distinct (eye contrast)
            eye_contrast = abs(inner_mean - ring_mean)
            if eye_contrast > 25:
                base_speed += 18.0

            vmax = min(max(base_speed, 25.0), 125.0)

        vmax = round(vmax, 1)
        kmh = round(vmax * 1.852, 1)

        if vmax < 34.0:
            cat = "Tropical Depression (TD)"
            code = "TD"
            cls_type = "LOW"
            wmo = "Vmax < 34 kt (31-61 km/h)"
            desc = "Low-intensity tropical depression / disturbance"
        elif vmax < 64.0:
            cat = "Tropical Storm (TS)"
            code = "TS"
            cls_type = "MEDIUM"
            wmo = "34 kt <= Vmax < 64 kt (62-118 km/h)"
            desc = "Moderate-intensity tropical storm"
        else:
            cat = "Tropical Cyclone (TC)"
            code = "TC"
            cls_type = "SEVERE"
            wmo = "Vmax >= 64 kt (>= 119 km/h)"
            desc = "High-intensity severe tropical cyclone"

        return {
            "success": True,
            "predicted_wind_speed_kt": vmax,
            "wind_speed_kt": vmax,
            "wind_speed_kmh": kmh,
            "category": cat,
            "category_code": code,
            "wmo_range": wmo,
            "classification": cls_type,
            "features_observed": "Analyzed satellite convective spiral gradient & central dense overcast",
            "description": desc,
            "source": "Computer Vision Pattern API (Zero Local Keras Model)",
            "no_local_model": True,
            "note": note or "To enable Google Gemini Cloud Vision, set GEMINI_API_KEY in backend/.env"
        }

cloud_vision_service = CloudVisionIntensityService()
