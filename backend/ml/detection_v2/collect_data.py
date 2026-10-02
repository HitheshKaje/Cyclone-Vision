import os
import json
import requests
import time
import imagehash
from PIL import Image, UnidentifiedImageError
from io import BytesIO

BASE_DATASET_DIR = r"d:\MainProjectMl\ProjectCode\backend\ml\dataset_v2"
REPORT_PATH = os.path.join(BASE_DATASET_DIR, "collection_report.json")

# Define Storms for CYCLONE (To allow event-level splitting)
STORM_QUERIES = [
    # Indian Ocean / Bay of Bengal / Arabian Sea
    "Cyclone Amphan satellite", "Cyclone Fani satellite", "Cyclone Phailin satellite",
    "Cyclone Hudhud satellite", "Cyclone Vardah satellite", "Cyclone Ockhi satellite",
    "Cyclone Titli satellite", "Cyclone Gaja satellite", "Cyclone Nivar satellite",
    "Cyclone Tauktae satellite", "Cyclone Yaas satellite", "Cyclone Biparjoy satellite",
    "Cyclone Mocha satellite", "Cyclone Asani satellite", "Cyclone Mandous satellite",
    "Cyclone Nisarga satellite", "Cyclone Vayu satellite", "Cyclone Kyarr satellite",
    "Cyclone Maha satellite", "Cyclone Hikaa satellite", "Cyclone Luban satellite",
    "Cyclone Mekunu satellite", "Cyclone Sagar satellite", "Cyclone Chapala satellite",
    # Other regions for diversity
    "Hurricane Katrina satellite", "Hurricane Sandy satellite", "Hurricane Harvey satellite",
    "Hurricane Irma satellite", "Hurricane Maria satellite", "Hurricane Dorian satellite",
    "Typhoon Haiyan satellite", "Typhoon Mangkhut satellite", "Typhoon Jebi satellite",
    "Typhoon Hagibis satellite", "Typhoon Yutu satellite", "Typhoon Goni satellite"
]

NO_CYCLONE_QUERIES = [
    "clear ocean satellite", "thunderstorm satellite", "squall line satellite",
    "monsoon cloud satellite", "tropical disturbance satellite", "trade wind cumulus satellite",
    "extratropical cyclone satellite", "stratocumulus clouds satellite",
    "weather front satellite", "marine boundary layer clouds satellite",
    "bay of bengal satellite clear", "arabian sea satellite clear", "indian ocean satellite clear",
    "saharan air layer satellite", "intertropical convergence zone satellite"
]

existing_hashes = set()

def get_image_hash(img: Image.Image) -> str:
    return str(imagehash.phash(img))

def load_existing_hashes():
    for cls in ["Cyclone", "No_Cyclone"]:
        cls_dir = os.path.join(BASE_DATASET_DIR, cls)
        if not os.path.exists(cls_dir): continue
        for fname in os.listdir(cls_dir):
            if fname.lower().endswith(('.png', '.jpg', '.jpeg')):
                try:
                    with Image.open(os.path.join(cls_dir, fname)) as img:
                        existing_hashes.add(get_image_hash(img))
                except:
                    pass
    print(f"Loaded {len(existing_hashes)} existing hashes.")

from duckduckgo_search import DDGS

def search_ddg(query, limit=50):
    urls = []
    try:
        with DDGS() as ddgs:
            results = ddgs.images(query, max_results=limit)
            for r in results:
                urls.append(r['image'])
    except Exception as e:
        print(f"DDG API error for {query}: {e}")
    return urls

def download_and_validate(url, save_dir, prefix, storm_id=None):
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        
        try:
            img = Image.open(BytesIO(resp.content))
            img.verify()
            img = Image.open(BytesIO(resp.content))
        except UnidentifiedImageError:
            return False, "Invalid image"
            
        if img.width < 224 or img.height < 224:
            return False, "Too small"
            
        img_hash = get_image_hash(img)
        if img_hash in existing_hashes:
            return False, "Duplicate"
            
        if img.mode != 'RGB':
            img = img.convert('RGB')
            
        storm_str = f"{storm_id}_" if storm_id else ""
        filename = f"{prefix}_{storm_str}{img_hash}.jpg"
        filepath = os.path.join(save_dir, filename)
        
        img.save(filepath, "JPEG", quality=90)
        existing_hashes.add(img_hash)
        
        return True, filename

    except Exception as e:
        return False, str(e)

def main():
    os.makedirs(os.path.join(BASE_DATASET_DIR, "Cyclone"), exist_ok=True)
    os.makedirs(os.path.join(BASE_DATASET_DIR, "No_Cyclone"), exist_ok=True)
    
    load_existing_hashes()
    
    report = {"cyclones": {}, "no_cyclones": {}}
    
    print("Downloading CYCLONE images...")
    for storm in STORM_QUERIES:
        storm_id = storm.replace(" ", "_").replace("satellite", "").strip()
        print(f"Searching for {storm}...")
        urls = search_ddg(storm, limit=50)
        success_count = 0
        for url in urls:
            time.sleep(0.1)
            success, result = download_and_validate(
                url, os.path.join(BASE_DATASET_DIR, "Cyclone"), "cyclone", storm_id
            )
            if success:
                success_count += 1
                if success_count >= 30: # Max 30 per storm to avoid imbalance
                    break
        report["cyclones"][storm_id] = success_count
        print(f"  -> Got {success_count} images for {storm_id}")
        
    print("Downloading NO_CYCLONE images...")
    for query in NO_CYCLONE_QUERIES:
        q_id = query.replace(" ", "_").replace("satellite", "").strip()
        print(f"Searching for {query}...")
        urls = search_ddg(query, limit=100)
        success_count = 0
        for url in urls:
            time.sleep(0.1)
            success, result = download_and_validate(
                url, os.path.join(BASE_DATASET_DIR, "No_Cyclone"), "nocyclone", q_id
            )
            if success:
                success_count += 1
                if success_count >= 60: # Max 60 per query
                    break
        report["no_cyclones"][q_id] = success_count
        print(f"  -> Got {success_count} images for {q_id}")
        
    with open(REPORT_PATH, 'w') as f:
        json.dump(report, f, indent=4)
        
    print("Collection Complete.")

if __name__ == "__main__":
    main()
