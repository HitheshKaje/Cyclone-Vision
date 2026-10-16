import os
import sys
import cv2
import numpy as np

# Monkey-patch Dense if needed
import keras
if not hasattr(keras.layers.Dense, "_is_patched"):
    original_dense_init = keras.layers.Dense.__init__
    def patched_dense_init(self, *args, **kwargs):
        kwargs.pop('quantization_config', None)
        original_dense_init(self, *args, **kwargs)
    keras.layers.Dense.__init__ = patched_dense_init
    keras.layers.Dense._is_patched = True

from tensorflow.keras.applications.efficientnet import preprocess_input

model_path = r"d:\MainProjectMl\ProjectCode\backend\models\best_cyclone_detector_finalModel2.keras"
print(f"Loading Model: {model_path}")
model = keras.models.load_model(model_path)

test_images = [
    r"D:\Dowloads\storm-in-a-tea-cup.jpg",
    r"d:\MainProjectMl\ProjectCode\backend\ml\dataset_v2\Cyclone\20001127.12-45.jpg"
]

print("=" * 60)
for p in test_images:
    if not os.path.exists(p):
        print(f"File not found: {p}")
        continue
    img = cv2.imread(p)
    resized = cv2.resize(img, (224, 224))
    rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
    batch = preprocess_input(np.expand_dims(rgb.astype(np.float32), axis=0))
    
    prob = float(model.predict(batch, verbose=0)[0][0])
    
    # Class 0 = Cyclone (prob < 0.40), Class 1 = No_Cyclone (prob >= 0.40)
    thresh = 0.40
    is_cyclone = prob < thresh
    if is_cyclone:
        conf = 0.5 + 0.5 * ((thresh - prob) / thresh)
        pred = "Cyclone"
    else:
        conf = 0.5 + 0.5 * ((prob - thresh) / (1.0 - thresh))
        pred = "No Cyclone"
        
    print(f"Image: {os.path.basename(p)}")
    print(f"  -> Raw Prob: {prob:.4f}")
    print(f"  -> Prediction: {pred} ({conf*100:.2f}% confidence)")
    print("-" * 60)
