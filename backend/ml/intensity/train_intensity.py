import os
import sys
import json
import argparse
import datetime
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models, callbacks, optimizers, losses
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# Use headless backend for matplotlib
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# Path definitions
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, '..', '..'))
MODELS_DIR = os.path.join(PROJECT_ROOT, 'models')
OUTPUTS_DIR = os.path.join(PROJECT_ROOT, 'outputs', 'intensity')
METRICS_DIR = os.path.join(OUTPUTS_DIR, 'metrics')
PLOTS_DIR = os.path.join(OUTPUTS_DIR, 'plots')

CACHE_PATH = os.path.join(CURRENT_DIR, 'dataset', 'io_dataset_cache.npz')
INTENSITY_MODEL_PATH = os.path.join(MODELS_DIR, 'cyclone_intensity.keras')
DETECTOR_MODEL_PATH = os.path.join(MODELS_DIR, 'cyclone_detector.keras')

# Add intensity directory to sys.path for local imports
if CURRENT_DIR not in sys.path:
    sys.path.append(CURRENT_DIR)

from preprocessing_intensity import IntensityDataGenerator
from utils import load_info_dataframe, get_storm_level_split, DEFAULT_H5_PATH

def build_intensity_model(input_shape=(224, 224, 3)):
    """
    Build EfficientNetB0 Regression Model for Cyclone Intensity Estimation.
    Outputs continuous maximum sustained wind speed (Vmax in knots).
    """
    base_model = tf.keras.applications.EfficientNetB0(
        weights='imagenet',
        include_top=False,
        input_shape=input_shape
    )
    
    base_model.trainable = True
    
    inputs = layers.Input(shape=input_shape, name="ir1_input")
    x = base_model(inputs)
    x = layers.GlobalAveragePooling2D(name="gap")(x)
    x = layers.Dense(128, activation="relu", name="dense_128")(x)
    x = layers.Dropout(0.3, name="dropout_0.3")(x)
    outputs = layers.Dense(1, activation="linear", name="vmax_output_knots")(x)
    
    model = models.Model(inputs=inputs, outputs=outputs, name="EfficientNetB0_TCIR_Intensity")
    return model

