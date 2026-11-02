import sys
sys.path.insert(0, "backend")
import cv2
from app.services.ml_service import ml_service

img = cv2.imread(r"backend/user_cyclone_crop.jpg")
if img is None:
    print("user_cyclone_crop.jpg not found, loading crop from media")
    import scratch_crop
    img = cv2.imread(r"test_user_cyclone.jpg")

print("Image loaded:", img.shape)
valid, reason = ml_service.validate_satellite_domain(img)
print("ml_service.validate_satellite_domain result:")
print("  is_valid:", valid)
print("  reason:", reason)
