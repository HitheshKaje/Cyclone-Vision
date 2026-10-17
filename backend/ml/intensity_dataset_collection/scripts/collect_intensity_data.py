"""
Autonomous, Resumable Dataset Collection Engine for Objective 2: Tropical Cyclone Intensity Estimation.
Collects verified true-color satellite imagery from NASA GIBS paired with ground-truth IBTrACS wind speeds.
"""
import os
import sys
import json
import csv
import time
import hashlib
import asyncio
import logging
from io import BytesIO
from typing import List, Dict, Any, Set
import aiohttp
from PIL import Image

# Setup directories relative to this script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
IMAGES_DIR = os.path.join(BASE_DIR, "images")
METADATA_DIR = os.path.join(BASE_DIR, "metadata")
LOGS_DIR = os.path.join(BASE_DIR, "logs")

LABELS_CSV = os.path.join(METADATA_DIR, "labels.csv")
CHECKPOINT_JSON = os.path.join(METADATA_DIR, "checkpoint.json")
LOG_FILE = os.path.join(LOGS_DIR, "collection.log")

os.makedirs(IMAGES_DIR, exist_ok=True)
os.makedirs(METADATA_DIR, exist_ok=True)
os.makedirs(LOGS_DIR, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)

CSV_FIELDNAMES = [
    "image_path",
    "storm_id",
    "observation_timestamp",
    "wind_speed_knots",
    "latitude",
    "longitude",
    "satellite_source",
    "image_product",
    "source_image_identifier",
    "label_source",
    "label_agency",
    "matching_time_difference",
    "checksum",
    "verification_status"
]

def get_gibs_wms_url(lat: float, lon: float, date_str: str, size: int = 512, span_deg: float = 5.0) -> str:
    """
    Constructs NASA GIBS WMS EPSG:4326 URL for true-color MODIS Terra imagery.
    """
    lon_min = max(-180.0, lon - span_deg)
    lon_max = min(180.0, lon + span_deg)
    lat_min = max(-90.0, lat - span_deg)
    lat_max = min(90.0, lat + span_deg)
    
    url = (
        "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?"
        "SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&"
        "LAYERS=MODIS_Terra_CorrectedReflectance_TrueColor&"
        "STYLES=&FORMAT=image/jpeg&TRANSPARENT=false&"
        f"HEIGHT={size}&WIDTH={size}&"
        f"BBOX={lon_min},{lat_min},{lon_max},{lat_max}&"
        f"TIME={date_str}&SRS=EPSG:4326"
    )
    return url

def load_checkpoint() -> Dict[str, Any]:
    if os.path.exists(CHECKPOINT_JSON):
        try:
            with open(CHECKPOINT_JSON, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"processed_keys": [], "checksums": []}

def save_checkpoint(processed_keys: Set[str], checksums: Set[str], total_saved: int):
    data = {
        "total_saved": total_saved,
        "processed_keys": list(processed_keys),
        "checksums": list(checksums),
        "last_updated": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    with open(CHECKPOINT_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f)

def init_labels_csv():
    if not os.path.exists(LABELS_CSV):
        with open(LABELS_CSV, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=CSV_FIELDNAMES)
            writer.writeheader()

async def download_observation(
    session: aiohttp.ClientSession,
    obs: Dict[str, Any],
    sem: asyncio.Semaphore,
    known_checksums: Set[str]
) -> Dict[str, Any]:
    date_str = obs["iso_time"].split(" ")[0]
    time_str = obs["iso_time"].split(" ")[1] if " " in obs["iso_time"] else "00:00:00"
    hour = int(time_str.split(":")[0])
    
    # MODIS Terra nominal local equator crossing is ~10:30 AM local solar time.
    # Time delta to nominal 10:30 UTC equator reference:
    time_diff_hours = abs(hour - 10.5)
    matching_time_diff = f"{time_diff_hours:.1f}h"
    
    url = get_gibs_wms_url(obs["lat"], obs["lon"], date_str, size=512, span_deg=5.0)
    source_id = f"GIBS_MODIS_TERRA_{obs['storm_id']}_{date_str}_{obs['lat']}_{obs['lon']}"
    
    async with sem:
        for attempt in range(3):
            try:
                headers = {"User-Agent": "CycloSafe-Academic-Research/2.0 (NASA GIBS)"}
                async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=20)) as resp:
                    if resp.status != 200:
                        await asyncio.sleep(1.0 * (attempt + 1))
                        continue
                        
                    content = await resp.read()
                    
                    if content.startswith(b"<?xml") or len(content) < 3000:
                        # WMS error or empty tile
                        return {"status": "failed", "reason": "XML error response or empty content"}
                        
                    # Validate image decoding
                    try:
                        img = Image.open(BytesIO(content))
                        img.verify()
                    except Exception as e:
                        return {"status": "failed", "reason": f"Corrupt image payload: {e}"}
                        
                    # Re-open for extrema check (verify closes the image descriptor)
                    img = Image.open(BytesIO(content))
                    extrema = img.convert("L").getextrema()
                    if extrema[1] < 20 or (extrema[0] == 0 and extrema[1] == 0):
                        # Black swath or night pass
                        return {"status": "failed", "reason": "Missing swath data / orbital night darkness"}
                        
                    # Checksum calculation
                    sha = hashlib.sha256(content).hexdigest()
                    if sha in known_checksums:
                        return {"status": "duplicate", "checksum": sha}
                        
                    # Save image file
                    safe_filename = f"{obs['storm_id']}_{date_str}_{hour:02d}z_{sha[:8]}.jpg"
                    save_path = os.path.join(IMAGES_DIR, safe_filename)
                    with open(save_path, "wb") as f_out:
                        f_out.write(content)
                        
                    record = {
                        "image_path": os.path.relpath(save_path, BASE_DIR).replace("\\", "/"),
                        "storm_id": obs["storm_id"],
                        "observation_timestamp": obs["iso_time"],
                        "wind_speed_knots": obs["wind_speed_knots"],
                        "latitude": obs["lat"],
                        "longitude": obs["lon"],
                        "satellite_source": "NASA EOSDIS / MODIS Terra",
                        "image_product": "CorrectedReflectance_TrueColor",
                        "source_image_identifier": source_id,
                        "label_source": obs["label_source"],
                        "label_agency": obs["label_agency"],
                        "matching_time_difference": matching_time_diff,
                        "checksum": sha,
                        "verification_status": "VERIFIED_GENUINE_SATELLITE"
                    }
                    return {"status": "success", "record": record, "checksum": sha}
                    
            except asyncio.TimeoutError:
                await asyncio.sleep(1.5 * (attempt + 1))
            except Exception as e:
                await asyncio.sleep(1.0 * (attempt + 1))
                
        return {"status": "failed", "reason": "Max retries exceeded"}

