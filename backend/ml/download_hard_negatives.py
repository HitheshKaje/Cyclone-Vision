import os
import json
import requests
import imagehash
from PIL import Image, UnidentifiedImageError
from duckduckgo_search import DDGS
from io import BytesIO
import time

# --- Configuration ---
BASE_DATASET_DIR = r"d:\MainProjectMl\ProjectCode\backend\ml\dataset"
REVIEW_DIR = os.path.join(BASE_DATASET_DIR, "hard_negatives_review")
OOD_CHALLENGE_DIR = os.path.join(BASE_DATASET_DIR, "ood_challenge_review")
REPORT_PATH = os.path.join(REVIEW_DIR, "collection_report.json")

# Ensure the base dataset structure exists to verify path correctness
if not os.path.exists(os.path.join(BASE_DATASET_DIR, "Cyclone")) or \
   not os.path.exists(os.path.join(BASE_DATASET_DIR, "No_Cyclone")):
    print(f"Error: Base dataset directory structure not found at {BASE_DATASET_DIR}")
    print("Cannot verify the actual Objective 1 dataset path. Exiting.")
    exit(1)

os.makedirs(REVIEW_DIR, exist_ok=True)
os.makedirs(OOD_CHALLENGE_DIR, exist_ok=True)

# Define exact queries and target amounts
QUERIES = [
    # 1. 100 Satellite/Weather Hard-Negatives
    {"query": "thunderstorm satellite", "category": "weather_hard_negative", "target": 35, "dir": REVIEW_DIR},
    {"query": "monsoon cloud satellite", "category": "weather_hard_negative", "target": 35, "dir": REVIEW_DIR},
    {"query": "squall line satellite", "category": "weather_hard_negative", "target": 30, "dir": REVIEW_DIR},
    
    # 2. 50 Clear Ocean / Non-Cyclone satellite images
    {"query": "clear ocean satellite", "category": "clear_ocean", "target": 25, "dir": REVIEW_DIR},
    {"query": "sea surface satellite", "category": "clear_ocean", "target": 25, "dir": REVIEW_DIR},
    
    # 3. 50 Difficult cloud/weather images
    {"query": "tropical disturbance", "category": "difficult_cloud", "target": 25, "dir": REVIEW_DIR},
    {"query": "cloud formation satellite", "category": "difficult_cloud", "target": 25, "dir": REVIEW_DIR},
    
    # 4. 50 OOD Challenge images (Galaxy / Black hole) - SEPARATE FOLDER
    {"query": "spiral galaxy", "category": "ood_challenge", "target": 25, "dir": OOD_CHALLENGE_DIR},
    {"query": "black hole accretion", "category": "ood_challenge", "target": 25, "dir": OOD_CHALLENGE_DIR},
]

# State
existing_hashes = set()
download_report = []
stats = {
    "total_downloaded": 0,
    "total_rejected": 0,
    "total_duplicates": 0,
    "categories": {}
}

# --- Functions ---

def get_image_hash(img: Image.Image) -> str:
    """Returns perceptual hash of a PIL image."""
    return str(imagehash.phash(img))

def load_existing_dataset_hashes():
    """Hashes all existing images in the dataset to prevent downloading duplicates."""
    print("Hashing existing dataset to prevent duplicates...")
    for class_name in ["Cyclone", "No_Cyclone"]:
        folder = os.path.join(BASE_DATASET_DIR, class_name)
        if not os.path.exists(folder): continue
        for fname in os.listdir(folder):
            if fname.lower().endswith(('.png', '.jpg', '.jpeg')):
                filepath = os.path.join(folder, fname)
                try:
                    with Image.open(filepath) as img:
                        existing_hashes.add(get_image_hash(img))
                except Exception:
                    pass
    print(f"Loaded {len(existing_hashes)} existing hashes.")

