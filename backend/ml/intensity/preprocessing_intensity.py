import os
import cv2
import h5py
import numpy as np
import tensorflow as tf
from utils import load_info_dataframe, get_storm_level_split, DEFAULT_H5_PATH

TARGET_IMG_SIZE = (224, 224)

# IR1 standard brightness temperature normalization parameters (Kelvin)
# Typical IR1 brightness temp for tropical cyclones ranges from ~180K (deep convection) to ~310K (warm sea/land)
IR_MIN_KELVIN = 180.0
IR_MAX_KELVIN = 310.0

def normalize_ir_frame(ir_channel):
    """
    Normalize IR1 channel array (in Kelvin) into [0, 1] range.
    Handles NaNs by filling with ambient background temperature (300K).
    """
    ir = np.copy(ir_channel)
    # Replace NaNs with ambient temperature
    ir[np.isnan(ir)] = 300.0
    
    # Min-max scaling into [0, 1]
    ir_norm = (ir - IR_MIN_KELVIN) / (IR_MAX_KELVIN - IR_MIN_KELVIN)
    ir_norm = np.clip(ir_norm, 0.0, 1.0)
    return ir_norm.astype(np.float32)

def prepare_3channel_image(ir_channel_norm, target_size=TARGET_IMG_SIZE):
    """
    Convert 1-channel normalized IR1 (201x201) into 3-channel (224x224x3)
    compatible with transfer learning backbones (EfficientNetB0).
    """
    # Resize to target shape
    if ir_channel_norm.shape[:2] != target_size:
        resized = cv2.resize(ir_channel_norm, target_size, interpolation=cv2.INTER_LINEAR)
    else:
        resized = ir_channel_norm
        
    # Replicate into 3 channels (RGB-like representation)
    img_3ch = np.stack([resized, resized, resized], axis=-1)
    return img_3ch.astype(np.float32)

