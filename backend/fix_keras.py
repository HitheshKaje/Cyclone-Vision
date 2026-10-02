import json
import zipfile
import os
import tempfile
import shutil

def fix_keras_file(filepath):
    print(f"Fixing {filepath}...")
    temp_dir = tempfile.mkdtemp()
    
    with zipfile.ZipFile(filepath, 'r') as zip_ref:
        zip_ref.extractall(temp_dir)
        
    config_path = os.path.join(temp_dir, "config.json")
    with open(config_path, "r") as f:
        config_str = f.read()
        
    # Simply replace all occurrences of quantization_config
    config_str = config_str.replace('"quantization_config": null, ', '')
    config_str = config_str.replace(', "quantization_config": null', '')
    config_str = config_str.replace('"quantization_config": null', '')
    
    with open(config_path, "w") as f:
        f.write(config_str)
        
    # Re-zip
    shutil.make_archive(filepath + "_fixed", 'zip', temp_dir)
    os.replace(filepath + "_fixed.zip", filepath)
    
    shutil.rmtree(temp_dir)
    print(f"Fixed {filepath}!")

fix_keras_file("models/cyclone_detector.keras")
fix_keras_file("models/cyclone_intensity.keras")
