import os
import argparse
import numpy as np
import tensorflow as tf
from preprocessing import load_and_preprocess_image

def main():
    parser = argparse.ArgumentParser(description='Test Cyclone Detection on a single image')
    parser.add_argument('--image', type=str, required=True, help='Path to image')
    args = parser.parse_args()
    
    if not os.path.exists(args.image):
        print(f"Error: Image not found at {args.image}")
        return
        
    model_path = '../models/cyclone_detector.keras'
    if not os.path.exists(model_path):
        print(f"Error: Model not found at {model_path}. Please train the model first.")
        return
        
    img = load_and_preprocess_image(args.image)
    if img is None:
        print("Failed to process image.")
        return
        
    # Expand dims to create batch of size 1
    img_batch = np.expand_dims(img, axis=0)
    
    print("Loading model...")
    model = tf.keras.models.load_model(model_path)
    
    print("Running inference...")
    prob = model.predict(img_batch)[0][0]
    
    # 0 = No Cyclone, 1 = Cyclone
    is_cyclone = prob > 0.5
    confidence = prob if is_cyclone else (1 - prob)
    prediction = "Cyclone" if is_cyclone else "No Cyclone"
    
    print(f"\nPrediction: {prediction}")
    print(f"Confidence: {confidence * 100:.2f}%")

if __name__ == '__main__':
    main()
