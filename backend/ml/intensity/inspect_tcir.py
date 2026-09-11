import os
import h5py
import pickle
import numpy as np
import pandas as pd

h5_path = r'D:\MainProjectMl\ProjectCode\backend\ml\intensity\dataset\TCIR-CPAC_IO_SH.h5'
print(f'HDF5 Filename: {os.path.basename(h5_path)}')
print(f'Full Path: {h5_path}')
print(f'File Size: {os.path.getsize(h5_path):,} bytes ({os.path.getsize(h5_path)/(1024**3):.2f} GB)')

with h5py.File(h5_path, 'r') as hf:
    print('\n1. Top-level keys/groups:', list(hf.keys()))
    
    # Matrix dataset
    m_ds = hf['matrix']
    print(f'2. matrix shape: {m_ds.shape}')
    print(f'3. matrix dtype: {m_ds.dtype}')
    
    # Check sample slice from matrix
    sample_slice = m_ds[0:1] # only load 1 single frame
    print(f'   Sample frame shape: {sample_slice.shape}')
    print(f'   Channel 0 (IR1) range: min={np.nanmin(sample_slice[0,:,:,0]):.2f}, max={np.nanmax(sample_slice[0,:,:,0]):.2f}')
    print(f'   Channel 1 (WV) range:  min={np.nanmin(sample_slice[0,:,:,1]):.2f}, max={np.nanmax(sample_slice[0,:,:,1]):.2f}')
    print(f'   Channel 2 (VIS) range: min={np.nanmin(sample_slice[0,:,:,2]):.2f}, max={np.nanmax(sample_slice[0,:,:,2]):.2f}')
    print(f'   Channel 3 (PMW) range: min={np.nanmin(sample_slice[0,:,:,3]):.2f}, max={np.nanmax(sample_slice[0,:,:,3]):.2f}')
    
    # Info group
    info = hf['info']
    print(f'4. info structure: Group containing datasets {list(info.keys())}')
    
    b0_items = [x.decode('utf-8') if isinstance(x, bytes) else str(x) for x in info['block0_items'][:]]
    b0_vals = info['block0_values'][:]
    
    b1_items = [x.decode('utf-8') if isinstance(x, bytes) else str(x) for x in info['block1_items'][:]]
    b1_vals = pickle.loads(info['block1_values'][0].tobytes())
    
    df0 = pd.DataFrame(b0_vals, columns=b0_items)
    df1 = pd.DataFrame(b1_vals, columns=b1_items)
    df = pd.concat([df1, df0], axis=1)

print('\n5. Exact metadata columns:', list(df.columns))
print(f'6. Total records: {len(df):,}')
print(f'7. Wind-speed / Vmax field: "Vmax" (dtype: {df["Vmax"].dtype})')
print(f'8. Storm/cyclone identifier field: "ID" (dtype: {df["ID"].dtype})')
print(f'9. Timestamp field: "time" (dtype: {df["time"].dtype})')
print(f'10. Latitude field: "lat" (dtype: {df["lat"].dtype})')
print(f'11. Longitude field: "lon" (dtype: {df["lon"].dtype})')
print(f'12. Basin/region field: "data_set" (dtype: {df["data_set"].dtype})')

print('\n13. Missing values across entire dataset:')
print(df.isna().sum().to_dict())

print('\n14. Record count per Basin / Region ("data_set"):')
basin_counts = df['data_set'].value_counts()
for b, c in basin_counts.items():
    print(f'    - {b}: {c:,} records')

cpac_count = int(basin_counts.get('CPAC', 0))
io_count = int(basin_counts.get('IO', 0))
sh_count = int(basin_counts.get('SH', 0))

print(f'\n15. Number of CPAC records: {cpac_count:,}')
print(f'16. Number of IO records: {io_count:,}')
print(f'17. Number of SH records: {sh_count:,}')

# Indian Ocean specific
io_df = df[df['data_set'] == 'IO'].copy()
num_io_storms = io_df['ID'].nunique()
min_io_vmax = float(io_df['Vmax'].min())
max_io_vmax = float(io_df['Vmax'].max())
mean_io_vmax = float(io_df['Vmax'].mean())
missing_io_vmax = int(io_df['Vmax'].isna().sum())

print(f'\n18. Number of unique IO storms: {num_io_storms}')
print(f'19. Minimum IO wind speed: {min_io_vmax} knots')
print(f'20. Maximum IO wind speed: {max_io_vmax} knots')
print(f'    Mean IO wind speed: {mean_io_vmax:.2f} knots')
print(f'21. Number of missing IO wind-speed labels: {missing_io_vmax}')

print('\nSample 10 IO Storms and Frame Counts:')
print(io_df['ID'].value_counts().head(10).to_dict())
