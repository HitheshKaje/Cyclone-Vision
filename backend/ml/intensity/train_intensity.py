import os
import sys
import argparse
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models, callbacks, optimizers, losses

# Path definitions
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, '..', '..'))
MODELS_DIR = os.path.join(PROJECT_ROOT, 'models')
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
    
    # Freeze base model initially or train end-to-end with low learning rate
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

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--sanity', action='store_true', help='Run 2-epoch sanity test')
    args = parser.parse_args()
    
    if args.sanity:
        run_sanity_test()
    else:
        print("Please specify --sanity or use full training.")
