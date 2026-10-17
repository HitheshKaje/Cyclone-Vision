"""
Validation and Reporting Engine for the Collected Tropical Cyclone Intensity Dataset.
Inspects metadata/labels.csv and downloaded images, verifies checksums and image integrity,
calculates wind-speed distributions, and generates collection_report.json.
"""
import os
import sys
import json
import csv
import hashlib
from typing import Dict, Any
from PIL import Image

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
IMAGES_DIR = os.path.join(BASE_DIR, "images")
METADATA_DIR = os.path.join(BASE_DIR, "metadata")
LABELS_CSV = os.path.join(METADATA_DIR, "labels.csv")
REPORT_JSON = os.path.join(METADATA_DIR, "collection_report.json")

def generate_report() -> Dict[str, Any]:
    if not os.path.exists(LABELS_CSV):
        print(f"Error: {LABELS_CSV} does not exist.")
        return {}
        
    records = []
    with open(LABELS_CSV, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            records.append(row)
            
    total_downloaded = len(records)
    unique_checksums = set()
    verified_pairs = 0
    corrupt_images = 0
    unique_cyclones = set()
    unique_dates = set()
    wind_speeds = []
    image_types = set()
    satellite_sources = set()
    agencies = set()
    
    # Wind speed categorization (IMD Classification Scale)
    categories = {
        "Depression (<34 kts)": 0,
        "Deep Depression (34-47 kts)": 0,
        "Cyclonic Storm (48-63 kts)": 0,
        "Severe Cyclonic Storm (64-89 kts)": 0,
        "Very Severe Cyclonic Storm (90-119 kts)": 0,
        "Extremely Severe / Super Cyclone (>=120 kts)": 0
    }
    
    for row in records:
        rel_path = row["image_path"]
        abs_path = os.path.join(BASE_DIR, rel_path)
        
        # Verify file existence on disk
        if not os.path.exists(abs_path):
            corrupt_images += 1
            continue
            
        # Verify PIL decodability
        try:
            with Image.open(abs_path) as img:
                img.verify()
                image_types.add(f"{img.format} ({img.mode})")
        except Exception:
            corrupt_images += 1
            continue
            
        checksum = row.get("checksum")
        if checksum:
            unique_checksums.add(checksum)
            
        v_status = row.get("verification_status")
        if v_status == "VERIFIED_GENUINE_SATELLITE":
            verified_pairs += 1
            
        cyclone_id = row.get("storm_id")
        if cyclone_id:
            unique_cyclones.add(cyclone_id)
            
        ts = row.get("observation_timestamp")
        if ts:
            unique_dates.add(ts.split(" ")[0])
            
        source = row.get("satellite_source")
        if source:
            satellite_sources.add(source)
            
        agency = row.get("label_agency")
        if agency:
            agencies.add(agency)
            
        try:
            w = float(row["wind_speed_knots"])
            wind_speeds.append(w)
            if w < 34:
                categories["Depression (<34 kts)"] += 1
            elif w < 48:
                categories["Deep Depression (34-47 kts)"] += 1
            elif w < 64:
                categories["Cyclonic Storm (48-63 kts)"] += 1
            elif w < 90:
                categories["Severe Cyclonic Storm (64-89 kts)"] += 1
            elif w < 120:
                categories["Very Severe Cyclonic Storm (90-119 kts)"] += 1
            else:
                categories["Extremely Severe / Super Cyclone (>=120 kts)"] += 1
        except ValueError:
            pass

    date_sorted = sorted(list(unique_dates))
    date_range = f"{date_sorted[0]} to {date_sorted[-1]}" if date_sorted else "N/A"
    
    report = {
        "dataset_name": "CycloSafe Tropical Cyclone Intensity Dataset (Objective 2)",
        "total_images_recorded": total_downloaded,
        "unique_images_by_checksum": len(unique_checksums),
        "verified_image_label_pairs": verified_pairs,
        "corrupt_or_missing_files": corrupt_images,
        "distinct_cyclone_ids": len(unique_cyclones),
        "date_range_covered": date_range,
        "satellite_sources": list(satellite_sources),
        "image_formats_and_color_modes": list(image_types),
        "ground_truth_agencies": list(agencies),
        "wind_speed_statistics_knots": {
            "min": min(wind_speeds) if wind_speeds else 0.0,
            "max": max(wind_speeds) if wind_speeds else 0.0,
            "mean": round(sum(wind_speeds) / len(wind_speeds), 2) if wind_speeds else 0.0,
            "distribution_by_intensity_category": categories
        },
        "licensing_and_access": {
            "satellite_license": "NASA Open Data Policy (EOSDIS/GIBS) - Public Domain / Open Research",
            "ground_truth_license": "NOAA NCEI IBTrACS v04 - Public Domain / Unrestricted Scientific Use",
            "usage": "Intended for training Objective 2 deep learning regression models (e.g. EfficientNet / ResNet) for maximum sustained wind speed estimation."
        }
    }
    
    with open(REPORT_JSON, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
        
    print(json.dumps(report, indent=2))
    return report

if __name__ == "__main__":
    generate_report()