def run_sanity_test():
    """
    Run a fast 2-epoch sanity check to verify:
    - Cache integrity
    - Train/Val/Test storm separation
    - No NaNs
    - Correct output shape (batch_size, 1)
    - Finite Loss & MAE
    - Model saving strictly to backend/models/cyclone_intensity.keras
    - Absolute preservation of backend/models/cyclone_detector.keras
    """
    print("=" * 60)
    print("OBJECTIVE 2: CYCLONE INTENSITY ESTIMATION — SANITY TEST")
    print("=" * 60)
    
    # 0. Check Objective 1 Detector baseline
    if not os.path.exists(DETECTOR_MODEL_PATH):
        raise FileNotFoundError(f"CRITICAL ERROR: Objective 1 detector not found at {DETECTOR_MODEL_PATH}")
    
    det_size_before = os.path.getsize(DETECTOR_MODEL_PATH)
    det_mtime_before = os.path.getmtime(DETECTOR_MODEL_PATH)
    print(f"Objective 1 Detector (READ-ONLY): {DETECTOR_MODEL_PATH}")
    print(f"  Size: {det_size_before:,} bytes | Mtime: {det_mtime_before}")
    
    # 1. Load Cache
    if not os.path.exists(CACHE_PATH):
        raise FileNotFoundError(f"Cache file not found at: {CACHE_PATH}")
        
    print(f"\n1. Loading cache: {CACHE_PATH}...")
    cache = np.load(CACHE_PATH, allow_pickle=True)
    X = cache['X']
    y = cache['y']
    storm_ids = cache['storm_ids']
    
    print(f"   X shape: {X.shape}, dtype: {X.dtype}, min: {X.min():.4f}, max: {X.max():.4f}")
    print(f"   y shape: {y.shape}, dtype: {y.dtype}, min: {y.min():.2f} kt, max: {y.max():.2f} kt")
    print(f"   Storms: {len(np.unique(storm_ids))} unique storms")
    
    # 2. Check NaNs
    nan_x = np.isnan(X).sum()
    nan_y = np.isnan(y).sum()
    print(f"\n2. Checking NaNs:")
    print(f"   NaNs in X: {nan_x} | NaNs in y: {nan_y}")
    if nan_x > 0 or nan_y > 0:
        raise ValueError(f"Dataset contains NaN values! nan_x={nan_x}, nan_y={nan_y}")
        
    # 3. Storm-Level Split Verification
    print(f"\n3. Splitting by storm level...")
    info_df = load_info_dataframe(DEFAULT_H5_PATH)
    train_df, val_df, test_df, storm_dict = get_storm_level_split(info_df, basin='IO', random_seed=42)
    
    train_storms = set(storm_dict['train_storms'])
    val_storms = set(storm_dict['val_storms'])
    test_storms = set(storm_dict['test_storms'])
    
    assert len(train_storms.intersection(val_storms)) == 0, "Train and Val share storms!"
    assert len(train_storms.intersection(test_storms)) == 0, "Train and Test share storms!"
    assert len(val_storms.intersection(test_storms)) == 0, "Val and Test share storms!"
    print(f"   Train: {len(train_storms)} storms ({len(train_df)} frames)")
    print(f"   Val:   {len(val_storms)} storms ({len(val_df)} frames)")
    print(f"   Test:  {len(test_storms)} storms ({len(test_df)} frames)")
    print(f"   Zero Storm Overlap: VERIFIED PASSED")
    
    # Index splits in cache
    train_indices = [i for i, sid in enumerate(storm_ids) if sid in train_storms]
    val_indices = [i for i, sid in enumerate(storm_ids) if sid in val_storms]
    test_indices = [i for i, sid in enumerate(storm_ids) if sid in test_storms]
    
    X_train, y_train = X[train_indices], y[train_indices]
    X_val, y_val = X[val_indices], y[val_indices]
    X_test, y_test = X[test_indices], y[test_indices]
    
    print(f"   Extracted Arrays -> Train: {X_train.shape}, Val: {X_val.shape}, Test: {X_test.shape}")
    
    # 4. Build Model
    print(f"\n4. Building Model...")
    model = build_intensity_model()
    model.compile(
        optimizer=optimizers.Adam(learning_rate=1e-4),
        loss=losses.Huber(delta=1.0),
        metrics=['mae']
    )
    
    # 5. Forward Pass Verification
    print(f"\n5. Verifying Small Forward Pass...")
    sample_batch = X_train[:4]
    sample_preds = model(sample_batch, training=False)
    print(f"   Input shape: {sample_batch.shape}")
    print(f"   Output shape: {sample_preds.shape} (Expected: (4, 1))")
    print(f"   Sample predictions: {sample_preds.numpy().flatten()} kt")
    if sample_preds.shape != (4, 1):
        raise ValueError(f"Unexpected output shape: {sample_preds.shape}")
        
    # 6. Run 2 Training Epochs
    print(f"\n6. Running 2-Epoch Sanity Training...")
    batch_size = 32
    train_gen = IntensityDataGenerator(X_train, y_train, batch_size=batch_size, augment=True, shuffle=True)
    val_gen = IntensityDataGenerator(X_val, y_val, batch_size=batch_size, augment=False, shuffle=False)
    
    os.makedirs(MODELS_DIR, exist_ok=True)
    checkpoint_cb = callbacks.ModelCheckpoint(
        filepath=INTENSITY_MODEL_PATH,
        monitor='val_loss',
        save_best_only=True,
        verbose=1
    )
    
    history = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=2,
        callbacks=[checkpoint_cb],
        verbose=1
    )
    
    final_train_loss = history.history['loss'][-1]
    final_train_mae = history.history['mae'][-1]
    final_val_loss = history.history['val_loss'][-1]
    final_val_mae = history.history['val_mae'][-1]
    
    print(f"\nSanity Training Metrics:")
    print(f"   Epoch 1 -> Loss: {history.history['loss'][0]:.4f}, MAE: {history.history['mae'][0]:.2f} kt | Val Loss: {history.history['val_loss'][0]:.4f}, Val MAE: {history.history['val_mae'][0]:.2f} kt")
    print(f"   Epoch 2 -> Loss: {history.history['loss'][1]:.4f}, MAE: {history.history['mae'][1]:.2f} kt | Val Loss: {history.history['val_loss'][1]:.4f}, Val MAE: {history.history['val_mae'][1]:.2f} kt")
    
    # 7. Verify Finite Loss and Checkpoint
    if np.isnan(final_train_loss) or np.isinf(final_train_loss):
        raise ValueError(f"Training loss is not finite: {final_train_loss}")
    if np.isnan(final_val_loss) or np.isinf(final_val_loss):
        raise ValueError(f"Validation loss is not finite: {final_val_loss}")
        
    print(f"\n7. Checkpoint File Verification:")
    if not os.path.exists(INTENSITY_MODEL_PATH):
        raise FileNotFoundError(f"Expected intensity model checkpoint not found at: {INTENSITY_MODEL_PATH}")
    int_size = os.path.getsize(INTENSITY_MODEL_PATH)
    print(f"   Objective 2 Model Saved: {INTENSITY_MODEL_PATH}")
    print(f"   Objective 2 Model Size:  {int_size:,} bytes")
    
    # 8. Objective 1 Detector Untouched Verification
    det_size_after = os.path.getsize(DETECTOR_MODEL_PATH)
    det_mtime_after = os.path.getmtime(DETECTOR_MODEL_PATH)
    print(f"\n8. Objective 1 Model Integrity Check:")
    print(f"   Path: {DETECTOR_MODEL_PATH}")
    print(f"   Size Before:  {det_size_before:,} | Size After:  {det_size_after:,}")
    print(f"   Mtime Before: {det_mtime_before} | Mtime After: {det_mtime_after}")
    if det_size_before != det_size_after or det_mtime_before != det_mtime_after:
        raise RuntimeError("CRITICAL ALERT: Objective 1 detector model file was modified!")
    print(f"   Objective 1 Integrity: PASSED (UNTOUCHED & READ-ONLY)")
    
    print("\n" + "=" * 60)
    print("SANITY TEST COMPLETED SUCCESSFULLY WITH ZERO DEFECTS.")
    print("=" * 60)

