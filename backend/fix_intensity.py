import os
import json
import zipfile
import tempfile
import shutil

filepath = 'models/cyclone_intensity.keras'
if os.path.exists(filepath):
    print(f"Fixing {filepath} for Keras 3 compatibility...")
    temp_dir = tempfile.mkdtemp()
    with zipfile.ZipFile(filepath, 'r') as z:
        z.extractall(temp_dir)
        
    config_path = os.path.join(temp_dir, "config.json")
    with open(config_path, "r") as f:
        s = f.read()
        
    # Replace BatchNormalization list axis with integer for Keras 3 compatibility
    s = s.replace('"axis": [3]', '"axis": 3')
    s = s.replace('"axis": [1]', '"axis": 1')
    
    # Remove unsupported Keras 2 parameters from DepthwiseConv2D
    s = s.replace('"groups": 1, ', '')
    s = s.replace(', "groups": 1', '')
    s = s.replace('"groups": 1', '')

    s = s.replace('"quantization_config": null, ', '')
    s = s.replace(', "quantization_config": null', '')
    s = s.replace('"quantization_config": null', '')
    
    with open(config_path, "w") as f:
        f.write(s)
        
    shutil.make_archive(filepath + "_fixed", 'zip', temp_dir)
    os.replace(filepath + "_fixed.zip", filepath)
    shutil.rmtree(temp_dir)
    print(f"Successfully fixed {filepath} for Keras 3!")
else:
    print(f"File {filepath} not found.")
