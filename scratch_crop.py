import cv2
import numpy as np

img_path = r"C:\Users\Hithesh K\.gemini\antigravity\brain\f7e3b80c-26fa-4c7b-919f-8e863cb35308\.user_uploaded\media_1793610040145_dc4e6bc5.jpg"
img = cv2.imread(img_path)
print("Image shape:", img.shape)

h, w, _ = img.shape
cyclone_crop = img[int(h*0.04):int(h*0.57), int(w*0.1):int(w*0.9)]
cv2.imwrite(r"d:\MainProjectMl\ProjectCode\test_user_cyclone.jpg", cyclone_crop)
print("Saved crop with shape:", cyclone_crop.shape)
