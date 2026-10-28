import os
import sys
import glob
import time
import base64
import requests

sys.path.insert(0, os.path.abspath("backend"))
from app.services.cloud_vision_service import cloud_vision_service, optimize_image_for_api

keys = cloud_vision_service.get_all_keys()
k = keys[0]

imgs = glob.glob("backend/**/*.jpg", recursive=True) + glob.glob("data/**/*.jpg", recursive=True) + glob.glob("data/**/*.png", recursive=True)
img_path = imgs[0] if imgs else None
print(f"Using image: {img_path}")

with open(img_path, "rb") as f:
    b = f.read()

opt_b, opt_m = optimize_image_for_api(b, max_dim=800)
b64 = base64.b64encode(opt_b).decode("utf-8")

url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key={k}"
payload = {
    "contents": [{
        "parts": [
            {"text": "Analyze this satellite image. Return JSON: {\"is_cyclone\": true, \"wind_speed_kt\": 55.0, \"category\": \"Tropical Storm\"}"},
            {"inline_data": {"mime_type": opt_m, "data": b64}}
        ]
    }],
    "generationConfig": {
        "response_mime_type": "application/json",
        "thinkingConfig": {"thinkingBudget": 0}
    }
}

t0 = time.time()
r = requests.post(url, json=payload, timeout=8)
elapsed = time.time() - t0
print(f"Status: {r.status_code} in {elapsed:.2f}s")
if r.status_code == 200:
    print("Response text:", r.json()["candidates"][0]["content"]["parts"][0]["text"])
else:
    print("Error:", r.text[:300])
