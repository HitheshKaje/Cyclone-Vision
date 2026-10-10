import os
import cv2
import zipfile
import random
import numpy as np

OUTPUT_ZIP = r"d:\MainProjectMl\ProjectCode\backend\ml\detection_v2\ocean_sinkholes_2k.zip"
TEMP_DIR = r"d:\MainProjectMl\ProjectCode\backend\ml\detection_v2\temp_sinkholes"

os.makedirs(TEMP_DIR, exist_ok=True)

print("Generating 2,000 ocean sinkhole/whirlpool hard negative images locally...")
for i in range(2000):
    img = np.zeros((224, 224, 3), dtype=np.uint8)
    base_blue, base_green, base_red = random.randint(120, 190), random.randint(60, 110), random.randint(0, 30)
    img[:, :] = [base_blue, base_green, base_red]
    
    cx, cy = random.randint(90, 134), random.randint(90, 134)
    max_r, hole_r = random.randint(60, 95), random.randint(15, 35)
    
    for r in range(max_r, 0, -2):
        factor = (r / max_r) ** 0.8
        color = (int(base_blue * factor), int(base_green * factor), int(base_red * factor))
        cv2.circle(img, (cx, cy), r, color, -1)
        
    cv2.circle(img, (cx, cy), hole_r, (random.randint(5, 20), random.randint(5, 15), 0), -1)
    
    for _ in range(random.randint(3, 7)):
        ring_r = random.randint(hole_r + 5, max_r + 15)
        foam_val = random.randint(200, 255)
        cv2.circle(img, (cx, cy), ring_r, (foam_val, foam_val, foam_val), random.randint(2, 6))
        
    img = cv2.GaussianBlur(img, (7, 7), 0)
    cv2.imwrite(os.path.join(TEMP_DIR, f"ocean_sinkhole_{i:04d}.png"), img)

print("Zipping 2,000 images...")
with zipfile.ZipFile(OUTPUT_ZIP, 'w', zipfile.ZIP_DEFLATED) as zf:
    for fname in os.listdir(TEMP_DIR):
        fpath = os.path.join(TEMP_DIR, fname)
        zf.write(fpath, arcname=os.path.join("No_Cyclone", fname))

# Cleanup temp dir
import shutil
shutil.rmtree(TEMP_DIR)

print(f"Zip created successfully at: {OUTPUT_ZIP}")
