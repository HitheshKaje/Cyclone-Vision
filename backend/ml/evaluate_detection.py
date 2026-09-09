import os
import json
import argparse
import numpy as np
import matplotlib.pyplot as plt
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_score, recall_score, f1_score
import tensorflow as tf
from preprocessing import prepare_data
import seaborn as sns

def main():
    parser = argparse.ArgumentParser(description='Evaluate Cyclone Detection Model')
    parser.add_argument('--dataset', type=str, default='dataset', help='Path to dataset directory')
    args = parser.parse_args()
    
    model_path = '../models/cyclone_detector.keras'
    if not os.path.exists(model_path):
        print(f"Error: Model not found at {model_path}. Please train the model first.")
        return
        
    print("Loading test data...")
    try:
        _, _, (X_test, y_test), classes = prepare_data(args.dataset)
    except Exception as e:
        print(f"Error loading data: {e}")
        return
        
    print(f"Loading model from {model_path}...")
    model = tf.keras.models.load_model(model_path)
    
    print("Running predictions on test set...")
    y_pred_prob = model.predict(X_test)
    y_pred = (y_pred_prob > 0.5).astype("int32").flatten()
    
    # Calculate metrics
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred)
    rec = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    
    print("\n--- Evaluation Metrics ---")
    print(f"Accuracy:  {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall:    {rec:.4f} (Crucial for Cyclone Detection)")
    print(f"F1-Score:  {f1:.4f}")
    
    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel()
    print("\nConfusion Matrix Details:")
    print(f"True Negatives (No Cyclone correctly identified): {tn}")
    print(f"False Positives (No Cyclone incorrectly flagged): {fp}")
    print(f"False Negatives (Cyclone MISSED): {fn}")
    print(f"True Positives (Cyclone correctly identified): {tp}")
    
    metrics = {
        "accuracy": float(acc),
        "precision": float(prec),
        "recall": float(rec),
        "f1_score": float(f1),
        "confusion_matrix": {
            "tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)
        }
    }
    
    os.makedirs('../outputs/metrics', exist_ok=True)
    with open('../outputs/metrics/results.json', 'w') as f:
        json.dump(metrics, f, indent=4)
        
    # Plot Confusion Matrix
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=classes, yticklabels=classes)
    plt.xlabel('Predicted')
    plt.ylabel('Actual')
    plt.title('Confusion Matrix')
    plt.tight_layout()
    plt.savefig('../outputs/metrics/confusion_matrix.png')
    
    print("\nEvaluation complete. Results saved to '../outputs/metrics/'.")

if __name__ == '__main__':
    main()
