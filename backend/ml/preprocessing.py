import os
import cv2
import numpy as np
from sklearn.model_selection import train_test_split
from tensorflow.keras.utils import to_categorical

# Config for EfficientNetB0
IMG_SIZE = (224, 224)

def load_and_preprocess_image(img_path):
    """Loads an image, resizes, and preprocesses it."""
    try:
        # Read image
        img = cv2.imread(img_path)
        if img is None:
            return None
            
        # Resize image for EfficientNetB0 (224x224)
        img = cv2.resize(img, IMG_SIZE)
        
        # Convert BGR (OpenCV) to RGB
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # EfficientNetB0 expects inputs in [0, 255], and handles scaling internally via keras.applications.efficientnet.preprocess_input
        # However, it's safer to pass it raw if using tf.keras.applications.EfficientNetB0 (it has a built-in normalization layer)
        # So we just return the numpy array
        return img
    except Exception as e:
        print(f"Error loading {img_path}: {e}")
        return None

def load_dataset(dataset_dir):
    """
    Loads dataset from directory. Assumes structure:
    dataset_dir/
      Cyclone/
      No_Cyclone/
    """
    X = []
    y = []
    
    classes = ['No_Cyclone', 'Cyclone'] # 0: No Cyclone, 1: Cyclone
    
    for class_idx, class_name in enumerate(classes):
        class_dir = os.path.join(dataset_dir, class_name)
        
        if not os.path.exists(class_dir):
            print(f"Warning: Directory not found - {class_dir}")
            continue
            
        for img_name in os.listdir(class_dir):
            img_path = os.path.join(class_dir, img_name)
            
            # Simple check for image extension
            if not img_path.lower().endswith(('.png', '.jpg', '.jpeg', '.tiff', '.tif')):
                continue
                
            img_data = load_and_preprocess_image(img_path)
            if img_data is not None:
                X.append(img_data)
                y.append(class_idx)
                
    X = np.array(X)
    y = np.array(y)
    
    return X, y, classes

def prepare_data(dataset_dir, test_size=0.2, val_size=0.1, random_state=42):
    """
    Loads data and splits it into train, val, and test sets.
    """
    X, y, classes = load_dataset(dataset_dir)
    
    if len(X) == 0:
        raise ValueError("No valid images found in the dataset directory.")
        
    print(f"Total valid images loaded: {len(X)}")
    
    # Split into train+val and test
    X_train_val, X_test, y_train_val, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, stratify=y
    )
    
    # Split train+val into train and val
    # To get `val_size` of original data from `train_val`, compute relative proportion
    val_prop = val_size / (1.0 - test_size)
    X_train, X_val, y_train, y_val = train_test_split(
        X_train_val, y_train_val, test_size=val_prop, random_state=random_state, stratify=y_train_val
    )
    
    print(f"Train samples: {len(X_train)}")
    print(f"Validation samples: {len(X_val)}")
    print(f"Test samples: {len(X_test)}")
    
    return (X_train, y_train), (X_val, y_val), (X_test, y_test), classes