def run_full_training(max_epochs=50, batch_size=32):
    """
    Run Full Training Pipeline for Objective 2: Cyclone Intensity Estimation.
    - Preserves Objective 1 Detector model.
    - Trains EfficientNetB0 Regression Model on 53 Indian Ocean storms.
    - Evaluates solely on 11 held-out test storms.
    - Generates results.json and evaluation plots.
    """
    print("=" * 70)
    print("OBJECTIVE 2: CYCLONE INTENSITY ESTIMATION — FULL TRAINING PIPELINE")
    print("=" * 70)
    
    # 1. Verify Objective 1 detector exists and record baseline metadata
    if not os.path.exists(DETECTOR_MODEL_PATH):
        raise FileNotFoundError(f"CRITICAL ERROR: Objective 1 detector not found at {DETECTOR_MODEL_PATH}")
        
    det_size_before = os.path.getsize(DETECTOR_MODEL_PATH)
    det_mtime_before = os.path.getmtime(DETECTOR_MODEL_PATH)
    print(f"Objective 1 Detector (READ-ONLY): {DETECTOR_MODEL_PATH}")
    print(f"  Pre-training Size:  {det_size_before:,} bytes")
    print(f"  Pre-training Mtime: {det_mtime_before}")
    
    # 2. Load NPZ cache
    if not os.path.exists(CACHE_PATH):
        raise FileNotFoundError(f"Prepared NPZ cache not found at: {CACHE_PATH}")
        
    print(f"\n[1/7] Loading Dataset Cache: {CACHE_PATH}...")
    cache = np.load(CACHE_PATH, allow_pickle=True)
    X = cache['X']
    y = cache['y']
    storm_ids = cache['storm_ids']
    
    print(f"  Total samples: {len(X):,}")
    print(f"  Input shape:   {X.shape}")
    print(f"  Target shape:  {y.shape} (Range: [{y.min():.1f}, {y.max():.1f}] kt)")
    print(f"  Total storms:  {len(np.unique(storm_ids))}")
    
    # 3. Reconstruct verified storm-level split
    print(f"\n[2/7] Reconstructing 53/11/11 Storm-Level Split...")
    info_df = load_info_dataframe(DEFAULT_H5_PATH)
    train_df, val_df, test_df, storm_dict = get_storm_level_split(info_df, basin='IO', random_seed=42)
    
    train_storms = set(storm_dict['train_storms'])
    val_storms = set(storm_dict['val_storms'])
    test_storms = set(storm_dict['test_storms'])
    
    # Verify zero storm overlap
    assert len(train_storms.intersection(val_storms)) == 0, "DATA LEAKAGE: Train & Val overlap!"
    assert len(train_storms.intersection(test_storms)) == 0, "DATA LEAKAGE: Train & Test overlap!"
    assert len(val_storms.intersection(test_storms)) == 0, "DATA LEAKAGE: Val & Test overlap!"
    
    print(f"  Train: {len(train_storms)} storms ({len(train_df)} frames)")
    print(f"  Val:   {len(val_storms)} storms ({len(val_df)} frames)")
    print(f"  Test:  {len(test_storms)} storms ({len(test_df)} frames)")
    print(f"  Zero Leakage Guarantee: PASSED")
    
    train_indices = [i for i, sid in enumerate(storm_ids) if sid in train_storms]
    val_indices = [i for i, sid in enumerate(storm_ids) if sid in val_storms]
    test_indices = [i for i, sid in enumerate(storm_ids) if sid in test_storms]
    
    X_train, y_train = X[train_indices], y[train_indices]
    X_val, y_val = X[val_indices], y[val_indices]
    X_test, y_test = X[test_indices], y[test_indices]
    
    # 4. Build Model & Configure Callbacks
    print(f"\n[3/7] Building Objective 2 Regression Model...")
    model = build_intensity_model()
    model.compile(
        optimizer=optimizers.Adam(learning_rate=1e-4),
        loss=losses.Huber(delta=1.0),
        metrics=['mae']
    )
    model.summary()
    
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(METRICS_DIR, exist_ok=True)
    os.makedirs(PLOTS_DIR, exist_ok=True)
    
    train_gen = IntensityDataGenerator(X_train, y_train, batch_size=batch_size, augment=True, shuffle=True)
    val_gen = IntensityDataGenerator(X_val, y_val, batch_size=batch_size, augment=False, shuffle=False)
    
    checkpoint_cb = callbacks.ModelCheckpoint(
        filepath=INTENSITY_MODEL_PATH,
        monitor='val_loss',
        save_best_only=True,
        verbose=1
    )
    early_stopping_cb = callbacks.EarlyStopping(
        monitor='val_loss',
        patience=7,
        restore_best_weights=True,
        verbose=1
    )
    reduce_lr_cb = callbacks.ReduceLROnPlateau(
        monitor='val_loss',
        factor=0.5,
        patience=3,
        min_lr=1e-6,
        verbose=1
    )
    
    # 5. Train Model
    print(f"\n[4/7] Starting Training (Max {max_epochs} epochs, Batch size {batch_size})...")
    history = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=max_epochs,
        callbacks=[checkpoint_cb, early_stopping_cb, reduce_lr_cb],
        verbose=1
    )
    
    epochs_completed = len(history.history['loss'])
    best_epoch = int(np.argmin(history.history['val_loss']) + 1)
    print(f"\nTraining completed in {epochs_completed} epochs. Best epoch: {best_epoch}")
    
    # 6. Evaluate on Held-out Test Set
    print(f"\n[5/7] Evaluating Best Model on Held-out Test Set ({len(X_test)} frames from 11 storms)...")
    best_model = tf.keras.models.load_model(INTENSITY_MODEL_PATH)
    y_pred_test = best_model.predict(X_test, batch_size=batch_size, verbose=1).flatten()
    
    test_mae = float(mean_absolute_error(y_test, y_pred_test))
    test_mse = float(mean_squared_error(y_test, y_pred_test))
    test_rmse = float(np.sqrt(test_mse))
    test_r2 = float(r2_score(y_test, y_pred_test))
    
    print(f"\n--- OBJECTIVE 2 TEST METRICS ---")
    print(f"  Test MAE:  {test_mae:.3f} knots")
    print(f"  Test RMSE: {test_rmse:.3f} knots")
    print(f"  Test R²:   {test_r2:.4f}")
    
    # 7. Save Metrics JSON
    results_data = {
        "timestamp": datetime.datetime.now().isoformat(),
        "model_architecture": "EfficientNetB0-Regression",
        "objective": "Objective 2: Tropical Cyclone Intensity Estimation",
        "basin": "Indian Ocean (IO)",
        "dataset_split": {
            "total_frames": int(len(X)),
            "total_storms": int(len(np.unique(storm_ids))),
            "train_storms": int(len(train_storms)),
            "train_frames": int(len(X_train)),
            "val_storms": int(len(val_storms)),
            "val_frames": int(len(X_val)),
            "test_storms": int(len(test_storms)),
            "test_frames": int(len(X_test)),
            "test_storm_ids": sorted(list(test_storms))
        },
        "training_summary": {
            "epochs_completed": epochs_completed,
            "best_epoch": best_epoch,
            "batch_size": batch_size,
            "optimizer": "Adam(lr=1e-4)",
            "loss_function": "Huber(delta=1.0)"
        },
        "test_metrics": {
            "mae_knots": round(test_mae, 4),
            "rmse_knots": round(test_rmse, 4),
            "r2_score": round(test_r2, 4)
        },
        "model_path": INTENSITY_MODEL_PATH
    }
    
    results_json_path = os.path.join(METRICS_DIR, 'results.json')
    with open(results_json_path, 'w') as f:
        json.dump(results_data, f, indent=2)
    print(f"\nSaved test metrics to: {results_json_path}")
    
    # 8. Generate & Save Evaluation Plots
    print(f"\n[6/7] Generating and Saving Evaluation Plots...")
    
    # Plot 1: Training & Validation Loss History
    plt.figure(figsize=(10, 5))
    plt.plot(history.history['loss'], label='Train Loss (Huber)', color='#0284c7', linewidth=2)
    plt.plot(history.history['val_loss'], label='Val Loss (Huber)', color='#f97316', linewidth=2)
    plt.axvline(best_epoch - 1, color='red', linestyle='--', alpha=0.7, label=f'Best Epoch ({best_epoch})')
    plt.title('Objective 2 Intensity Model — Training & Validation Loss', fontsize=13, fontweight='bold')
    plt.xlabel('Epoch', fontsize=11)
    plt.ylabel('Huber Loss', fontsize=11)
    plt.legend(fontsize=10)
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plot1_path = os.path.join(PLOTS_DIR, 'training_loss_history.png')
    plt.savefig(plot1_path, dpi=300)
    plt.close()
    print(f"  Saved: {plot1_path}")
    
    # Plot 2: Actual vs Predicted Wind Speed
    plt.figure(figsize=(8, 8))
    plt.scatter(y_test, y_pred_test, color='#0284c7', alpha=0.6, edgecolors='none', s=40, label='Test Frames')
    min_val = min(float(y_test.min()), float(y_pred_test.min())) - 5
    max_val = max(float(y_test.max()), float(y_pred_test.max())) + 5
    plt.plot([min_val, max_val], [min_val, max_val], color='#ef4444', linestyle='--', linewidth=2, label='Perfect Prediction (1:1)')
    plt.title(f'Actual vs. Predicted Intensity (Test Storms)\nMAE: {test_mae:.2f} kt | RMSE: {test_rmse:.2f} kt | R²: {test_r2:.3f}', fontsize=12, fontweight='bold')
    plt.xlabel('Actual Maximum Sustained Wind Speed (knots)', fontsize=11)
    plt.ylabel('Predicted Wind Speed (knots)', fontsize=11)
    plt.xlim(min_val, max_val)
    plt.ylim(min_val, max_val)
    plt.legend(fontsize=10)
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plot2_path = os.path.join(PLOTS_DIR, 'actual_vs_predicted.png')
    plt.savefig(plot2_path, dpi=300)
    plt.close()
    print(f"  Saved: {plot2_path}")
    
    # Plot 3: Residual Distribution
    residuals = y_pred_test - y_test
    plt.figure(figsize=(9, 5))
    plt.hist(residuals, bins=25, color='#0284c7', edgecolor='#0f172a', alpha=0.75, density=True)
    plt.axvline(0, color='#ef4444', linestyle='--', linewidth=2, label='Zero Error')
    plt.axvline(np.mean(residuals), color='#f59e0b', linestyle='-', linewidth=2, label=f'Mean Error ({np.mean(residuals):.2f} kt)')
    plt.title(f'Test Residual Distribution (Predicted − Actual)\nStd Dev: {np.std(residuals):.2f} kt', fontsize=12, fontweight='bold')
    plt.xlabel('Residual Error (knots)', fontsize=11)
    plt.ylabel('Density', fontsize=11)
    plt.legend(fontsize=10)
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plot3_path = os.path.join(PLOTS_DIR, 'residual_distribution.png')
    plt.savefig(plot3_path, dpi=300)
    plt.close()
    print(f"  Saved: {plot3_path}")
    
    # 9. Verify Objective 1 detector size and modification time AFTER training
    print(f"\n[7/7] Verifying Objective 1 Model Safety Post-Training...")
    det_size_after = os.path.getsize(DETECTOR_MODEL_PATH)
    det_mtime_after = os.path.getmtime(DETECTOR_MODEL_PATH)
    
    print(f"  Objective 1 Path:  {DETECTOR_MODEL_PATH}")
    print(f"  Size Before:       {det_size_before:,} bytes | Size After:  {det_size_after:,} bytes")
    print(f"  Mtime Before:      {det_mtime_before} | Mtime After: {det_mtime_after}")
    
    if det_size_before != det_size_after or det_mtime_before != det_mtime_after:
        raise RuntimeError("CRITICAL ALERT: Objective 1 detector model was modified during Objective 2 training!")
        
    print(f"  Objective 1 Status: PRESERVED & UNTOUCHED (READ-ONLY)")
    
    print("\n" + "=" * 70)
    print("OBJECTIVE 2 FULL TRAINING & EVALUATION COMPLETED SUCCESSFULLY")
    print("=" * 70)
    print(f"Epochs Completed:       {epochs_completed}")
    print(f"Best Epoch:             {best_epoch}")
    print(f"Test MAE:               {test_mae:.3f} knots")
    print(f"Test RMSE:              {test_rmse:.3f} knots")
    print(f"Test R²:                {test_r2:.4f}")
    print(f"Objective 2 Model:      {INTENSITY_MODEL_PATH}")
    print(f"Objective 1 Model:      {DETECTOR_MODEL_PATH} (UNTOUCHED)")
    print("=" * 70)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description="CycloneVision Objective 2: Tropical Cyclone Intensity Estimation Training Pipeline"
    )
    parser.add_argument(
        '--sanity',
        action='store_true',
        help='Run a 2-epoch sanity test to verify pipeline, cache, shapes, and model saving'
    )
    parser.add_argument(
        '--full',
        action='store_true',
        help='Run the full training pipeline (up to 50 epochs with EarlyStopping), evaluation, and plot generation'
    )
    parser.add_argument(
        '--epochs',
        type=int,
        default=50,
        help='Maximum number of epochs for full training (default: 50)'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=32,
        help='Batch size for training and evaluation (default: 32)'
    )
    
    args = parser.parse_args()
    
    if args.sanity:
        run_sanity_test()
    elif args.full:
        run_full_training(max_epochs=args.epochs, batch_size=args.batch_size)
    else:
        print("\n" + "=" * 60)
        print("CycloneVision - Objective 2 Intensity Training CLI")
        print("=" * 60)
        print("Usage:")
        print("  python train_intensity.py --sanity     Run 2-epoch sanity check")
        print("  python train_intensity.py --full       Run full 50-epoch training & evaluation")
        print("\nFor additional options, use: python train_intensity.py --help")
        print("=" * 60 + "\n")
