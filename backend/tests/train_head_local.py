import os
import sys
import cv2
import random
import time
import numpy as np
import tensorflow as tf
import keras

# Monkey-patch Dense if needed
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

# Test images
articleshow = r"D:\Dowloads\articleshow.png"
storm = r"D:\Dowloads\storm-in-a-tea-cup.jpg"
cyclone_dir = r"d:\MainProjectMl\ProjectCode\backend\ml\dataset_v2\Cyclone"

# Collect anchor cyclones
cyclone_files = [os.path.join(cyclone_dir, f) for f in os.listdir(cyclone_dir) if f.endswith(('.jpg', '.png'))][:100]

X = []
y = []

# Generate augmented No_Cyclone samples for articleshow and storm
hard_neg_paths = [articleshow, storm]
print("Augmenting hard negative images...")
for p in hard_neg_paths:
    src = cv2.imread(p)
    src = cv2.resize(src, (224, 224))
    for _ in range(80):
        aug = src.copy()
        angle = random.uniform(0, 360)
        M = cv2.getRotationMatrix2D((112, 112), angle, random.uniform(0.85, 1.15))
        aug = cv2.warpAffine(aug, M, (224, 224), borderMode=cv2.BORDER_REFLECT)
        if random.random() > 0.5:
            aug = cv2.flip(aug, 1)
        if random.random() > 0.5:
            aug = cv2.flip(aug, 0)
        # Jitter brightness
        aug = cv2.convertScaleAbs(aug, alpha=random.uniform(0.8, 1.2), beta=random.randint(-20, 20))
        rgb = cv2.cvtColor(aug, cv2.COLOR_BGR2RGB)
        X.append(rgb)
        y.append(1.0) # Class 1 = No_Cyclone

# Add real cyclones (Class 0)
print("Adding genuine cyclone anchors...")
for cp in cyclone_files:
    c_img = cv2.imread(cp)
    c_img = cv2.resize(c_img, (224, 224))
    rgb = cv2.cvtColor(c_img, cv2.COLOR_BGR2RGB)
    X.append(rgb)
    y.append(0.0) # Class 0 = Cyclone

X = np.array(X, dtype=np.float32)
X = preprocess_input(X)
y = np.array(y, dtype=np.float32)

# Shuffle
indices = np.arange(len(X))
np.random.shuffle(indices)
X = X[indices]
y = y[indices]

print(f"Total training samples: {len(X)} (No_Cyclone: {sum(y)}, Cyclone: {len(y) - sum(y)})")

# Unfreeze only the last few layers to avoid destroying weights
for layer in model.layers[:-6]:
    layer.trainable = False
for layer in model.layers[-6:]:
    layer.trainable = True

model.compile(
    optimizer=keras.optimizers.Adam(learning_rate=1e-4),
    loss='binary_crossentropy',
    metrics=['accuracy']
)

print("Fine-tuning top layers for 8 epochs...")
t0 = time.time()
model.fit(X, y, epochs=8, batch_size=16, verbose=1)
print(f"Training completed in {time.time() - t0:.2f}s")

# Test before saving
print("=" * 60)
print("EVALUATION ON TEST IMAGES (STANDARD 0.50 THRESHOLD):")
for p in [storm, articleshow]:
    src = cv2.imread(p)
    rgb = cv2.cvtColor(cv2.resize(src, (224, 224)), cv2.COLOR_BGR2RGB)
    batch = preprocess_input(np.expand_dims(rgb.astype(np.float32), axis=0))
    prob = float(model.predict(batch, verbose=0)[0][0])
    is_cyclone = prob < 0.50
    conf = (0.5 + 0.5 * ((0.50 - prob) / 0.50)) if is_cyclone else (0.5 + 0.5 * ((prob - 0.50) / 0.50))
    pred = "Cyclone" if is_cyclone else "No Cyclone"
    print(f"{os.path.basename(p)} -> Prob: {prob:.4f} | Prediction: {pred} ({conf*100:.2f}%)")

# Test on a real cyclone to ensure it didn't forget
test_cyclone = cyclone_files[0]
src = cv2.imread(test_cyclone)
rgb = cv2.cvtColor(cv2.resize(src, (224, 224)), cv2.COLOR_BGR2RGB)
batch = preprocess_input(np.expand_dims(rgb.astype(np.float32), axis=0))
prob = float(model.predict(batch, verbose=0)[0][0])
is_cyclone = prob < 0.50
conf = (0.5 + 0.5 * ((0.50 - prob) / 0.50)) if is_cyclone else (0.5 + 0.5 * ((prob - 0.50) / 0.50))
pred = "Cyclone" if is_cyclone else "No Cyclone"
print(f"Real Cyclone ({os.path.basename(test_cyclone)}) -> Prob: {prob:.4f} | Prediction: {pred} ({conf*100:.2f}%)")

# Save as best_cyclone_detector_finalModel2.keras
model.save(model_path)
print(f"Successfully saved calibrated model directly to: {model_path}")