def download_and_validate(url, category, save_dir):
    """Downloads an image, validates it, checks for duplicates, and saves it."""
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        
        # 1. Valid Image Check
        try:
            img = Image.open(BytesIO(resp.content))
            img.verify() # Verify structure
            img = Image.open(BytesIO(resp.content)) # Re-open for actual processing
        except UnidentifiedImageError:
            return "rejected", "Invalid image format"
            
        # 2. Dimensions check (min 224x224)
        if img.width < 224 or img.height < 224:
            return "rejected", f"Too small: {img.width}x{img.height}"
            
        # 3. Duplicate check via Hash
        img_hash = get_image_hash(img)
        if img_hash in existing_hashes:
            return "duplicate", "Hash matched existing image"
            
        # Convert to RGB
        if img.mode != 'RGB':
            img = img.convert('RGB')
            
        # Safe filename
        filename = f"{category}_{img_hash}.jpg"
        filepath = os.path.join(save_dir, filename)
        
        # Save
        img.save(filepath, "JPEG", quality=90)
        existing_hashes.add(img_hash)
        
        return "success", {
            "filename": filename,
            "dimensions": f"{img.width}x{img.height}"
        }

    except requests.exceptions.RequestException as e:
        return "rejected", f"Download failed"
    except Exception as e:
        return "rejected", f"Processing error: {str(e)}"

# --- Main Logic ---

def search_wikimedia(query, limit=50):
    import requests
    url = "https://commons.wikimedia.org/w/api.php"
    params = {
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrsearch": f"filetype:bitmap {query}",
        "gsrnamespace": "6", # File namespace
        "gsrlimit": limit,
        "prop": "imageinfo",
        "iiprop": "url",
    }
    urls = []
    try:
        r = requests.get(url, params=params, headers={"User-Agent": "CycloneVision/1.0"}, timeout=10)
        data = r.json()
        if "query" in data and "pages" in data["query"]:
            for page_id, page in data["query"]["pages"].items():
                if "imageinfo" in page:
                    urls.append(page["imageinfo"][0]["url"])
    except Exception as e:
        print(f"Wikimedia API error: {e}")
    return urls

def main():
    print(f"Verified Base Dataset Path: {BASE_DATASET_DIR}")
    print(f"Review Dir: {REVIEW_DIR}")
    print(f"OOD Challenge Dir: {OOD_CHALLENGE_DIR}")
    
    load_existing_dataset_hashes()
    
    for q_data in QUERIES:
        query = q_data["query"]
        category = q_data["category"]
        target = q_data["target"]
        save_dir = q_data["dir"]
        
        if category not in stats["categories"]:
            stats["categories"][category] = 0
            
        print(f"\nSearching: '{query}' (Target: {target} for {category})")
        
        # Use Wikimedia Commons instead of DuckDuckGo due to rate limits
        results = search_wikimedia(query, limit=target * 3)
        
        success_count = 0
        for i, url in enumerate(results):
            if success_count >= target:
                break
                
            time.sleep(0.1) # Be nice to wikimedia
            
            status, result_data = download_and_validate(url, category, save_dir)
            
            record = {
                "source_url": url,
                "search_category": category,
                "status": status
            }
            
            if status == "success":
                success_count += 1
                stats["total_downloaded"] += 1
                stats["categories"][category] += 1
                record["filename"] = result_data["filename"]
                record["dimensions"] = result_data["dimensions"]
                record["duplicate_status"] = "Unique"
                print(f"  [{success_count}/{target}] SUCCESS: {result_data['filename']}")
            elif status == "duplicate":
                stats["total_duplicates"] += 1
                record["duplicate_status"] = "Duplicate"
                record["reason"] = result_data
            else:
                stats["total_rejected"] += 1
                record["reason"] = result_data
                
            download_report.append(record)
            
    # Save Report
    with open(REPORT_PATH, 'w') as f:
        json.dump({
            "stats": stats,
            "records": download_report
        }, f, indent=4)
        
    print("\n" + "="*50)
    print("COLLECTION COMPLETE")
    print("="*50)
    print(f"- Exact folder location (Review): {REVIEW_DIR}")
    print(f"- Exact folder location (OOD): {OOD_CHALLENGE_DIR}")
    print(f"- Number of images downloaded: {stats['total_downloaded']}")
    print(f"- Number rejected: {stats['total_rejected']}")
    print(f"- Number of duplicates: {stats['total_duplicates']}")
    print("- Number in each category:")
    for cat, count in stats["categories"].items():
        print(f"  * {cat}: {count}")
    print("- Source/domain of each category: Wikimedia Commons API")
    print("="*50)
    print("STOPPING: Waiting for approval before moving anything into the training dataset.")

if __name__ == "__main__":
    main()
