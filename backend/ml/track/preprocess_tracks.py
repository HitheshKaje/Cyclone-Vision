"""
CycloSafe - North Indian Ocean Cyclone Track Preprocessing Pipeline
Processes historical IBTrACS best-track records (NI basin: Arabian Sea & Bay of Bengal)
into uniform 6-hour synoptic sequences for LSTM track prediction.

Key Guarantees:
  1. Strict Storm-Level Partitioning (Zero Data Leakage).
  2. Resampled to regular 6-hour synoptic timesteps (00, 06, 12, 18 UTC).
  3. Targets: Future coordinate displacements (delta_lat, delta_lon) at +24h, +48h, +72h, +96h, +120h.
  4. Fully self-contained (Pure NumPy & Pandas, zero external ML dependencies).
"""

import os
import sys
import json
import math
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Any

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
RAW_DATA_PATH = r"D:\Dowloads\ibtracs.NI.list.v04r01.csv"
OUTPUT_DIR = os.path.join(SCRIPT_DIR, "processed_data")
MODELS_DIR = os.path.join(PROJECT_ROOT, "backend", "models")

# Parameters
LOOKBACK_STEPS = 8      # 8 steps * 6h = 48 hours history
FORECAST_HOURS = [24, 48, 72, 96, 120]  # Forecast intervals
FORECAST_STEPS = [h // 6 for h in FORECAST_HOURS] # [4, 8, 12, 16, 20]
MAX_FUTURE_STEP = max(FORECAST_STEPS) # 20 steps (120 hours)

# Geographical boundary filter for North Indian Ocean
LAT_MIN, LAT_MAX = 0.0, 35.0
LON_MIN, LON_MAX = 45.0, 105.0

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates terrestrial surface distance between two coordinates in kilometers."""
    R = 6371.0  # Earth's radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return R * c

def load_and_clean_raw_csv(filepath: str) -> pd.DataFrame:
    """Loads IBTrACS CSV, skips unit metadata on row 2, and cleans basic columns."""
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"IBTrACS file not found at: {filepath}")

    print(f"[*] Reading raw IBTrACS CSV from: {filepath}...")
    # Skip line 1 (0-indexed, so row 2) which contains unit descriptions
    df = pd.read_csv(filepath, skiprows=[1], low_memory=False)
    print(f"    Raw records: {len(df):,} rows, {len(df.columns)} columns")

    # Select critical columns
    col_map = {
        'SID': 'storm_id',
        'NAME': 'storm_name',
        'SEASON': 'season',
        'ISO_TIME': 'iso_time',
        'BASIN': 'basin',
        'SUBBASIN': 'subbasin',
        'LAT': 'lat',
        'LON': 'lon',
        'WMO_WIND': 'wmo_wind',
        'USA_WIND': 'usa_wind',
        'NEWDELHI_WIND': 'imd_wind',
        'WMO_PRES': 'wmo_pres',
        'USA_PRES': 'usa_pres',
        'NEWDELHI_PRES': 'imd_pres'
    }

    # Keep only available columns
    available_cols = {k: v for k, v in col_map.items() if k in df.columns}
    df = df[list(available_cols.keys())].rename(columns=available_cols)

    # Convert coordinates to numeric
    df['lat'] = pd.to_numeric(df['lat'], errors='coerce')
    df['lon'] = pd.to_numeric(df['lon'], errors='coerce')

    # Filter valid coordinates in North Indian Ocean
    df = df.dropna(subset=['lat', 'lon', 'iso_time', 'storm_id'])
    df = df[(df['lat'] >= LAT_MIN) & (df['lat'] <= LAT_MAX) &
            (df['lon'] >= LON_MIN) & (df['lon'] <= LON_MAX)].copy()

    # Parse timestamps
    df['timestamp'] = pd.to_datetime(df['iso_time'], errors='coerce')
    df = df.dropna(subset=['timestamp'])

    # Reconcile wind speed (Priority: IMD -> WMO -> USA)
    wind_cols = [c for c in ['imd_wind', 'wmo_wind', 'usa_wind'] if c in df.columns]
    for c in wind_cols:
        df[c] = pd.to_numeric(df[c], errors='coerce')
    if wind_cols:
        df['wind_speed_kt'] = df[wind_cols].bfill(axis=1).iloc[:, 0].fillna(35.0)
    else:
        df['wind_speed_kt'] = 35.0

    # Reconcile central pressure (Priority: IMD -> WMO -> USA)
    pres_cols = [c for c in ['imd_pres', 'wmo_pres', 'usa_pres'] if c in df.columns]
    for c in pres_cols:
        df[c] = pd.to_numeric(df[c], errors='coerce')
    if pres_cols:
        df['pressure_mb'] = df[pres_cols].bfill(axis=1).iloc[:, 0].fillna(1000.0)
    else:
        df['pressure_mb'] = 1000.0

    # Clean storm name
    df['storm_name'] = df['storm_name'].fillna('UNNAMED').astype(str).str.strip()

    # Sort chronologically per storm
    df = df.sort_values(by=['storm_id', 'timestamp']).reset_index(drop=True)
    print(f"    Cleaned North Indian Ocean records: {len(df):,} across {df['storm_id'].nunique():,} unique cyclones")
    return df

def resample_storm_trajectory(storm_df: pd.DataFrame) -> pd.DataFrame:
    """
    Interpolates a single storm's trajectory onto a regular 6-hour synoptic grid.
    Returns resampled DataFrame or None if trajectory is too short.
    """
    if len(storm_df) < 4:
        return None

    # Set timestamp as index and drop duplicate timestamps
    storm_df = storm_df.drop_duplicates(subset=['timestamp']).set_index('timestamp')

    # Round start time to nearest 6-hour synoptic mark
    t_start = storm_df.index.min().floor('6h')
    t_end = storm_df.index.max().ceil('6h')
    duration_hours = (t_end - t_start).total_seconds() / 3600.0

    # Require at least 48 hours (lookback) + 24 hours (minimum forecast) = 72 hours
    if duration_hours < 72.0:
        return None

    # Create uniform 6-hour regular grid
    regular_grid = pd.date_range(start=t_start, end=t_end, freq='6h')

    # Reindex and interpolate numerical features
    combined = storm_df.reindex(storm_df.index.union(regular_grid))
    
    # Linear interpolation for spatial coordinates, forward/backward fill for categorical
    for col in ['lat', 'lon', 'wind_speed_kt', 'pressure_mb']:
        combined[col] = combined[col].interpolate(method='time').bfill().ffill()

    resampled = combined.loc[regular_grid].copy()
    resampled['storm_id'] = storm_df['storm_id'].iloc[0]
    resampled['storm_name'] = storm_df['storm_name'].iloc[0]
    resampled['timestamp'] = resampled.index
    resampled = resampled.reset_index(drop=True)

    # Compute displacements and translation velocity
    resampled['delta_lat'] = resampled['lat'].diff().fillna(0.0)
    resampled['delta_lon'] = resampled['lon'].diff().fillna(0.0)

    # Translation speed in knots (km/h * 0.539957)
    speeds = [0.0]
    for i in range(1, len(resampled)):
        dist_km = haversine_distance(
            resampled.loc[i - 1, 'lat'], resampled.loc[i - 1, 'lon'],
            resampled.loc[i, 'lat'], resampled.loc[i, 'lon']
        )
        speed_kt = (dist_km / 6.0) * 0.539957
        speeds.append(min(speed_kt, 60.0)) # clip unrealistic jumps
    resampled['translation_speed_kt'] = speeds

    return resampled

def build_sequences_from_storm(storm_df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Extracts sliding sequences of length LOOKBACK_STEPS (8 steps = 48h)
    targeting future displacement vectors at +24h, +48h, +72h, +96h, +120h.
    """
    N = len(storm_df)
    total_needed = LOOKBACK_STEPS + MAX_FUTURE_STEP # 8 + 20 = 28 steps (168 hours total)
    sequences = []

    # Features: [lat, lon, delta_lat, delta_lon, wind_speed_kt, pressure_mb, translation_speed_kt]
    feature_cols = ['lat', 'lon', 'delta_lat', 'delta_lon', 'wind_speed_kt', 'pressure_mb', 'translation_speed_kt']
    feature_matrix = storm_df[feature_cols].values.astype(np.float32)

    for i in range(N - LOOKBACK_STEPS - FORECAST_STEPS[0] + 1):
        input_seq = feature_matrix[i : i + LOOKBACK_STEPS]
        current_lat = storm_df.loc[i + LOOKBACK_STEPS - 1, 'lat']
        current_lon = storm_df.loc[i + LOOKBACK_STEPS - 1, 'lon']
        current_time = storm_df.loc[i + LOOKBACK_STEPS - 1, 'timestamp']

        # Targets: future displacements [delta_lat_24, delta_lon_24, ..., delta_lat_120, delta_lon_120]
        # If storm dissipated before 120h, forward-fill the last known position (stationary dissipation)
        target_deltas = []
        target_coords = []
        is_valid_sequence = True

        for step in FORECAST_STEPS:
            target_idx = i + LOOKBACK_STEPS - 1 + step
            if target_idx < N:
                future_lat = storm_df.loc[target_idx, 'lat']
                future_lon = storm_df.loc[target_idx, 'lon']
            else:
                # Persistent dissipation state at end of recorded track
                future_lat = storm_df.loc[N - 1, 'lat']
                future_lon = storm_df.loc[N - 1, 'lon']

            delta_lat = future_lat - current_lat
            delta_lon = future_lon - current_lon
            target_deltas.extend([delta_lat, delta_lon])
            target_coords.append({"horizon_h": step * 6, "lat": float(future_lat), "lon": float(future_lon)})

        sequences.append({
            "storm_id": storm_df['storm_id'].iloc[0],
            "storm_name": storm_df['storm_name'].iloc[0],
            "current_time": str(current_time),
            "current_lat": float(current_lat),
            "current_lon": float(current_lon),
            "input_features": input_seq,
            "target_deltas": np.array(target_deltas, dtype=np.float32),
            "target_coords": target_coords
        })

    return sequences

def main():
    print("=" * 70)
    print("CYCLOSAFE: NORTH INDIAN OCEAN TRACK PREPROCESSING PIPELINE")
    print("=" * 70)

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(MODELS_DIR, exist_ok=True)

    # 1. Load and clean raw CSV
    df = load_and_clean_raw_csv(RAW_DATA_PATH)

    # 2. Resample each storm to 6-hour synoptic intervals
    print("\n[*] Resampling storm tracks onto uniform 6-hour synoptic grids...")
    unique_storms = df['storm_id'].unique()
    valid_resampled_storms = []
    
    for sid in unique_storms:
        storm_subset = df[df['storm_id'] == sid].copy()
        res = resample_storm_trajectory(storm_subset)
        if res is not None and len(res) >= (LOOKBACK_STEPS + FORECAST_STEPS[0]):
            valid_resampled_storms.append(res)

    print(f"    Retained {len(valid_resampled_storms):,} high-quality storms with >= 72h continuous tracks.")

    # 3. Identify landmark test cyclones for zero-leakage test set
    # Priority test storms: AMPHAN (2020), FANI (2019), BIPARJOY (2023), TAUKTAE (2021)
    test_storm_names = {'AMPHAN', 'FANI', 'BIPARJOY', 'TAUKTAE'}
    test_sids = set()
    train_val_storms = []
    test_storms = []

    for storm in valid_resampled_storms:
        sname = str(storm['storm_name'].iloc[0]).upper()
        if any(ts in sname for ts in test_storm_names) and len(test_storms) < 8:
            test_storms.append(storm)
            test_sids.add(storm['storm_id'].iloc[0])
        else:
            train_val_storms.append(storm)

    # Guarantee test set has ~10% of total storms
    np.random.seed(42)
    indices = np.random.permutation(len(train_val_storms))
    n_test_needed = max(0, int(len(valid_resampled_storms) * 0.10) - len(test_storms))
    
    for idx in indices[:n_test_needed]:
        test_storms.append(train_val_storms[idx])
        test_sids.add(train_val_storms[idx]['storm_id'].iloc[0])
    
    train_val_storms = [s for s in train_val_storms if s['storm_id'].iloc[0] not in test_sids]
    
    # Split train and validation (85% train, 15% val)
    n_val = max(1, int(len(train_val_storms) * 0.15))
    val_storms = train_val_storms[:n_val]
    train_storms = train_val_storms[n_val:]

    print(f"\n[*] Zero-Leakage Storm Partitioning:")
    print(f"    Train Cyclones:      {len(train_storms):,} storms")
    print(f"    Validation Cyclones: {len(val_storms):,} storms")
    print(f"    Test Cyclones:       {len(test_storms):,} storms")

    # 4. Generate sliding sequences
    def extract_dataset(storm_list):
        all_X, all_y, meta = [], [], []
        for s in storm_list:
            seqs = build_sequences_from_storm(s)
            for item in seqs:
                all_X.append(item["input_features"])
                all_y.append(item["target_deltas"])
                meta.append({
                    "storm_id": item["storm_id"],
                    "storm_name": item["storm_name"],
                    "current_time": item["current_time"],
                    "current_lat": item["current_lat"],
                    "current_lon": item["current_lon"],
                    "target_coords": item["target_coords"]
                })
        return np.array(all_X, dtype=np.float32), np.array(all_y, dtype=np.float32), meta

    X_train, y_train, train_meta = extract_dataset(train_storms)
    X_val, y_val, val_meta = extract_dataset(val_storms)
    X_test, y_test, test_meta = extract_dataset(test_storms)

    print(f"\n[*] Extracted Sequence Windows (Lookback={LOOKBACK_STEPS} steps, Forecast=5 steps):")
    print(f"    X_train shape: {X_train.shape}, y_train shape: {y_train.shape}")
    print(f"    X_val shape:   {X_val.shape}, y_val shape:   {y_val.shape}")
    print(f"    X_test shape:  {X_test.shape}, y_test shape:  {y_test.shape}")

    # 5. Fit Scaler strictly on Training Data
    # Feature-wise min and max across all timesteps in X_train
    # Features: [lat, lon, delta_lat, delta_lon, wind_speed_kt, pressure_mb, translation_speed_kt]
    flat_X_train = X_train.reshape(-1, X_train.shape[-1])
    feature_min = flat_X_train.min(axis=0)
    feature_max = flat_X_train.max(axis=0)
    # Prevent divide by zero
    feature_range = np.where((feature_max - feature_min) == 0, 1.0, feature_max - feature_min)

    # Target-wise min and max for displacements
    target_min = y_train.min(axis=0)
    target_max = y_train.max(axis=0)
    target_range = np.where((target_max - target_min) == 0, 1.0, target_max - target_min)

    # Normalize X
    def normalize_X(X_arr):
        return (X_arr - feature_min) / feature_range

    def normalize_y(y_arr):
        return (y_arr - target_min) / target_range

    X_train_norm = normalize_X(X_train)
    X_val_norm = normalize_X(X_val)
    X_test_norm = normalize_X(X_test)

    y_train_norm = normalize_y(y_train)
    y_val_norm = normalize_y(y_val)
    y_test_norm = normalize_y(y_test)

    # 6. Save scaler configuration
    scaler_dict = {
        "feature_names": ['lat', 'lon', 'delta_lat', 'delta_lon', 'wind_speed_kt', 'pressure_mb', 'translation_speed_kt'],
        "feature_min": feature_min.tolist(),
        "feature_max": feature_max.tolist(),
        "feature_range": feature_range.tolist(),
        "target_names": [
            'delta_lat_24h', 'delta_lon_24h',
            'delta_lat_48h', 'delta_lon_48h',
            'delta_lat_72h', 'delta_lon_72h',
            'delta_lat_96h', 'delta_lon_96h',
            'delta_lat_120h', 'delta_lon_120h'
        ],
        "target_min": target_min.tolist(),
        "target_max": target_max.tolist(),
        "target_range": target_range.tolist(),
        "forecast_horizons_hours": FORECAST_HOURS,
        "lookback_steps": LOOKBACK_STEPS
    }

    scaler_path = os.path.join(OUTPUT_DIR, "track_scaler.json")
    with open(scaler_path, "w") as f:
        json.dump(scaler_dict, f, indent=2)

    # Also save to models dir for deployment
    with open(os.path.join(MODELS_DIR, "track_scaler.json"), "w") as f:
        json.dump(scaler_dict, f, indent=2)

    print(f"[*] Scaler saved to: {scaler_path}")

    # 7. Save processed sequence arrays (.npz)
    npz_path = os.path.join(OUTPUT_DIR, "track_sequences.npz")
    np.savez_compressed(
        npz_path,
        X_train=X_train_norm, y_train=y_train_norm,
        X_val=X_val_norm, y_val=y_val_norm,
        X_test=X_test_norm, y_test=y_test_norm,
        y_test_raw=y_test
    )
    print(f"[*] Preprocessed sequences saved to: {npz_path}")

    # 8. Save sample test storms for web demonstration & Swagger API testing
    sample_storms = []
    for storm in test_storms[:5]:
        sname = str(storm['storm_name'].iloc[0])
        sid = str(storm['storm_id'].iloc[0])
        history_points = []
        for _, row in storm.iterrows():
            history_points.append({
                "timestamp": str(row['timestamp']),
                "lat": round(float(row['lat']), 2),
                "lon": round(float(row['lon']), 2),
                "wind_speed_kt": round(float(row['wind_speed_kt']), 1),
                "pressure_mb": round(float(row['pressure_mb']), 1)
            })
        sample_storms.append({
            "storm_id": sid,
            "storm_name": sname,
            "basin": "North Indian Ocean (NI)",
            "total_fixes": len(history_points),
            "start_time": history_points[0]["timestamp"],
            "end_time": history_points[-1]["timestamp"],
            "track": history_points
        })

    demo_storms_path = os.path.join(OUTPUT_DIR, "sample_test_storms.json")
    with open(demo_storms_path, "w") as f:
        json.dump(sample_storms, f, indent=2)

    with open(os.path.join(MODELS_DIR, "sample_test_storms.json"), "w") as f:
        json.dump(sample_storms, f, indent=2)

    print(f"[*] Sample demo storms saved to: {demo_storms_path}")
    print("\n" + "=" * 70)
    print("PREPROCESSING SUCCESSFULLY COMPLETE!")
    print("=" * 70)

if __name__ == "__main__":
    main()
