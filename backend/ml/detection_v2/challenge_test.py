import os
import json
import numpy as np
import cv2
import requests
from io import BytesIO
import tensorflow as tf

CHALLENGE_URLS = [
    # Black Holes / Galaxies
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/M101_hires_STScI-PRC2006-10a.jpg/800px-M101_hires_STScI-PRC2006-10a.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/NGC_4414_%28NASA-med%29.jpg/800px-NGC_4414_%28NASA-med%29.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Andromeda_Galaxy_%28with_h-alpha%29.jpg/800px-Andromeda_Galaxy_%28with_h-alpha%29.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Black_hole_-_Messier_87_crop_max_res.jpg/800px-Black_hole_-_Messier_87_crop_max_res.jpg',
    # Clouds / Non-Cyclones
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Thunderstorm_in_Ann_Arbor.jpg/800px-Thunderstorm_in_Ann_Arbor.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Squall_line_approaching.jpg/800px-Squall_line_approaching.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Cloud_over_sea.jpg/800px-Cloud_over_sea.jpg'
]

def load_image_from_url(url):
    try:
        r = requests.get(url, timeout=10)
        r.raise_for_status()
        nparr = np.frombuffer(r.content, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is not None:
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            img = cv2.resize(img, (224, 224))
            return img
    except Exception as e:
        print(f"Failed to load {url}: {e}")
    return None

def main():
    model_path = r"d:\MainProjectMl\ProjectCode\backend\models\cyclone_detector_v2.keras"
    config_path = r"d:\MainProjectMl\ProjectCode\backend\models\detection_v2_config.json"
    
    if not os.path.exists(model_path):
        print(f"Model not found at {model_path}")
        return
        
    print(f"Loading V2 Model: {model_path}")
    model = tf.keras.models.load_model(model_path)
    
    threshold = 0.5
    if os.path.exists(config_path):
        with open(config_path, 'r') as f:
            cfg = json.load(f)
            threshold = cfg.get("classification_threshold", 0.5)
            
    print(f"Using threshold: {threshold}")
    
    images = []
    valid_urls = []
    print("Downloading Challenge Images...")
    for url in CHALLENGE_URLS:
        img = load_image_from_url(url)
        if img is not None:
            images.append(img)
            valid_urls.append(url)
            
    if not images:
        print("No images loaded.")
        return
        
    X = np.array(images, dtype=np.float32)
    # Model expects 0-255 since we use EfficientNetV2B0
    
    print("\nPredicting on Challenge Set...")
    probs = model.predict(X).flatten()
    
    false_positives = 0
    print("\nResults:")
    for i, prob in enumerate(probs):
        is_cyclone = prob >= threshold
        if is_cyclone:
            false_positives += 1
        name = valid_urls[i].split('/')[-1]
        print(f"  - {name}: Prob={prob:.4f} -> {'CYCLONE (False Positive)' if is_cyclone else 'NO_CYCLONE (Correct)'}")
        
    print(f"\nTotal False Positives: {false_positives} / {len(valid_urls)}")

if __name__ == "__main__":
    main()
