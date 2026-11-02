import sys
sys.path.insert(0, "backend")
from app.services.cloud_vision_service import cloud_vision_service

with open(r"test_user_cyclone.jpg", "rb") as f:
    b = f.read()

res = cloud_vision_service.full_pipeline_with_gemini(b, "image/jpeg")
print("RESULT:")
import pprint
pprint.pprint(res)