def preprocess_single_image_file(image_path, target_size=TARGET_IMG_SIZE):
    """
    Preprocess an arbitrary image file (e.g. uploaded via API or CLI)
    into the format expected by the intensity regression model.
    
    Scientific Note & Domain Limitation:
    Standard visual/grayscale satellite imagery (JPG/PNG) has opposite polarity
    to meteorological Infrared (IR1) brightness temperature data:
      - In visual imagery: bright/dense cloud tops have high pixel values (~255 -> 1.0).
      - In physical IR1 data: cold convective cloud tops have low Kelvin temperatures (~180K -> 0.0).
    Applying polarity inversion (1.0 - norm_gray) maps visual cloud brightness
    to the low-value representation learned by the TCIR IR1-trained model.
    However, 8-bit visible JPGs lack true physical radiometric calibration (Kelvin).
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found at: {image_path}")
        
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Failed to read image at: {image_path}")
        
    # If image is grayscale or BGR, convert to grayscale first to get intensity/brightness
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img
        
    # Normalize pixel values [0, 255] -> [0, 1] with polarity inversion:
    # High visual brightness (clouds) -> Low normalized value (cold convective cloud top in TCIR IR1)
    norm_inverted = 1.0 - (gray.astype(np.float32) / 255.0)
    
    # Resize and convert to 3 channels
    resized = cv2.resize(norm_inverted, target_size, interpolation=cv2.INTER_LINEAR)
    img_3ch = np.stack([resized, resized, resized], axis=-1)
    return img_3ch.astype(np.float32)

def extract_indian_ocean_dataset(h5_path=DEFAULT_H5_PATH, save_cache=True, cache_path=None):
    """
    Extract only the Indian Ocean (IO) frames from the 14 GB HDF5 file
    into a fast, memory-friendly array in RAM or disk cache (~200 MB).
    """
    if cache_path is None:
        cache_path = os.path.join(os.path.dirname(h5_path), 'io_dataset_cache.npz')
        
    if os.path.exists(cache_path):
        print(f"Loading cached Indian Ocean dataset from: {cache_path}")
        data = np.load(cache_path, allow_pickle=True)
        return data['X'], data['y'], data['storm_ids'], data['times'], data['global_indices']
        
    print(f"Extracting Indian Ocean records from HDF5: {h5_path}...")
    info_df = load_info_dataframe(h5_path)
    io_df = info_df[info_df['data_set'] == 'IO'].copy()
    
    io_indices = io_df['global_matrix_idx'].values
    y = io_df['Vmax'].values.astype(np.float32)
    storm_ids = io_df['ID'].values
    times = io_df['time'].values
    lats = io_df['lat'].values.astype(np.float64)
    lons = io_df['lon'].values.astype(np.float64)
    basins = io_df['data_set'].values
    
    N = len(io_df)
    print(f"Extracting {N} frames...")
    
    X = np.zeros((N, TARGET_IMG_SIZE[0], TARGET_IMG_SIZE[1], 3), dtype=np.float32)
    
    with h5py.File(h5_path, 'r') as hf:
        matrix = hf['matrix']
        for i, global_idx in enumerate(io_indices):
            # Extract IR1 (channel 0)
            raw_ir = matrix[global_idx, :, :, 0]
            norm_ir = normalize_ir_frame(raw_ir)
            img_3ch = prepare_3channel_image(norm_ir, TARGET_IMG_SIZE)
            X[i] = img_3ch
            
            if (i + 1) % 500 == 0 or (i + 1) == N:
                print(f"  Processed {i + 1}/{N} frames ({((i + 1)/N)*100:.1f}%)")
                
    if save_cache:
        print(f"Saving extracted Indian Ocean cache to: {cache_path}...")
        np.savez_compressed(
            cache_path,
            X=X,
            y=y,
            storm_ids=storm_ids,
            times=times,
            lat=lats,
            lon=lons,
            basin=basins,
            channel_info='IR1 only (normalized to [0,1] and formatted to 3-channel 224x224x3)',
            global_indices=io_indices
        )
        print("Cache saved successfully.")
        
    return X, y, storm_ids, times, lats, lons, basins, io_indices

class IntensityDataGenerator(tf.keras.utils.Sequence):
    """
    Thread-safe Keras Sequence for batch generation with optional real-time augmentation.
    """
    def __init__(self, X, y, batch_size=32, augment=False, shuffle=True, random_seed=42):
        self.X = X
        self.y = y
        self.batch_size = batch_size
        self.augment = augment
        self.shuffle = shuffle
        self.indices = np.arange(len(self.X))
        self.rng = np.random.default_rng(random_seed)
        if self.shuffle:
            self.rng.shuffle(self.indices)
            
    def __len__(self):
        return int(np.ceil(len(self.X) / self.batch_size))
        
    def on_epoch_end(self):
        if self.shuffle:
            self.rng.shuffle(self.indices)
            
    def __getitem__(self, idx):
        batch_idx = self.indices[idx * self.batch_size : (idx + 1) * self.batch_size]
        batch_x = self.X[batch_idx].copy()
        batch_y = self.y[batch_idx].copy()
        
        if self.augment:
            batch_x = self._apply_augmentation(batch_x)
            
        return batch_x, batch_y
        
    def _apply_augmentation(self, batch_x):
        augmented = np.empty_like(batch_x)
        for i, img in enumerate(batch_x):
            aug_img = img.copy()
            # Random horizontal flip
            if self.rng.random() > 0.5:
                aug_img = np.fliplr(aug_img)
            # Random vertical flip
            if self.rng.random() > 0.5:
                aug_img = np.flipud(aug_img)
            # Random rotation (-15 to +15 degrees)
            angle = self.rng.uniform(-15.0, 15.0)
            h, w = aug_img.shape[:2]
            M = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1.0)
            aug_img = cv2.warpAffine(aug_img, M, (w, h), borderMode=cv2.BORDER_REFLECT)
            augmented[i] = aug_img
        return augmented

if __name__ == '__main__':
    X, y, storm_ids, times, lats, lons, basins, idxs = extract_indian_ocean_dataset()
    print(f"\nExtracted Indian Ocean Dataset:")
    print(f"X shape: {X.shape}, dtype: {X.dtype}, min: {X.min():.2f}, max: {X.max():.2f}")
    print(f"y shape: {y.shape}, dtype: {y.dtype}, min: {y.min():.2f}, max: {y.max():.2f} knots")
    print(f"Storms: {len(np.unique(storm_ids))}, Basins: {np.unique(basins)}")

