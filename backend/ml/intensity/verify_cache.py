import os
import numpy as np
import pandas as pd
from utils import load_info_dataframe, get_storm_level_split

cache_path = r'D:\MainProjectMl\ProjectCode\backend\ml\intensity\dataset\io_dataset_cache.npz'
h5_path = r'D:\MainProjectMl\ProjectCode\backend\ml\intensity\dataset\TCIR-CPAC_IO_SH.h5'

print("=== VERIFYING IO_DATASET_CACHE.NPZ ===")
print(f"Cache File Exists: {os.path.exists(cache_path)}")
cache_size_bytes = os.path.getsize(cache_path)
print(f"Cache File Size: {cache_size_bytes:,} bytes ({cache_size_bytes / (1024*1024):.2f} MB)")

data = np.load(cache_path, allow_pickle=True)
print(f"\nKeys in Cache: {list(data.keys())}")

X = data['X']
y = data['y']
storm_ids = data['storm_ids']
times = data['times']
lats = data['lat']
lons = data['lon']
basins = data['basin']
channel_info = str(data['channel_info'])
global_indices = data['global_indices']

print(f"\n1. Image / Input Shape: {X.shape}")
print(f"2. Number of Samples: {len(X):,}")
print(f"3. Target Vmax Array Shape: {y.shape}")
print(f"4. Storm / Cyclone ID Count: {len(np.unique(storm_ids))} unique storms across {len(storm_ids):,} frames")
print(f"   Sample Storm IDs: {list(np.unique(storm_ids)[:10])}")
print(f"5. Timestamp Information: Retained ({len(times):,} timestamps, sample: {times[:5]})")
print(f"6. Basin / Region Information: Retained ({len(basins):,} records, unique basins: {np.unique(basins)})")
print(f"7. Input Channels Retained: {channel_info}")
print(f"   Input Value Range: min={np.nanmin(X):.4f}, max={np.nanmax(X):.4f}")
print(f"8. Data Dtypes:")
print(f"   - X dtype: {X.dtype}")
print(f"   - y dtype: {y.dtype}")
print(f"   - storm_ids dtype: {storm_ids.dtype}")
print(f"   - times dtype: {times.dtype}")
print(f"   - lat dtype: {lats.dtype}")
print(f"   - lon dtype: {lons.dtype}")
print(f"9. NaN Count:")
print(f"   - NaNs in X: {np.isnan(X).sum()}")
print(f"   - NaNs in y: {np.isnan(y).sum()}")
print(f"10. Minimum Vmax: {np.min(y):.2f} knots")
print(f"11. Maximum Vmax: {np.max(y):.2f} knots")
print(f"12. Mean Vmax: {np.mean(y):.2f} knots (Std: {np.std(y):.2f} knots, Median: {np.median(y):.2f} knots)")

# Storm-level Split Verification
info_df = load_info_dataframe(h5_path)
train_df, val_df, test_df, storm_dict = get_storm_level_split(info_df, basin='IO', random_seed=42)

print("\n13. Train / Validation / Test Split (Storm-Level):")
print(f"    - Train Set: {len(storm_dict['train_storms'])} storms ({len(train_df):,} frames, {len(train_df)/len(X)*100:.1f}%), Vmax range: [{train_df['Vmax'].min():.1f}, {train_df['Vmax'].max():.1f}], mean: {train_df['Vmax'].mean():.1f} kt")
print(f"    - Val Set:   {len(storm_dict['val_storms'])} storms ({len(val_df):,} frames, {len(val_df)/len(X)*100:.1f}%), Vmax range: [{val_df['Vmax'].min():.1f}, {val_df['Vmax'].max():.1f}], mean: {val_df['Vmax'].mean():.1f} kt")
print(f"    - Test Set:  {len(storm_dict['test_storms'])} storms ({len(test_df):,} frames, {len(test_df)/len(X)*100:.1f}%), Vmax range: [{test_df['Vmax'].min():.1f}, {test_df['Vmax'].max():.1f}], mean: {test_df['Vmax'].mean():.1f} kt")

train_set = set(storm_dict['train_storms'])
val_set = set(storm_dict['val_storms'])
test_set = set(storm_dict['test_storms'])
print(f"    - Train AND Val Overlap: {len(train_set.intersection(val_set))} storms")
print(f"    - Train AND Test Overlap: {len(train_set.intersection(test_set))} storms")
print(f"    - Val AND Test Overlap: {len(val_set.intersection(test_set))} storms")
print(f"    - Zero Leakage Guarantee: {'PASSED' if len(train_set.intersection(val_set)) == 0 and len(train_set.intersection(test_set)) == 0 and len(val_set.intersection(test_set)) == 0 else 'FAILED'}")

print(f"\n14. Original TCIR HDF5 Status:")
print(f"    - Exists: {os.path.exists(h5_path)}")
print(f"    - Size: {os.path.getsize(h5_path):,} bytes ({os.path.getsize(h5_path)/(1024**3):.2f} GB)")
