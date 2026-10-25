"""
CycloSafe - Cyclone Track Prediction Training Pipeline (North Indian Ocean)
Trains a Bidirectional LSTM model on 6-hour synoptic sequences.
Benchmarked against Kinematic Baseline & GRU using Haversine Distance Error (km).

Output Artifacts:
  - backend/models/cyclone_track_lstm.keras
  - backend/ml/track/metrics/evaluation_results.json
"""

import os
import sys
import json
import math
import time
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models, callbacks, optimizers

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
DATA_PATH = os.path.join(SCRIPT_DIR, "processed_data", "track_sequences.npz")
SCALER_PATH = os.path.join(SCRIPT_DIR, "processed_data", "track_scaler.json")
MODELS_DIR = os.path.join(PROJECT_ROOT, "backend", "models")
METRICS_DIR = os.path.join(SCRIPT_DIR, "metrics")

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(METRICS_DIR, exist_ok=True)

def haversine_vectorized(lat1, lon1, lat2, lon2):
    """Vectorized Haversine distance in kilometers."""
    R = 6371.0
    phi1 = np.radians(lat1)
    phi2 = np.radians(lat2)
    dphi = np.radians(lat2 - lat1)
    dlam = np.radians(lon2 - lon1)
    a = np.sin(dphi / 2.0)**2 + np.cos(phi1) * np.cos(phi2) * np.sin(dlam / 2.0)**2
    c = 2.0 * np.arctan2(np.sqrt(a), np.sqrt(np.maximum(0.0, 1.0 - a)))
    return R * c

def build_lstm_model(input_shape=(8, 7), output_dim=10):
    """Builds Bidirectional LSTM model for track displacement prediction."""
    inputs = layers.Input(shape=input_shape, name="track_history_input")
    x = layers.Bidirectional(layers.LSTM(128, return_sequences=True), name="bi_lstm_1")(inputs)
    x = layers.Dropout(0.2, name="dropout_1")(x)
    x = layers.Bidirectional(layers.LSTM(64, return_sequences=False), name="bi_lstm_2")(x)
    x = layers.Dropout(0.2, name="dropout_2")(x)
    x = layers.Dense(64, activation="relu", name="dense_proj")(x)
    outputs = layers.Dense(output_dim, activation="linear", name="displacement_output")(x)
    
    model = models.Model(inputs=inputs, outputs=outputs, name="CycloSafe_Track_BiLSTM")
    return model

def build_gru_model(input_shape=(8, 7), output_dim=10):
    """Builds comparative GRU model."""
    inputs = layers.Input(shape=input_shape, name="track_history_input_gru")
    x = layers.GRU(128, return_sequences=True, name="gru_1")(inputs)
    x = layers.Dropout(0.2, name="dropout_1")(x)
    x = layers.GRU(64, return_sequences=False, name="gru_2")(x)
    x = layers.Dropout(0.2, name="dropout_2")(x)
    x = layers.Dense(64, activation="relu", name="dense_proj")(x)
    outputs = layers.Dense(output_dim, activation="linear", name="displacement_output_gru")(x)
    
    model = models.Model(inputs=inputs, outputs=outputs, name="CycloSafe_Track_GRU")
    return model

