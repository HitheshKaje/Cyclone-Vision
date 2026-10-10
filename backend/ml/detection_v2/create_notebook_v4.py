import json
import os

OUTPUT = r"d:\MainProjectMl\ProjectCode\backend\ml\detection_v2\CycloSafe_Detection_Training_V4_HardNegatives.ipynb"

def md(text):
    return {"cell_type": "markdown", "metadata": {}, "source": [text]}

def code(lines):
    return {"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": lines}

cells = [
    md("# CycloSafe - Cyclone Detection Retraining & Fine-Tuning (V4)\n\n**Goal:** Fine-tune `best_cyclone_detector_finalModel.keras` on 160,000+ images (65k Cyclones + 85k No_Cyclones + 5k Synthetic Hard Negatives of Teacups, Sinkholes, Galaxies, and Land Cloud Vortices) so the AI model natively learns to suppress false positives on external non-satellite images."),

    md("## Step 1: Mount Google Drive & Import Libraries"),
    code([
        "from google.colab import drive\n",
        "drive.mount('/content/drive')\n",
        "\n",
        "import os, cv2, zipfile, shutil, time, random\n",
        "import numpy as np\n",
        "import tensorflow as tf\n",
        "from tensorflow import keras\n",
        "from tensorflow.keras.preprocessing.image import ImageDataGenerator\n",
        "from tensorflow.keras import layers, models, callbacks, optimizers\n",
        "import matplotlib.pyplot as plt\n",
        "\n",
        "print(f'TensorFlow Version: {tf.__version__}')\n",
        "print(f'GPU Available: {tf.config.list_physical_devices(\"GPU\")}')\n",
        "\n",
        "# Config\n",
        "DRIVE_SAVE_DIR = '/content/drive/MyDrive/CycloSafe_Models'\n",
        "BEST_MODEL_PATH = os.path.join(DRIVE_SAVE_DIR, 'best_cyclone_detector_v4.keras')\n",
        "os.makedirs(DRIVE_SAVE_DIR, exist_ok=True)\n",
        "\n",
        "IMG_SIZE = (224, 224)\n",
        "BATCH_SIZE = 64\n",
        "SEED = 42\n"
    ]),

    md("## Step 2: Extract 150k Dataset Partitions"),
    code([
        "EXTRACT_DIR = '/content/dataset_v4'\n",
        "DRIVE_ZIPS = [\n",
        "    '/content/drive/MyDrive/dataset_part1_65k_cyclone.zip',\n",
        "    '/content/drive/MyDrive/dataset_part2_85k_nocyclone.zip'\n",
        "]\n",
        "\n",
        "# Extract if not present\n",
        "if not os.path.exists(os.path.join(EXTRACT_DIR, 'Cyclone')) or not os.path.exists(os.path.join(EXTRACT_DIR, 'No_Cyclone')):\n",
        "    print('Extracting dataset partitions from Google Drive...')\n",
        "    os.makedirs(EXTRACT_DIR, exist_ok=True)\n",
        "    for drive_zip in DRIVE_ZIPS:\
        "        if os.path.exists(drive_zip):\n",
        "            local_zip = f'/content/{os.path.basename(drive_zip)}'\n",
        "            print(f'Copying {drive_zip} to local Colab NVMe storage...')\n",
        "            shutil.copy(drive_zip, local_zip)\n",
        "            print(f'Extracting {local_zip}...')\n",
        "            with zipfile.ZipFile(local_zip, 'r') as zf:\n",
        "                zf.extractall(EXTRACT_DIR)\n",
        "            os.remove(local_zip)\n",
        "            print(f'Finished extracting {drive_zip}!')\n",
        "else:\n",
        "    print('Dataset already extracted in Colab!')\n"
    ]),

    md("## Step 3: Generate 5,000 Hard Negative Synthetic Samples (Teacups, Sinkholes, Galaxies)"),
    code([
        "NO_CYCLONE_DIR = os.path.join(EXTRACT_DIR, 'No_Cyclone')\n",
        "CYCLONE_DIR = os.path.join(EXTRACT_DIR, 'Cyclone')\n",
        "os.makedirs(NO_CYCLONE_DIR, exist_ok=True)\n",
        "os.makedirs(CYCLONE_DIR, exist_ok=True)\n",
        "\n",
        "print('Generating 5,000 Synthetic Hard Negatives (Teacups, Sinkholes, Black Holes)...')\n",
        "generated_count = 0\n",
        "for i in range(5000):\n",
        "    img = np.zeros((224, 224, 3), dtype=np.uint8)\n",
        "    hard_type = i % 3\n",
        "    \n",
        "    if hard_type == 0:  # Teacup / Latte Art\n",
        "        # Warm amber/brown beverage with spiral foam\n",
        "        img[:, :] = [random.randint(10, 40), random.randint(80, 140), random.randint(160, 220)]\n",
        "        # White ceramic cup border\n",
        "        cv2.circle(img, (112, 112), 95, (230, 230, 230), 10)\n",
        "        # Spiral foam\n",
        "        for r in range(10, 85, 8):\n",
        "            cv2.circle(img, (112, 112), r, (random.randint(200, 240), random.randint(210, 250), random.randint(220, 255)), 3)\n",
        "            \n",
        "    elif hard_type == 1:  # Ocean Sinkhole / Blue Hole\n",
        "        # Deep ocean blue background\n",
        "        img[:, :] = [random.randint(140, 200), random.randint(70, 110), random.randint(0, 30)]\n",
        "        # Concentric dark blue hole\n",
        "        for r in range(80, 0, -2):\n",
        "            cv2.circle(img, (112, 112), r, (int(180 * r / 80), int(90 * r / 80), 0), -1)\n",
        "            \n",
        "    else:  # Black Hole / Galaxy\n",
        "        # Pitch black space background with star field\n",
        "        img[:, :] = [0, 0, 0]\n",
        "        for _ in range(150):\n",
        "            sx, sy = random.randint(0, 223), random.randint(0, 223)\n",
        "            img[sy, sx] = [random.randint(180, 255), random.randint(180, 255), random.randint(180, 255)]\n",
        "        # Accretion disk & central void\n",
        "        for r in range(35, 75):\n",
        "            cv2.circle(img, (112, 112), r, (random.randint(80, 150), random.randint(100, 180), random.randint(180, 250)), 2)\n",
        "        cv2.circle(img, (112, 112), 30, (0, 0, 0), -1)\n",
        "        \n",
        "    img = cv2.GaussianBlur(img, (5, 5), 0)\n",
        "    cv2.imwrite(os.path.join(NO_CYCLONE_DIR, f'hard_neg_v4_{i:04d}.png'), img)\n",
        "    generated_count += 1\n",
        "\n",
        "c_count = len(os.listdir(CYCLONE_DIR))\n",
        "nc_count = len(os.listdir(NO_CYCLONE_DIR))\n",
        "print(f'Hard Negatives Injected! Total Dataset Counts -> No_Cyclone: {nc_count:,} | Cyclone: {c_count:,}')\n"
    ]),

    md("## Step 4: Load Model & Fine-Tune (5–10 Epochs)"),
    code([
        "MODEL_PATH = '/content/drive/MyDrive/best_cyclone_detector_finalModel.keras'\n",
        "if not os.path.exists(MODEL_PATH):\n",
        "    MODEL_PATH = '/content/drive/MyDrive/best_cyclone_detector.keras'\n",
        "\n",
        "print(f'Loading existing model from: {MODEL_PATH}')\n",
        "model = tf.keras.models.load_model(MODEL_PATH)\n",
        "model.trainable = True\n",
        "\n",
        "from tensorflow.keras.applications.efficientnet import preprocess_input\n",
        "train_datagen = ImageDataGenerator(\n",
        "    preprocessing_function=preprocess_input,\n",
        "    rotation_range=30,\n",
        "    width_shift_range=0.15,\n",
        "    height_shift_range=0.15,\n",
        "    zoom_range=0.15,\n",
        "    horizontal_flip=True,\n",
        "    vertical_flip=True,\n",
        "    validation_split=0.15\n",
        ")\n",
        "\n",
        "train_gen = train_datagen.flow_from_directory(\n",
        "    EXTRACT_DIR,\n",
        "    target_size=IMG_SIZE,\n",
        "    batch_size=BATCH_SIZE,\n",
        "    class_mode='binary',\n",
        "    subset='training',\n",
        "    shuffle=True,\n",
        "    seed=SEED\n",
        ")\n",
        "\n",
        "val_gen = train_datagen.flow_from_directory(\n",
        "    EXTRACT_DIR,\n",
        "    target_size=IMG_SIZE,\n",
        "    batch_size=BATCH_SIZE,\n",
        "    class_mode='binary',\n",
        "    subset='validation',\n",
        "    shuffle=False,\n",
        "    seed=SEED\n",
        ")\n",
        "\n",
        "class SaveEveryEpoch(callbacks.Callback):\n",
        "    def on_epoch_end(self, epoch, logs=None):\n",
        "        latest_path = os.path.join(DRIVE_SAVE_DIR, 'best_cyclone_detector_finalModel.keras')\n",
        "        self.model.save(latest_path)\n",
        "        print(f'\\n[AutoSave] Model updated on Google Drive as best_cyclone_detector_finalModel.keras')\n",
        "\n",
        "model.compile(\n",
        "    optimizer=optimizers.Adam(learning_rate=1e-5),\n",
        "    loss='binary_crossentropy',\n",
        "    metrics=['accuracy', tf.keras.metrics.AUC(name='auc')]\n",
        ")\n",
        "\n",
        "callbacks_list = [\n",
        "    callbacks.EarlyStopping(monitor='val_loss', patience=3, restore_best_weights=True, verbose=1),\n",
        "    callbacks.ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=2, min_lr=1e-7, verbose=1),\n",
        "    callbacks.ModelCheckpoint(filepath=BEST_MODEL_PATH, monitor='val_loss', save_best_only=True, verbose=1),\n",
        "    SaveEveryEpoch()\n",
        "]\n",
        "\n",
        "EPOCHS = 8\n",
        "print(f'Starting fine-tuning for {EPOCHS} epochs...')\n",
        "t0 = time.time()\n",
        "history = model.fit(train_gen, epochs=EPOCHS, validation_data=val_gen, callbacks=callbacks_list, verbose=1)\n",
        "print(f'Retraining completed in {(time.time()-t0)/60:.2f} minutes!')\n"
    ]),

    md("## Step 5: Save & Download Final Model"),
    code([
        "FINAL_SAVE_PATH = '/content/drive/MyDrive/best_cyclone_detector_finalModel.keras'\n",
        "model.save(FINAL_SAVE_PATH)\n",
        "print(f'Final retrained model saved to Google Drive: {FINAL_SAVE_PATH}')\n",
        "\n",
        "from google.colab import files\n",
        "print('Downloading updated model to your local computer...')\n",
        "files.download(FINAL_SAVE_PATH)\n"
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

print(f"Notebook generated at: {OUTPUT}")
