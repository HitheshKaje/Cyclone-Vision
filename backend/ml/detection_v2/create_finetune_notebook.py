import json
import os

OUTPUT = r"d:\MainProjectMl\ProjectCode\backend\ml\detection_v2\FineTune_Sinkhole_3Epochs.ipynb"

def md(text):
    return {"cell_type": "markdown", "metadata": {}, "source": [text]}

def code(lines):
    return {"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": lines}

cells = [
    md("# CycloSafe - Ocean Sinkhole / Blue Hole Hard Negative Fine-Tuning (3 Quick Epochs)\n\nThis notebook generates **2,000 synthetic ocean sinkhole/whirlpool hard negatives** (dark eye surrounded by white ocean foam) and fine-tunes your `best_cyclone_detector_finalModel.keras` for 3 quick epochs to eliminate false positive cyclone detections on stock photos like `articleshow.png`."),
    
    md("## Cell 1: Mount Google Drive & Import Libraries"),
    code([
        "from google.colab import drive\n",
        "drive.mount('/content/drive')\n",
        "\n",
        "import os, cv2, zipfile, shutil, time, random\n",
        "import numpy as np\n",
        "import tensorflow as tf\n",
        "from tensorflow import keras\n",
        "from tensorflow.keras.preprocessing.image import ImageDataGenerator\n",
        "from tensorflow.keras import optimizers, callbacks\n",
        "\n",
        "print(f'TensorFlow Version: {tf.__version__}')\n",
        "print(f'GPU Available: {tf.config.list_physical_devices(\"GPU\")}')\n"
    ]),

    md("## Cell 2: Generate 2,000 Ocean Sinkhole Hard Negatives & Setup Fine-Tuning Dataset"),
    code([
        "# Target directories\n",
        "DATASET_DIR = '/content/dataset_v2'\n",
        "NO_CYCLONE_DIR = os.path.join(DATASET_DIR, 'No_Cyclone')\n",
        "CYCLONE_DIR = os.path.join(DATASET_DIR, 'Cyclone')\n",
        "\n",
        "os.makedirs(NO_CYCLONE_DIR, exist_ok=True)\n",
        "os.makedirs(CYCLONE_DIR, exist_ok=True)\n",
        "\n",
        "print('Generating 2,000 ocean sinkhole / whirlpool hard negative images...')\n",
        "num_generated = 0\n",
        "for i in range(2000):\n",
        "    # Create a 224x224 RGB ocean canvas\n",
        "    img = np.zeros((224, 224, 3), dtype=np.uint8)\n",
        "    \n",
        "    # Dark blue/cyan ocean background base\n",
        "    base_blue = random.randint(120, 190)\n",
        "    base_green = random.randint(60, 110)\n",
        "    base_red = random.randint(0, 30)\n",
        "    img[:, :] = [base_blue, base_green, base_red]\n",
        "    \n",
        "    # Random center position\n",
        "    cx = random.randint(90, 134)\n",
        "    cy = random.randint(90, 134)\n",
        "    \n",
        "    # Concentric sinkhole gradient (pitch dark center hole)\n",
        "    max_r = random.randint(60, 95)\n",
        "    hole_r = random.randint(15, 35)\n",
        "    \n",
        "    for r in range(max_r, 0, -2):\n",
        "        factor = (r / max_r) ** 0.8\n",
        "        color = (int(base_blue * factor), int(base_green * factor), int(base_red * factor))\n",
        "        cv2.circle(img, (cx, cy), r, color, -1)\n",
        "        \n",
        "    # Pitch dark sinkhole core\n",
        "    cv2.circle(img, (cx, cy), hole_r, (random.randint(5, 20), random.randint(5, 15), 0), -1)\n",
        "    \n",
        "    # Add concentric/spiral white foam rings\n",
        "    num_rings = random.randint(3, 7)\n",
        "    for _ in range(num_rings):\n",
        "        ring_r = random.randint(hole_r + 5, max_r + 15)\n",
        "        thickness = random.randint(2, 6)\n",
        "        foam_val = random.randint(200, 255)\n",
        "        cv2.circle(img, (cx, cy), ring_r, (foam_val, foam_val, foam_val), thickness)\n",
        "        \n",
        "    # Apply Gaussian blur for smooth natural water look\n",
        "    img = cv2.GaussianBlur(img, (7, 7), 0)\n",
        "    \n",
        "    filename = f'ocean_sinkhole_hard_neg_{i:04d}.png'\n",
        "    cv2.imwrite(os.path.join(NO_CYCLONE_DIR, filename), img)\n",
        "    num_generated += 1\n",
        "\n",
        "print(f'Successfully generated {num_generated:,} sinkhole hard negatives in No_Cyclone folder!')\n",
        "nc_count = len(os.listdir(NO_CYCLONE_DIR))\n",
        "c_count = len(os.listdir(CYCLONE_DIR))\n",
        "print(f'Current Dataset Counts -> No_Cyclone: {nc_count:,} | Cyclone: {c_count:,}')\n"
    ]),

    md("## Cell 3: Load Model & Fine-Tune for 3 Quick Epochs"),
    code([
        "MODEL_PATH = '/content/drive/MyDrive/best_cyclone_detector_finalModel.keras'\n",
        "if not os.path.exists(MODEL_PATH):\n",
        "    # Fallback check\n",
        "    MODEL_PATH = '/content/drive/MyDrive/best_cyclone_detector.keras'\n",
        "\n",
        "print(f'Loading existing model from: {MODEL_PATH}')\n",
        "model = tf.keras.models.load_model(MODEL_PATH)\n",
        "model.trainable = True\n",
        "\n",
        "# Build Data Generator with EfficientNet preprocess_input\n",
        "from tensorflow.keras.applications.efficientnet import preprocess_input\n",
        "train_datagen = ImageDataGenerator(\n",
        "    preprocessing_function=preprocess_input,\n",
        "    rotation_range=30,\n",
        "    width_shift_range=0.1,\n",
        "    height_shift_range=0.1,\n",
        "    horizontal_flip=True,\n",
        "    vertical_flip=True\n",
        ")\n",
        "\n",
        "train_gen = train_datagen.flow_from_directory(\n",
        "    DATASET_DIR,\n",
        "    target_size=(224, 224),\n",
        "    batch_size=64,\n",
        "    class_mode='binary',\n",
        "    shuffle=True\n",
        ")\n",
        "\n",
        "print(f'Class Indices: {train_gen.class_indices}')\n",
        "\n",
        "# Compile with small learning rate (1e-5) to preserve existing weights while suppressing false positives\n",
        "model.compile(\n",
        "    optimizer=optimizers.Adam(learning_rate=1e-5),\n",
        "    loss='binary_crossentropy',\n",
        "    metrics=['accuracy']\n",
        ")\n",
        "\n",
        "print('Starting 3 quick fine-tuning epochs...')\n",
        "t0 = time.time()\n",
        "history = model.fit(train_gen, epochs=3, verbose=1)\n",
        "print(f'Fine-tuning completed in {(time.time()-t0)/60:.2f} minutes!')\n"
    ]),

    md("## Cell 4: Save & Download Fine-Tuned Model"),
    code([
        "SAVE_PATH = '/content/drive/MyDrive/best_cyclone_detector_finalModel.keras'\n",
        "model.save(SAVE_PATH)\n",
        "print(f'Fine-tuned model successfully saved to Google Drive at: {SAVE_PATH}')\n",
        "\n",
        "from google.colab import files\n",
        "print('Downloading updated model to your local computer...')\n",
        "files.download(SAVE_PATH)\n"
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
