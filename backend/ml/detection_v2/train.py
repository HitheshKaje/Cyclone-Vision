import os
import json
import numpy as np
import tensorflow as tf
from tensorflow.keras.applications import EfficientNetV2B0
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout, Input
from tensorflow.keras.models import Model, load_model
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau
from tensorflow.keras.optimizers import Adam
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, roc_auc_score, average_precision_score, roc_curve
import matplotlib.pyplot as plt
import cv2
from collections import defaultdict
import glob

# Constants
IMG_SIZE = (224, 224)
BATCH_SIZE = 32
BASE_DIR = r"d:\MainProjectMl\ProjectCode\backend\ml"
DATASET_DIR = os.path.join(BASE_DIR, "dataset_v2")
MODELS_DIR = os.path.join(BASE_DIR, "models")
V1_MODEL_PATH = os.path.join(MODELS_DIR, "cyclone_detector.keras")
V2_MODEL_PATH = os.path.join(MODELS_DIR, "cyclone_detector_v2.keras")
CONFIG_PATH = os.path.join(MODELS_DIR, "detection_v2_config.json")

def get_event_id(filename, class_name):
    """Extracts a unique event/storm ID to prevent data leakage."""
    basename = os.path.basename(filename)
    if class_name == "Cyclone":
        if basename.startswith("cyclone_"):
            # Format: cyclone_Amphan_hash.jpg
            parts = basename.split('_')
            if len(parts) >= 3:
                return parts[1] # e.g., 'Amphan'
        # Old dataset format: 20001127.12-45.jpg -> use YearMonth
        if len(basename) >= 6 and basename[:6].isdigit():
            return basename[:6]
        return "unknown_cyclone"
    else:
        # No_Cyclone: random split is generally fine, but let's give every file a unique ID
        # so they get randomly distributed instead of grouped, OR we group by query
        if basename.startswith("nocyclone_"):
            # Format: nocyclone_clear_ocean_hash.jpg
            # To ensure stratified random split for no_cyclone, we can just return the filename itself
            # so each image is its own "event", and the splitter will distribute them.
            return basename
        # Old dataset format
        return basename

def prepare_data():
    """Loads file paths and splits them safely."""
    classes = ["No_Cyclone", "Cyclone"] # 0, 1
    events = defaultdict(list)
    
    for label, class_name in enumerate(classes):
        class_dir = os.path.join(DATASET_DIR, class_name)
        if not os.path.exists(class_dir):
            continue
        for fname in os.listdir(class_dir):
            if fname.lower().endswith(('.png', '.jpg', '.jpeg')):
                fpath = os.path.join(class_dir, fname)
                evt_id = get_event_id(fpath, class_name)
                # Key format: (class_label, evt_id)
                events[(label, evt_id)].append(fpath)
                
    # Now we have groups of images. We need to split groups into train/val/test
    # 70% / 15% / 15%
    train_paths, train_labels = [], []
    val_paths, val_labels = [], []
    test_paths, test_labels = [], []
    
    # We will split cyclones and no_cyclones separately to maintain class balance
    for label in [0, 1]:
        label_events = [k for k in events.keys() if k[0] == label]
        # Shuffle events
        np.random.seed(42)
        np.random.shuffle(label_events)
        
        # Calculate target counts
        total_images = sum(len(events[k]) for k in label_events)
        train_target = int(0.70 * total_images)
        val_target = int(0.15 * total_images)
        
        train_cnt = 0
        val_cnt = 0
        
        for k in label_events:
            group = events[k]
            if train_cnt < train_target:
                train_paths.extend(group)
                train_labels.extend([label]*len(group))
                train_cnt += len(group)
            elif val_cnt < val_target:
                val_paths.extend(group)
                val_labels.extend([label]*len(group))
                val_cnt += len(group)
            else:
                test_paths.extend(group)
                test_labels.extend([label]*len(group))

    print(f"TRAIN: Cyclone = {train_labels.count(1)}, No_Cyclone = {train_labels.count(0)}")
    print(f"VALIDATION: Cyclone = {val_labels.count(1)}, No_Cyclone = {val_labels.count(0)}")
    print(f"TEST: Cyclone = {test_labels.count(1)}, No_Cyclone = {test_labels.count(0)}")
    
    return (train_paths, train_labels), (val_paths, val_labels), (test_paths, test_labels)

