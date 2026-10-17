"""
Script to fetch additional official NOAA NCEI IBTrACS basin CSVs to expand historical observation coverage.
All files are downloaded strictly into backend/ml/intensity_dataset_collection/metadata/ibtracs_basins/.
"""
import os
import urllib.request
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

BASE_URL = "https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/v04r01/access/csv/"

BASINS = {
    "NA": "ibtracs.NA.list.v04r01.csv", # North Atlantic (Hurricanes)
    "WP": "ibtracs.WP.list.v04r01.csv", # Western Pacific (Typhoons)
    "EP": "ibtracs.EP.list.v04r01.csv", # Eastern Pacific
    "SI": "ibtracs.SI.list.v04r01.csv", # South Indian
    "SP": "ibtracs.SP.list.v04r01.csv"  # South Pacific
}

def download_basin_csv(basin_key: str, dest_dir: str) -> str:
    os.makedirs(dest_dir, exist_ok=True)
    filename = BASINS.get(basin_key)
    if not filename:
        raise ValueError(f"Unknown basin: {basin_key}")
        
    dest_path = os.path.join(dest_dir, filename)
    if os.path.exists(dest_path) and os.path.getsize(dest_path) > 10000:
        logging.info(f"Basin {basin_key} CSV already present at {dest_path}")
        return dest_path
        
    url = BASE_URL + filename
    logging.info(f"Downloading {basin_key} IBTrACS from {url}...")
    headers = {'User-Agent': 'CycloSafe-Research-Intensity-Collector/1.0'}
    req = urllib.request.Request(url, headers=headers)
    
    with urllib.request.urlopen(req, timeout=30) as resp, open(dest_path, 'wb') as out_f:
        out_f.write(resp.read())
        
    logging.info(f"-> Successfully saved {basin_key} to {dest_path} ({os.path.getsize(dest_path)/1024/1024:.2f} MB)")
    return dest_path

if __name__ == "__main__":
    dest_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "metadata", "ibtracs_basins"))
    for b in ["NA", "WP", "EP", "SI", "SP"]:
        try:
            download_basin_csv(b, dest_dir)
        except Exception as e:
            logging.error(f"Failed to download {b}: {e}")
