import os
import h5py
import pickle
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

DEFAULT_H5_PATH = os.path.join(os.path.dirname(__file__), 'dataset', 'TCIR-CPAC_IO_SH.h5')
CACHE_NPZ_PATH = os.path.join(os.path.dirname(__file__), 'dataset', 'io_dataset_cache.npz')

def load_info_dataframe(h5_path=DEFAULT_H5_PATH):
    """
    Safely load metadata from the 'info' group in TCIR HDF5 file
    without requiring external pytables dependency.
    """
    if not os.path.exists(h5_path):
        raise FileNotFoundError(f"TCIR HDF5 file not found at: {h5_path}")
        
    with h5py.File(h5_path, 'r') as hf:
        info = hf['info']
        b0_items = [x.decode('utf-8') if isinstance(x, bytes) else str(x) for x in info['block0_items'][:]]
        b0_vals = info['block0_values'][:]
        
        b1_items = [x.decode('utf-8') if isinstance(x, bytes) else str(x) for x in info['block1_items'][:]]
        raw_b1 = info['block1_values'][0]
        b1_vals = pickle.loads(raw_b1.tobytes())
        
        df0 = pd.DataFrame(b0_vals, columns=b0_items)
        df1 = pd.DataFrame(b1_vals, columns=b1_items)
        
        # Combine into complete dataframe
        df = pd.concat([df1, df0], axis=1)
        # Store original global index in HDF5 matrix
        df['global_matrix_idx'] = np.arange(len(df))
        
    return df

def get_storm_level_split(info_df, basin='IO', train_ratio=0.70, val_ratio=0.15, test_ratio=0.15, random_seed=42):
    """
    Perform a strict storm-level split to prevent data leakage.
    Returns:
        train_df, val_df, test_df
    """
    assert abs((train_ratio + val_ratio + test_ratio) - 1.0) < 1e-5, "Ratios must sum to 1.0"
    
    # Filter by basin
    basin_df = info_df[info_df['data_set'] == basin].copy()
    if len(basin_df) == 0:
        raise ValueError(f"No records found for basin '{basin}'")
        
    unique_storms = basin_df['ID'].unique()
    n_storms = len(unique_storms)
    
    # Get storm peak intensity for stratified splitting
    storm_max_vmax = basin_df.groupby('ID')['Vmax'].max().loc[unique_storms].values
    
    # Bin storm intensities into categories for balanced split
    bins = [0, 34, 64, 90, 200]
    binned = np.digitize(storm_max_vmax, bins=bins)
    
    # Split Test Storms
    test_storm_count = int(np.round(n_storms * test_ratio))
    val_storm_count = int(np.round(n_storms * val_ratio))
    
    # Stratified split for train+val vs test
    try:
        train_val_storms, test_storms = train_test_split(
            unique_storms,
            test_size=test_storm_count,
            random_state=random_seed,
            stratify=binned
        )
    except Exception:
        # Fallback to standard random split if stratification has too few samples per bin
        train_val_storms, test_storms = train_test_split(
            unique_storms,
            test_size=test_storm_count,
            random_state=random_seed
        )
        
    # Stratified split for train vs val
    train_val_binned = np.digitize(basin_df.groupby('ID')['Vmax'].max().loc[train_val_storms].values, bins=bins)
    try:
        train_storms, val_storms = train_test_split(
            train_val_storms,
            test_size=val_storm_count,
            random_state=random_seed,
            stratify=train_val_binned
        )
    except Exception:
        train_storms, val_storms = train_test_split(
            train_val_storms,
            test_size=val_storm_count,
            random_state=random_seed
        )
        
    # Verify strict zero storm leakage
    train_set = set(train_storms)
    val_set = set(val_storms)
    test_set = set(test_storms)
    
    assert len(train_set.intersection(val_set)) == 0, "DATA LEAKAGE: Train and Val share storm IDs!"
    assert len(train_set.intersection(test_set)) == 0, "DATA LEAKAGE: Train and Test share storm IDs!"
    assert len(val_set.intersection(test_set)) == 0, "DATA LEAKAGE: Val and Test share storm IDs!"
    
    train_df = basin_df[basin_df['ID'].isin(train_set)].copy()
    val_df = basin_df[basin_df['ID'].isin(val_set)].copy()
    test_df = basin_df[basin_df['ID'].isin(test_set)].copy()
    
    return train_df, val_df, test_df, {
        'train_storms': list(train_storms),
        'val_storms': list(val_storms),
        'test_storms': list(test_storms)
    }

if __name__ == '__main__':
    df = load_info_dataframe()
    print(f"Loaded total metadata records: {len(df)}")
    train_df, val_df, test_df, storm_dict = get_storm_level_split(df, basin='IO', random_seed=42)
    print(f"\n--- Storm-Level Split Summary (Indian Ocean) ---")
    print(f"Train Set: {len(storm_dict['train_storms'])} storms, {len(train_df)} frames, Vmax range: [{train_df['Vmax'].min()}, {train_df['Vmax'].max()}], mean: {train_df['Vmax'].mean():.1f} kt")
    print(f"Val Set:   {len(storm_dict['val_storms'])} storms, {len(val_df)} frames, Vmax range: [{val_df['Vmax'].min()}, {val_df['Vmax'].max()}], mean: {val_df['Vmax'].mean():.1f} kt")
    print(f"Test Set:  {len(storm_dict['test_storms'])} storms, {len(test_df)} frames, Vmax range: [{test_df['Vmax'].min()}, {test_df['Vmax'].max()}], mean: {test_df['Vmax'].mean():.1f} kt")
    print(f"Total:     {len(storm_dict['train_storms']) + len(storm_dict['val_storms']) + len(storm_dict['test_storms'])} storms, {len(train_df) + len(val_df) + len(test_df)} frames")