async def run_collection(candidate_obs: List[Dict[str, Any]], max_to_download: int = 40000, concurrency: int = 12):
    init_labels_csv()
    ckpt = load_checkpoint()
    processed_keys = set(ckpt.get("processed_keys", []))
    known_checksums = set(ckpt.get("checksums", []))
    
    # Read existing checksums from labels.csv if present
    if os.path.exists(LABELS_CSV):
        with open(LABELS_CSV, "r", encoding="utf-8") as f:
            r = csv.DictReader(f)
            for row in r:
                if row.get("checksum"):
                    known_checksums.add(row["checksum"])
                if row.get("storm_id") and row.get("observation_timestamp"):
                    processed_keys.add(f"{row['storm_id']}_{row['observation_timestamp']}")
                    
    logging.info(f"Loaded existing checkpoint: {len(processed_keys)} processed, {len(known_checksums)} unique checksums.")
    
    # Filter candidates not yet processed
    pending = []
    for obs in candidate_obs:
        key = f"{obs['storm_id']}_{obs['iso_time']}"
        if key not in processed_keys:
            pending.append(obs)
            
    logging.info(f"Total candidates: {len(candidate_obs):,}. Pending downloads: {len(pending):,}. Target: {max_to_download:,}")
    
    if not pending or max_to_download <= 0:
        logging.info("No pending observations to download.")
        return
        
    targets = pending[:max_to_download]
    sem = asyncio.Semaphore(concurrency)
    
    conn = aiohttp.TCPConnector(limit=concurrency + 4)
    async with aiohttp.ClientSession(connector=conn) as session:
        csv_file = open(LABELS_CSV, "a", newline="", encoding="utf-8")
        csv_writer = csv.DictWriter(csv_file, fieldnames=CSV_FIELDNAMES)
        
        saved_count = 0
        duplicate_count = 0
        failed_count = 0
        
        chunk_size = 50
        for i in range(0, len(targets), chunk_size):
            chunk = targets[i:i + chunk_size]
            tasks = [download_observation(session, obs, sem, known_checksums) for obs in chunk]
            results = await asyncio.gather(*tasks)
            
            for obs, res in zip(chunk, results):
                key = f"{obs['storm_id']}_{obs['iso_time']}"
                processed_keys.add(key)
                
                if res["status"] == "success":
                    csv_writer.writerow(res["record"])
                    csv_file.flush()
                    known_checksums.add(res["checksum"])
                    saved_count += 1
                elif res["status"] == "duplicate":
                    duplicate_count += 1
                else:
                    failed_count += 1
                    
            save_checkpoint(processed_keys, known_checksums, total_saved=len(known_checksums))
            
            if (i + chunk_size) % 100 == 0 or (i + len(chunk)) == len(targets):
                logging.info(
                    f"Progress: [{min(i + chunk_size, len(targets))}/{len(targets)}] "
                    f"Saved: {saved_count} | Duplicates: {duplicate_count} | Failed/Swath Gap: {failed_count} | Total Unique: {len(known_checksums)}"
                )
                
        csv_file.close()

    logging.info(f"Collection run finished. Total unique verified images: {len(known_checksums):,}")

if __name__ == "__main__":
    import argparse
    from parse_ibtracs import parse_ibtracs_file
    
    parser = argparse.ArgumentParser(description="CycloSafe Intensity Dataset Collector")
    parser.add_argument("--limit", type=int, default=20, help="Maximum number of images to download in this run")
    parser.add_argument("--concurrency", type=int, default=10, help="Concurrent async HTTP downloads")
    args = parser.parse_args()
    
    # Load primary North Indian Ocean observations first
    ni_csv = r"D:\Dowloads\ibtracs.NI.list.v04r01.csv"
    candidates = []
    if os.path.exists(ni_csv):
        candidates.extend(parse_ibtracs_file(ni_csv, min_year=2000))
        
    # Also include any downloaded basin files
    basins_dir = os.path.join(METADATA_DIR, "ibtracs_basins")
    if os.path.exists(basins_dir):
        for fname in os.listdir(basins_dir):
            if fname.endswith(".csv"):
                fpath = os.path.join(basins_dir, fname)
                candidates.extend(parse_ibtracs_file(fpath, min_year=2000))
                
    if os.name == "nt":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    asyncio.run(run_collection(candidates, max_to_download=args.limit, concurrency=args.concurrency))