class DataGenerator(tf.keras.utils.Sequence):
    def __init__(self, paths, labels, batch_size=32, augment=False, shuffle=True):
        self.paths = paths
        self.labels = labels
        self.batch_size = batch_size
        self.augment = augment
        self.shuffle = shuffle
        self.indexes = np.arange(len(self.paths))
        if self.shuffle:
            np.random.shuffle(self.indexes)
            
        self.aug_model = None
        if self.augment:
            self.aug_model = tf.keras.Sequential([
                tf.keras.layers.RandomFlip("horizontal_and_vertical"),
                tf.keras.layers.RandomRotation(0.2),
                tf.keras.layers.RandomZoom(0.1)
            ])

    def __len__(self):
        return int(np.ceil(len(self.paths) / self.batch_size))

    def on_epoch_end(self):
        if self.shuffle:
            np.random.shuffle(self.indexes)

    def __getitem__(self, index):
        batch_indexes = self.indexes[index * self.batch_size:(index + 1) * self.batch_size]
        batch_paths = [self.paths[k] for k in batch_indexes]
        batch_labels = [self.labels[k] for k in batch_indexes]

        X = np.empty((len(batch_paths), *IMG_SIZE, 3), dtype=np.float32)
        for i, p in enumerate(batch_paths):
            img = cv2.imread(p)
            if img is None: continue
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            img = cv2.resize(img, IMG_SIZE)
            X[i,] = img
            
        y = np.array(batch_labels, dtype=np.float32)
        
        # We don't scale by 255 because EfficientNetV2B0 expects inputs in [0, 255]
        # and has a built-in preprocessing layer.
        
        if self.augment:
            X = self.aug_model(X, training=True)
            X = X.numpy()

        return X, y

def build_model():
    base_model = EfficientNetV2B0(weights='imagenet', include_top=False, input_shape=(*IMG_SIZE, 3))
    base_model.trainable = False # Stage 1
    
    inputs = Input(shape=(*IMG_SIZE, 3))
    x = base_model(inputs, training=False)
    x = GlobalAveragePooling2D()(x)
    x = Dropout(0.3)(x)
    outputs = Dense(1, activation='sigmoid')(x)
    
    model = Model(inputs, outputs)
    return model, base_model

def get_metrics(y_true, y_pred, y_prob):
    return {
        "Accuracy": accuracy_score(y_true, y_pred),
        "Precision": precision_score(y_true, y_pred, zero_division=0),
        "Recall": recall_score(y_true, y_pred, zero_division=0),
        "F1": f1_score(y_true, y_pred, zero_division=0),
        "ROC_AUC": roc_auc_score(y_true, y_prob),
        "PR_AUC": average_precision_score(y_true, y_prob),
        "CM": confusion_matrix(y_true, y_pred).tolist()
    }

