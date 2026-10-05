import json
import os

OUTPUT = r"d:\MainProjectMl\ProjectCode\backend\ml\detection_v2\CycloSafe_Finetuning_V3.ipynb"

def md(text):
    return {"cell_type": "markdown", "metadata": {}, "source": [text]}

def code(lines):
    return {"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": lines}

cells = [
    md("# CycloSafe - Model Fine-Tuning (V3 Dataset)\n## Continual Learning without Forgetting\n\n**Goal:** Load existing `cyclone_detector.keras`, freeze the core, and gently train it on the new 150k `dataset_v3` images to learn Hard Negatives (whirlpools, coasts) without forgetting Cyclones."),
    
    md("## Step 1: Mount Google Drive and Extract Dataset"),
    code(["from google.colab import drive\n", "drive.mount('/content/drive')\n"]),
    
    code([
        "import zipfile, os, json, time, random\n",
        "import numpy as np\n",
        "import tensorflow as tf\n",
        "from tensorflow import keras\n",
        "from tensorflow.keras import layers, models, callbacks, optimizers\n",
        "from tensorflow.keras.preprocessing.image import ImageDataGenerator\n",
        "import matplotlib.pyplot as plt\n",
        "\n",
        "print(f'TensorFlow: {tf.__version__}')\n",
        "print(f'GPU: {tf.config.list_physical_devices(\"GPU\")}')\n",
        "\n",
        "# Config\n",
        "DRIVE_SAVE_DIR = '/content/drive/MyDrive/CycloSafe_Models'\n",
        "BEST_MODEL_PATH = os.path.join(DRIVE_SAVE_DIR, 'best_finetuned_detector_v3.keras')\n",
        "os.makedirs(DRIVE_SAVE_DIR, exist_ok=True)\n",
        "\n",
        "IMG_SIZE = (224, 224)\n",
        "BATCH_SIZE = 64\n",
        "LEARNING_RATE = 1e-5 # Extremely small learning rate to prevent forgetting!\n",
        "SEED = 42\n",
    ]),
    
    code([
        "# Extract dataset\n",
        "EXTRACT_DIR = '/content/dataset_v3'\n",
        "DRIVE_ZIP = '/content/drive/MyDrive/dataset_v3.zip'\n",
        "LOCAL_ZIP = '/content/dataset_v3.zip'\n",
        "\n",
        "if not os.path.exists(os.path.join(EXTRACT_DIR, 'Cyclone')) or not os.path.exists(os.path.join(EXTRACT_DIR, 'No_Cyclone')):\n",
        "    if not os.path.exists(DRIVE_ZIP):\n",
        "        raise FileNotFoundError(f\"COULD NOT FIND {DRIVE_ZIP} IN YOUR DRIVE! Please upload it.\")\n",
        "    print(f'Copying zip from Drive to local Colab storage...')\n",
        "    import shutil\n",
        "    shutil.copy(DRIVE_ZIP, LOCAL_ZIP)\n",
        "    print(f'Extracting {LOCAL_ZIP}...')\n",
        "    with zipfile.ZipFile(LOCAL_ZIP, 'r') as zf:\n",
        "        zf.extractall(EXTRACT_DIR)\n",
        "    print('Cleaning up local zip...')\n",
        "    os.remove(LOCAL_ZIP)\n",
        "    print('Extraction complete!')\n",
        "else:\n",
        "    print('Dataset already perfectly extracted.')\n",
        "\n",
        "c_count = len(os.listdir(os.path.join(EXTRACT_DIR, 'Cyclone')))\n",
        "nc_count = len(os.listdir(os.path.join(EXTRACT_DIR, 'No_Cyclone')))\n",
        "print(f'Cyclone: {c_count:,} | No_Cyclone: {nc_count:,} | Total: {c_count+nc_count:,}')\n",
    ]),
    
    md("## Step 2: Create Train/Val/Test Split"),
    code([
        "SPLIT_DIR = '/content/dataset_split'\n",
        "\n",
        "def create_splits(src_dir, split_dir, val_ratio=0.15, test_ratio=0.10):\n",
        "    if os.path.exists(os.path.join(split_dir, 'train', 'Cyclone')):\n",
        "        print('Splits already exist.')\n",
        "        return\n",
        "    for split in ['train', 'val', 'test']:\n",
        "        for cls in ['Cyclone', 'No_Cyclone']:\n",
        "            os.makedirs(os.path.join(split_dir, split, cls), exist_ok=True)\n",
        "    for cls in ['Cyclone', 'No_Cyclone']:\n",
        "        cls_dir = os.path.join(src_dir, cls)\n",
        "        files = [f for f in os.listdir(cls_dir) if f.endswith(('.jpg','.jpeg','.png'))]\n",
        "        random.seed(SEED)\n",
        "        random.shuffle(files)\n",
        "        n = len(files)\n",
        "        n_test = int(n * test_ratio)\n",
        "        n_val = int(n * val_ratio)\n",
        "        n_train = n - n_test - n_val\n",
        "        splits = {'train': files[:n_train], 'val': files[n_train:n_train+n_val], 'test': files[n_train+n_val:]}\n",
        "        for sname, sfiles in splits.items():\n",
        "            dest = os.path.join(split_dir, sname, cls)\n",
        "            for f in sfiles:\n",
        "                os.symlink(os.path.join(cls_dir, f), os.path.join(dest, f))\n",
        "\n",
        "print('Creating splits...')\n",
        "create_splits(EXTRACT_DIR, SPLIT_DIR)\n",
        "print('Done!')\n",
    ]),
    
    md("## Step 3: Build Data Generators"),
    code([
        "train_datagen = ImageDataGenerator(\n",
        "    rescale=1.0/255.0, rotation_range=30, width_shift_range=0.15,\n",
        "    height_shift_range=0.15, shear_range=0.1, zoom_range=0.2,\n",
        "    horizontal_flip=True, vertical_flip=True, brightness_range=[0.8, 1.2],\n",
        "    fill_mode='nearest'\n",
        ")\n",
        "val_test_datagen = ImageDataGenerator(rescale=1.0/255.0)\n",
        "\n",
        "train_gen = train_datagen.flow_from_directory(os.path.join(SPLIT_DIR,'train'), target_size=IMG_SIZE, batch_size=BATCH_SIZE, class_mode='binary', shuffle=True, seed=SEED)\n",
        "val_gen = val_test_datagen.flow_from_directory(os.path.join(SPLIT_DIR,'val'), target_size=IMG_SIZE, batch_size=BATCH_SIZE, class_mode='binary', shuffle=False)\n",
        "test_gen = val_test_datagen.flow_from_directory(os.path.join(SPLIT_DIR,'test'), target_size=IMG_SIZE, batch_size=BATCH_SIZE, class_mode='binary', shuffle=False)\n",
    ]),
    
    md("## Step 4: LOAD EXISTING MODEL & SETUP Auto-Save"),
    code([
        "OLD_MODEL_PATH = '/content/drive/MyDrive/cyclone_detector.keras'\n",
        "if not os.path.exists(OLD_MODEL_PATH):\n",
        "    raise FileNotFoundError(f\"Could not find {OLD_MODEL_PATH}! Please make sure your old model is uploaded there.\")\n",
        "\n",
        "print('Loading existing model to gain MORE knowledge...')\n",
        "model = keras.models.load_model(OLD_MODEL_PATH)\n",
        "\n",
        "# Auto-save callback - saves EVERY epoch to Drive so we don't lose progress\n",
        "class DriveAutoSave(callbacks.Callback):\n",
        "    def __init__(self):\n",
        "        self.best_val_acc = 0.0\n",
        "    def on_epoch_end(self, epoch, logs=None):\n",
        "        val_acc = float(logs.get('val_accuracy', 0))\n",
        "        # Save backup\n",
        "        model.save(os.path.join(DRIVE_SAVE_DIR, 'latest_finetune_backup.keras'))\n",
        "        if val_acc > self.best_val_acc:\n",
        "            self.best_val_acc = val_acc\n",
        "            model.save(BEST_MODEL_PATH)\n",
        "            print(f'  --> [AutoSave] NEW BEST MODEL saved to Drive! (val_acc: {val_acc:.4f})')\n",
        "        else:\n",
        "            print(f'  --> [AutoSave] Backup saved to Drive. (val_acc: {val_acc:.4f})')\n",
    ]),
    
    md("## Step 5: Fine-Tuning Phase"),
    code([
        "print(\"Compiling with a very low learning rate (1e-5) to prevent catastrophic forgetting...\")\n",
        "model.compile(optimizer=optimizers.Adam(learning_rate=LEARNING_RATE), loss='binary_crossentropy', metrics=['accuracy', tf.keras.metrics.AUC(name='auc')])\n",
        "\n",
        "cbs = [\n",
        "    callbacks.EarlyStopping(monitor='val_loss', patience=4, restore_best_weights=True, verbose=1),\n",
        "    callbacks.ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=2, min_lr=1e-7, verbose=1),\n",
        "    DriveAutoSave(),\n",
        "]\n",
        "\n",
        "print('Starting Fine-Tuning...')\n",
        "EPOCHS = 15 # 15 epochs is plenty for fine-tuning\n",
        "history = model.fit(train_gen, epochs=EPOCHS, validation_data=val_gen, callbacks=cbs, verbose=1)\n",
    ]),
    
    md("## Step 6: Evaluate New Model on Test Set"),
    code([
        "from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score\n",
        "import seaborn as sns\n",
        "\n",
        "print('Loading the BEST model from this run...')\n",
        "best_model = keras.models.load_model(BEST_MODEL_PATH)\n",
        "test_loss, test_accuracy, test_auc = best_model.evaluate(test_gen, verbose=1)\n",
        "print(f'Test Accuracy: {test_accuracy*100:.2f}% | Test AUC: {test_auc:.4f}')\n",
        "\n",
        "test_gen.reset()\n",
        "y_pred_prob = best_model.predict(test_gen, verbose=1)\n",
        "y_pred = (y_pred_prob > 0.5).astype(int).flatten()\n",
        "y_true = test_gen.classes\n",
        "class_names = list(test_gen.class_indices.keys())\n",
        "\n",
        "print('\\nCLASSIFICATION REPORT')\n",
        "print(classification_report(y_true, y_pred, target_names=class_names, digits=4))\n",
    ]),
    
    md("## Step 7: Confusion Matrix"),
    code([
        "cm = confusion_matrix(y_true, y_pred)\n",
        "fig, ax = plt.subplots(figsize=(8, 6))\n",
        "sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=class_names, yticklabels=class_names, ax=ax)\n",
        "ax.set_title('Confusion Matrix - Finetuned Model', fontsize=14, fontweight='bold')\n",
        "ax.set_xlabel('Predicted'); ax.set_ylabel('Actual')\n",
        "plt.tight_layout()\n",
        "plt.savefig(os.path.join(DRIVE_SAVE_DIR, 'finetuned_confusion_matrix.png'), dpi=150)\n",
        "plt.show()\n",
    ]),
    
    md("## Step 8: Download Best Model"),
    code([
        "from google.colab import files\n",
        "files.download(BEST_MODEL_PATH)\n",
        "print('Done! Replace your old model with this new one.')\n",
    ]),
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

print(f"Finetuning Notebook saved to: {OUTPUT}")
