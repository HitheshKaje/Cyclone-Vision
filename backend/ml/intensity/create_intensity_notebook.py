import json
import os

OUTPUT = r"d:\MainProjectMl\ProjectCode\backend\ml\intensity\CycloSafe_Intensity_Training.ipynb"

def md(text):
    return {"cell_type": "markdown", "metadata": {}, "source": [text + "\n"]}

def code(lines):
    return {"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": [line + "\n" for line in lines]}

cells = [
    md("# CycloSafe - Cyclone Intensity Estimation Model Training\n## Regression (Wind Speed in Knots) using TCIR Dataset\n\n**Dataset:** `io_dataset_cache.npz` (Indian Ocean)\n**Architecture:** EfficientNetB0 (Regression Output)\n\n**Instructions:** Upload `io_dataset_cache.npz` to your Google Drive before running this notebook!"),
    
    md("## Step 1: Mount Google Drive"),
    code([
        "from google.colab import drive",
        "drive.mount('/content/drive')"
    ]),
    
    md("## Step 2: Load Dataset from Cache"),
    code([
        "import os",
        "import numpy as np",
        "import cv2",
        "import tensorflow as tf",
        "from tensorflow.keras import layers, models, callbacks, optimizers, losses",
        "from sklearn.model_selection import GroupShuffleSplit",
        "import matplotlib.pyplot as plt",
        "",
        "# Path to the uploaded NPZ file in your Google Drive",
        "CACHE_PATH = '/content/drive/MyDrive/io_dataset_cache.npz'",
        "",
        "if not os.path.exists(CACHE_PATH):",
        "    raise FileNotFoundError(f\"Could not find {CACHE_PATH} in your Drive! Please upload it.\")",
        "",
        "print('Loading dataset into RAM... (this takes a few seconds)')",
        "cache = np.load(CACHE_PATH, allow_pickle=True)",
        "X = cache['X']",
        "y = cache['y']",
        "storm_ids = cache['storm_ids']",
        "",
        "print(f\"X shape: {X.shape}, dtype: {X.dtype}\")",
        "print(f\"y shape: {y.shape}, dtype: {y.dtype}\")",
        "print(f\"Total unique storms: {len(np.unique(storm_ids))}\")",
    ]),
    
    md("## Step 3: Storm-Level Train/Val/Test Split"),
    code([
        "# We MUST split by storm_id to prevent data leakage (frames from the same storm shouldn't be in both train and val)",
        "gss1 = GroupShuffleSplit(n_splits=1, test_size=0.20, random_state=42)",
        "train_idx, temp_idx = next(gss1.split(X, y, groups=storm_ids))",
        "",
        "gss2 = GroupShuffleSplit(n_splits=1, test_size=0.50, random_state=42)",
        "val_idx, test_idx = next(gss2.split(X[temp_idx], y[temp_idx], groups=storm_ids[temp_idx]))",
        "",
        "# Map temp indices back to original indices",
        "val_idx = temp_idx[val_idx]",
        "test_idx = temp_idx[test_idx]",
        "",
        "X_train, y_train = X[train_idx], y[train_idx]",
        "X_val, y_val = X[val_idx], y[val_idx]",
        "X_test, y_test = X[test_idx], y[test_idx]",
        "",
        "print(f\"Train frames: {len(X_train)} | Unique storms: {len(np.unique(storm_ids[train_idx]))}\")",
        "print(f\"Val frames:   {len(X_val)} | Unique storms: {len(np.unique(storm_ids[val_idx]))}\")",
        "print(f\"Test frames:  {len(X_test)} | Unique storms: {len(np.unique(storm_ids[test_idx]))}\")"
    ]),
    
    md("## Step 4: Data Generator with Augmentation"),
    code([
        "class IntensityDataGenerator(tf.keras.utils.Sequence):",
        "    def __init__(self, X, y, batch_size=32, augment=False, shuffle=True):",
        "        self.X = X",
        "        self.y = y",
        "        self.batch_size = batch_size",
        "        self.augment = augment",
        "        self.shuffle = shuffle",
        "        self.indices = np.arange(len(self.X))",
        "        self.rng = np.random.default_rng(42)",
        "        if self.shuffle:",
        "            self.rng.shuffle(self.indices)",
        "            ",
        "    def __len__(self):",
        "        return int(np.ceil(len(self.X) / self.batch_size))",
        "        ",
        "    def on_epoch_end(self):",
        "        if self.shuffle:",
        "            self.rng.shuffle(self.indices)",
        "            ",
        "    def __getitem__(self, idx):",
        "        batch_idx = self.indices[idx * self.batch_size : (idx + 1) * self.batch_size]",
        "        batch_x = self.X[batch_idx].copy()",
        "        batch_y = self.y[batch_idx].copy()",
        "        ",
        "        if self.augment:",
        "            batch_x = self._apply_augmentation(batch_x)",
        "        return batch_x, batch_y",
        "        ",
        "    def _apply_augmentation(self, batch_x):",
        "        augmented = np.empty_like(batch_x)",
        "        for i, img in enumerate(batch_x):",
        "            aug_img = img.copy()",
        "            if self.rng.random() > 0.5: aug_img = np.fliplr(aug_img)",
        "            if self.rng.random() > 0.5: aug_img = np.flipud(aug_img)",
        "            angle = self.rng.uniform(-15.0, 15.0)",
        "            h, w = aug_img.shape[:2]",
        "            M = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1.0)",
        "            aug_img = cv2.warpAffine(aug_img, M, (w, h), borderMode=cv2.BORDER_REFLECT)",
        "            augmented[i] = aug_img",
        "        return augmented",
        "",
        "train_gen = IntensityDataGenerator(X_train, y_train, batch_size=32, augment=True, shuffle=True)",
        "val_gen = IntensityDataGenerator(X_val, y_val, batch_size=32, augment=False, shuffle=False)",
        "test_gen = IntensityDataGenerator(X_test, y_test, batch_size=32, augment=False, shuffle=False)"
    ]),
    
    md("## Step 5: Load Existing Model or Create New One"),
    code([
        "import os",
        "OLD_MODEL_PATH = '/content/drive/MyDrive/cyclone_intensity.keras'",
        "",
        "if os.path.exists(OLD_MODEL_PATH):",
        "    print('Loading existing intensity model for fine-tuning...')",
        "    model = tf.keras.models.load_model(OLD_MODEL_PATH)",
        "    model.trainable = True",
        "else:",
        "    print('No existing model found. Creating a fresh EfficientNetB0 Regression model...')",
        "    base_model = tf.keras.applications.EfficientNetB0(weights='imagenet', include_top=False, input_shape=(224, 224, 3))",
        "    base_model.trainable = True",
        "    model = models.Sequential([",
        "        base_model,",
        "        layers.GlobalAveragePooling2D(),",
        "        layers.Dropout(0.3),",
        "        layers.Dense(128, activation='relu'),",
        "        layers.Dense(1, activation='linear') # Regression output (wind speed)",
        "    ])",
        "",
        "model.compile(",
        "    optimizer=optimizers.Adam(learning_rate=1e-5), # Use very small learning rate for fine-tuning",
        "    loss=losses.Huber(delta=2.0),",
        "    metrics=['mae', 'mse']",
        ")",
        "model.summary()"
    ]),
    
    md("## Step 6: Train the Model"),
    code([
        "DRIVE_SAVE_DIR = '/content/drive/MyDrive/CycloSafe_Models'",
        "os.makedirs(DRIVE_SAVE_DIR, exist_ok=True)",
        "BEST_MODEL_PATH = os.path.join(DRIVE_SAVE_DIR, 'cyclone_intensity.keras')",
        "",
        "# Custom Callback to save the model to Drive after EVERY epoch",
        "class SaveEveryEpoch(callbacks.Callback):",
        "    def on_epoch_end(self, epoch, logs=None):",
        "        latest_path = os.path.join(DRIVE_SAVE_DIR, 'latest_epoch_intensity_model.keras')",
        "        self.model.save(latest_path)",
        "        print(f'\\n[AutoSave] Intensity Model safely backed up to Drive as latest_epoch_intensity_model.keras')",
        "",
        "callbacks_list = [",
        "    callbacks.EarlyStopping(monitor='val_loss', patience=7, restore_best_weights=True, verbose=1),",
        "    callbacks.ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=3, min_lr=1e-6, verbose=1),",
        "    callbacks.ModelCheckpoint(filepath=BEST_MODEL_PATH, monitor='val_loss', save_best_only=True, verbose=1),",
        "    SaveEveryEpoch()",
        "]",
        "",
        "print(\"Starting training...\")",
        "history = model.fit(",
        "    train_gen,",
        "    validation_data=val_gen,",
        "    epochs=50,",
        "    callbacks=callbacks_list,",
        "    verbose=1",
        ")"
    ]),
    
    md("## Step 7: Evaluate & Plot Results"),
    code([
        "from sklearn.metrics import mean_absolute_error, r2_score",
        "",
        "print(\"Evaluating on Test Set...\")",
        "best_model = tf.keras.models.load_model(BEST_MODEL_PATH)",
        "test_results = best_model.evaluate(test_gen, verbose=1)",
        "print(f\"Test Loss: {test_results[0]:.4f} | Test MAE: {test_results[1]:.2f} knots\")",
        "",
        "# Predict on Test Set",
        "y_pred = best_model.predict(test_gen, verbose=1).flatten()",
        "y_true = y_test",
        "",
        "r2 = r2_score(y_true, y_pred)",
        "print(f\"R2 Score: {r2:.4f}\")",
        "",
        "# Scatter Plot: True vs Predicted",
        "plt.figure(figsize=(8, 8))",
        "plt.scatter(y_true, y_pred, alpha=0.5, color='royalblue')",
        "plt.plot([min(y_true), max(y_true)], [min(y_true), max(y_true)], 'r--', lw=2) # Perfect prediction line",
        "plt.xlabel(\"True Wind Speed (knots)\", fontsize=12)",
        "plt.ylabel(\"Predicted Wind Speed (knots)\", fontsize=12)",
        "plt.title(f\"Intensity Estimation (MAE: {test_results[1]:.2f} kt, R²: {r2:.2f})\", fontsize=14)",
        "plt.grid(True, linestyle='--', alpha=0.7)",
        "plt.savefig(os.path.join(DRIVE_SAVE_DIR, 'intensity_scatter_plot.png'))",
        "plt.show()"
    ]),
    
    md("## Step 8: Download Final Model"),
    code([
        "from google.colab import files",
        "files.download(BEST_MODEL_PATH)",
        "files.download(os.path.join(DRIVE_SAVE_DIR, 'intensity_scatter_plot.png'))"
    ])
]

notebook = {
    "cells": cells,
    "metadata": {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python", "version": "3.10.0"}
    },
    "nbformat": 4,
    "nbformat_minor": 4
}

with open(OUTPUT, 'w', encoding='utf-8') as f:
    json.dump(notebook, f, indent=1, ensure_ascii=False)

print(f"Intensity Notebook saved to: {OUTPUT}")