def evaluate_predictions(y_pred_deltas, y_true_deltas, X_test_unnorm, horizons=[24, 48, 72, 96, 120]):
    """
    Computes MAE in degrees and terrestrial Haversine distance error in kilometers
    for each forecast horizon.
    """
    # X_test_unnorm[:, -1, 0] is current_lat, X_test_unnorm[:, -1, 1] is current_lon
    current_lat = X_test_unnorm[:, -1, 0]
    current_lon = X_test_unnorm[:, -1, 1]
    
    results = {}
    
    for idx, h in enumerate(horizons):
        d_lat_pred = y_pred_deltas[:, idx * 2]
        d_lon_pred = y_pred_deltas[:, idx * 2 + 1]
        
        d_lat_true = y_true_deltas[:, idx * 2]
        d_lon_true = y_true_deltas[:, idx * 2 + 1]
        
        pred_lat = current_lat + d_lat_pred
        pred_lon = current_lon + d_lon_pred
        
        true_lat = current_lat + d_lat_true
        true_lon = current_lon + d_lon_true
        
        # Absolute errors in degrees
        mae_lat = float(np.mean(np.abs(pred_lat - true_lat)))
        mae_lon = float(np.mean(np.abs(pred_lon - true_lon)))
        
        # Distance errors in km
        distances_km = haversine_vectorized(true_lat, true_lon, pred_lat, pred_lon)
        mean_dist_km = float(np.mean(distances_km))
        median_dist_km = float(np.median(distances_km))
        p90_dist_km = float(np.percentile(distances_km, 90))
        
        results[f"{h}h"] = {
            "forecast_horizon_hours": h,
            "mean_distance_error_km": round(mean_dist_km, 1),
            "median_distance_error_km": round(median_dist_km, 1),
            "p90_distance_error_km": round(p90_dist_km, 1),
            "mae_lat_deg": round(mae_lat, 2),
            "mae_lon_deg": round(mae_lon, 2)
        }
        
    return results

def compute_kinematic_baseline(X_test_unnorm, horizons=[24, 48, 72, 96, 120]):
    """
    Kinematic Dead-Reckoning Baseline:
    Estimates velocity from the last 2 observed fixes (delta over 6 hours),
    and extrapolates forward linearly.
    """
    N = len(X_test_unnorm)
    y_pred_baseline = np.zeros((N, len(horizons) * 2), dtype=np.float32)
    
    # Velocity per hour from step -1 to step -2
    # step -1 is t=0, step -2 is t=-6h
    d_lat_6h = X_test_unnorm[:, -1, 0] - X_test_unnorm[:, -2, 0]
    d_lon_6h = X_test_unnorm[:, -1, 1] - X_test_unnorm[:, -2, 1]
    
    v_lat_per_hour = d_lat_6h / 6.0
    v_lon_per_hour = d_lon_6h / 6.0
    
    for idx, h in enumerate(horizons):
        y_pred_baseline[:, idx * 2] = v_lat_per_hour * h
        y_pred_baseline[:, idx * 2 + 1] = v_lon_per_hour * h
        
    return y_pred_baseline

