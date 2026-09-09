import os
import cv2
import numpy as np
from sklearn.model_selection import train_test_split

IMG_SIZE = (224, 224)

def load_and_preprocess_image(img_path):
    try:
        # Read image
        img = cv2.imread(img_path)
        if img is None:
            return None
            
        # Resize image
        img = cv2.resize(img, IMG_SIZE)
        
        # Convert to RGB (handles grayscale correctly as cv2.imread loads it as BGR)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        return img
    except Exception as e:
        print(f"Error loading {img_path}: {e}")
        return None

def load_dataset(dataset_dir):
    X = []
    y = []
    classes = ['No_Cyclone', 'Cyclone']
    
    for class_idx, class_name in enumerate(classes):
        class_dir = os.path.join(dataset_dir, class_name)
        if not os.path.exists(class_dir):
            print(f"Warning: Directory not found - {class_dir}")
            continue
            
        for img_name in os.listdir(class_dir):
            img_path = os.path.join(class_dir, img_name)
            if not img_path.lower().endswith(('.png', '.jpg', '.jpeg', '.tiff', '.tif')):
                continue
                
            img_data = load_and_preprocess_image(img_path)
            if img_data is not None:
                X.append(img_data)
                y.append(class_idx)
                
    return np.array(X), np.array(y), classes

def prepare_data(dataset_dir, random_state=42):
    X, y, classes = load_dataset(dataset_dir)
    
    if len(X) == 0:
        raise ValueError("No valid images found.")
        
    print(f"Total valid images loaded: {len(X)}")
    
    # Exact sizes requested
    test_size = 236
    val_size = 118
    
    # Split Test
    X_train_val, X_test, y_train_val, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, stratify=y
    )
    
    # Split Val
    X_train, X_val, y_train, y_val = train_test_split(
        X_train_val, y_train_val, test_size=val_size, random_state=random_state, stratify=y_train_val
    )
    
    # Verify counts
    unique_train, counts_train = np.unique(y_train, return_counts=True)
    unique_val, counts_val = np.unique(y_val, return_counts=True)
    unique_test, counts_test = np.unique(y_test, return_counts=True)
    
    print("\nActual Split Counts:")
    print(f"Train (Total: {len(X_train)}): No_Cyclone={counts_train[0]}, Cyclone={counts_train[1]}")
    print(f"Validation (Total: {len(X_val)}): No_Cyclone={counts_val[0]}, Cyclone={counts_val[1]}")
    print(f"Test (Total: {len(X_test)}): No_Cyclone={counts_test[0]}, Cyclone={counts_test[1]}")
    print("Warning: Random image-level splitting may have temporal/event leakage because sequential observations from the same cyclone can occur in different splits.\n")

    return (X_train, y_train), (X_val, y_val), (X_test, y_test), classes