def main():
    print("Preparing Dataset splits...")
    train_data, val_data, test_data = prepare_data()
    
    train_gen = DataGenerator(train_data[0], train_data[1], batch_size=BATCH_SIZE, augment=True, shuffle=True)
    val_gen = DataGenerator(val_data[0], val_data[1], batch_size=BATCH_SIZE, augment=False, shuffle=False)
    test_gen = DataGenerator(test_data[0], test_data[1], batch_size=BATCH_SIZE, augment=False, shuffle=False)
    
    model, base_model = build_model()
    
    # Calculate class weights
    total = len(train_data[1])
    pos = sum(train_data[1])
    neg = total - pos
    weight_for_0 = (1 / neg) * (total / 2.0)
    weight_for_1 = (1 / pos) * (total / 2.0)
    class_weight = {0: weight_for_0, 1: weight_for_1}
    print(f"Class Weights: {class_weight}")
    
    print("--- STAGE 1: Training Head ---")
    model.compile(optimizer=Adam(1e-3), loss='binary_crossentropy', metrics=['accuracy'])
    
    es1 = EarlyStopping(monitor='val_loss', patience=3, restore_best_weights=True)
    model.fit(train_gen, validation_data=val_gen, epochs=10, callbacks=[es1], class_weight=class_weight)
    
    print("--- STAGE 2: Fine-tuning Backbone ---")
    base_model.trainable = True
    # Unfreeze top layers only
    for layer in base_model.layers[:-30]:
        layer.trainable = False
        
    model.compile(optimizer=Adam(1e-5), loss='binary_crossentropy', metrics=['accuracy'])
    
    es2 = EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)
    mc = ModelCheckpoint(V2_MODEL_PATH, monitor='val_loss', save_best_only=True)
    rlr = ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=2, min_lr=1e-7)
    
    model.fit(train_gen, validation_data=val_gen, epochs=20, callbacks=[es2, mc, rlr], class_weight=class_weight)
    
    print("--- EVALUATION ---")
    # Load best model
    model = load_model(V2_MODEL_PATH)
    
    # Predict on Validation for threshold tuning
    print("Tuning threshold on Validation set...")
    val_probs = model.predict(val_gen).flatten()
    val_true = np.array(val_data[1])
    fpr, tpr, thresholds = roc_curve(val_true, val_probs)
    # Find optimal threshold: max tpr - fpr (Youden's J statistic)
    optimal_idx = np.argmax(tpr - fpr)
    optimal_threshold = thresholds[optimal_idx]
    # Ensure it's not extreme
    if optimal_threshold < 0.2 or optimal_threshold > 0.8:
        optimal_threshold = 0.5
    print(f"Selected Threshold: {optimal_threshold}")
    
    # Evaluate V2 on TEST
    print("Evaluating V2 on Test set...")
    test_probs_v2 = model.predict(test_gen).flatten()
    test_true = np.array(test_data[1])
    test_pred_v2 = (test_probs_v2 >= optimal_threshold).astype(int)
    
    v2_metrics = get_metrics(test_true, test_pred_v2, test_probs_v2)
    
    # Evaluate V1 on TEST
    v1_metrics = {}
    if os.path.exists(V1_MODEL_PATH):
        print("Evaluating V1 on Test set...")
        try:
            model_v1 = load_model(V1_MODEL_PATH)
            # V1 is EfficientNetB0, inputs might need standard scaling if not built-in?
            # V1 used raw (0-255) as per its train script.
            test_probs_v1 = model_v1.predict(test_gen).flatten()
            test_pred_v1 = (test_probs_v1 >= 0.5).astype(int)
            v1_metrics = get_metrics(test_true, test_pred_v1, test_probs_v1)
        except Exception as e:
            print(f"Could not load/eval V1 model: {e}")
            
    # Calculate FP and FN explicitly
    cm_v2 = v2_metrics["CM"]
    tn2, fp2, fn2, tp2 = cm_v2[0][0], cm_v2[0][1], cm_v2[1][0], cm_v2[1][1]
    
    print("\n================ FINAL COMPARISON ================")
    if v1_metrics:
        cm_v1 = v1_metrics["CM"]
        tn1, fp1, fn1, tp1 = cm_v1[0][0], cm_v1[0][1], cm_v1[1][0], cm_v1[1][1]
        print("V1:")
        print(f"  Accuracy:  {v1_metrics['Accuracy']:.4f}")
        print(f"  Precision: {v1_metrics['Precision']:.4f}")
        print(f"  Recall:    {v1_metrics['Recall']:.4f}")
        print(f"  F1:        {v1_metrics['F1']:.4f}")
        print(f"  FP:        {fp1} (False Positive Rate: {fp1/(fp1+tn1):.4f})")
        print(f"  FN:        {fn1} (False Negative Rate: {fn1/(fn1+tp1):.4f})")
        print()
        
    print("V2:")
    print(f"  Accuracy:  {v2_metrics['Accuracy']:.4f}")
    print(f"  Precision: {v2_metrics['Precision']:.4f}")
    print(f"  Recall:    {v2_metrics['Recall']:.4f}")
    print(f"  F1:        {v2_metrics['F1']:.4f}")
    print(f"  FP:        {fp2} (False Positive Rate: {fp2/(fp2+tn2):.4f})")
    print(f"  FN:        {fn2} (False Negative Rate: {fn2/(fn2+tp2):.4f})")
    
    # Save Config
    config = {
        "input_size": list(IMG_SIZE) + [3],
        "class_names": ["No_Cyclone", "Cyclone"],
        "classification_threshold": float(optimal_threshold),
        "training_dataset_info": {
            "total_train": len(train_data[1]),
            "total_val": len(val_data[1]),
            "total_test": len(test_data[1]),
        },
        "model_architecture": "EfficientNetV2B0",
        "preprocessing": "Input normalized internally by EfficientNetV2B0 (expects 0-255 RGB)"
    }
    with open(CONFIG_PATH, 'w') as f:
        json.dump(config, f, indent=4)
        
    print(f"\nModel saved to {V2_MODEL_PATH}")
    print(f"Config saved to {CONFIG_PATH}")

if __name__ == "__main__":
    main()