def main():
    print("=" * 70)
    print("CYCLOSAFE: TRACK PREDICTION LSTM TRAINING (CPU OPTIMIZED)")
    print("=" * 70)
    
    # 1. Load Data
    print(f"[*] Loading preprocessed sequence dataset from: {DATA_PATH}...")
    data = np.load(DATA_PATH)
    X_train_norm = data['X_train']
    y_train_norm = data['y_train']
    X_val_norm = data['X_val']
    y_val_norm = data['y_val']
    X_test_norm = data['X_test']
    y_test_norm = data['y_test']
    y_test_raw = data['y_test_raw']
    
    with open(SCALER_PATH, "r") as f:
        scaler = json.load(f)
        
    f_min = np.array(scaler['feature_min'], dtype=np.float32)
    f_range = np.array(scaler['feature_range'], dtype=np.float32)
    t_min = np.array(scaler['target_min'], dtype=np.float32)
    t_range = np.array(scaler['target_range'], dtype=np.float32)
    
    # Reconstruct unnormalized X_test for geographical distance evaluation
    X_test_unnorm = X_test_norm * f_range + f_min
    
    print(f"    Train size: {len(X_train_norm):,} sequences")
    print(f"    Val size:   {len(X_val_norm):,} sequences")
    print(f"    Test size:  {len(X_test_norm):,} sequences")
    
    # 2. Evaluate Kinematic Baseline
    print("\n[*] Evaluating Kinematic Dead-Reckoning Baseline...")
    y_pred_baseline = compute_kinematic_baseline(X_test_unnorm)
    baseline_metrics = evaluate_predictions(y_pred_baseline, y_test_raw, X_test_unnorm)
    
    # 3. Build & Train GRU Model (Comparative Study)
    print("\n[*] Building and Training Comparative GRU Model...")
    gru_model = build_gru_model(input_shape=(8, 7), output_dim=10)
    gru_model.compile(optimizer=optimizers.Adam(learning_rate=0.002), loss="huber", metrics=["mae"])
    
    t0 = time.time()
    gru_model.fit(
        X_train_norm, y_train_norm,
        validation_data=(X_val_norm, y_val_norm),
        epochs=15,
        batch_size=64,
        verbose=1
    )
    print(f"    GRU trained in {time.time() - t0:.1f}s")
    
    y_pred_gru_norm = gru_model.predict(X_test_norm, verbose=0)
    y_pred_gru_raw = y_pred_gru_norm * t_range + t_min
    gru_metrics = evaluate_predictions(y_pred_gru_raw, y_test_raw, X_test_unnorm)
    
    # 4. Build & Train Primary Bidirectional LSTM Model
    print("\n[*] Building and Training Primary Bidirectional LSTM Model...")
    lstm_model = build_lstm_model(input_shape=(8, 7), output_dim=10)
    lstm_model.compile(
        optimizer=optimizers.Adam(learning_rate=0.002),
        loss="huber",
        metrics=["mae"]
    )
    lstm_model.summary()
    
    cb_list = [
        callbacks.EarlyStopping(monitor="val_loss", patience=8, restore_best_weights=True, verbose=1),
        callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=3, min_lr=1e-5, verbose=1)
    ]
    
    t0 = time.time()
    history = lstm_model.fit(
        X_train_norm, y_train_norm,
        validation_data=(X_val_norm, y_val_norm),
        epochs=30,
        batch_size=64,
        callbacks=cb_list,
        verbose=1
    )
    train_duration = time.time() - t0
    print(f"    Bidirectional LSTM trained in {train_duration:.1f}s")
    
    # 5. Evaluate LSTM Predictions on Test Set
    y_pred_lstm_norm = lstm_model.predict(X_test_norm, verbose=0)
    y_pred_lstm_raw = y_pred_lstm_norm * t_range + t_min
    lstm_metrics = evaluate_predictions(y_pred_lstm_raw, y_test_raw, X_test_unnorm)
    
    # 6. Save Model Artifacts
    target_model_path = os.path.join(MODELS_DIR, "cyclone_track_lstm.keras")
    lstm_model.save(target_model_path)
    print(f"\n[*] Saved trained model to: {target_model_path}")
    
    # 7. Print Comparative Evaluation Table (Mirroring the 2025 Paper)
    print("\n" + "=" * 75)
    print("NORTH INDIAN OCEAN TRACK PREDICTION — COMPARATIVE STUDY RESULTS")
    print("=" * 75)
    print(f"{'Horizon':<10} | {'Kinematic Baseline (km)':<22} | {'GRU Model (km)':<16} | {'Bi-LSTM Model (km)':<18}")
    print("-" * 75)
    
    horizons = ["24h", "48h", "72h", "96h", "120h"]
    for h in horizons:
        b_km = baseline_metrics[h]["mean_distance_error_km"]
        g_km = gru_metrics[h]["mean_distance_error_km"]
        l_km = lstm_metrics[h]["mean_distance_error_km"]
        print(f"{h:<10} | {b_km:<22} | {g_km:<16} | {l_km:<18}")
    print("=" * 75)
    
    # 8. Save Metrics to JSON
    report = {
        "title": "CycloSafe Track Prediction Comparative Study",
        "dataset": "NOAA IBTrACS v04r01 (North Indian Ocean Basin)",
        "training_environment": "Local CPU (Optimized)",
        "training_time_seconds": round(train_duration, 2),
        "test_sequences": len(X_test_norm),
        "comparative_metrics": {
            "kinematic_baseline": baseline_metrics,
            "gru": gru_metrics,
            "bilstm": lstm_metrics
        }
    }
    
    report_path = os.path.join(METRICS_DIR, "evaluation_results.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"[*] Evaluation report saved to: {report_path}")
    print("\n" + "=" * 70)
    print("MODEL TRAINING AND EVALUATION SUCCESSFULLY COMPLETE!")
    print("=" * 70)

if __name__ == "__main__":
    main()
