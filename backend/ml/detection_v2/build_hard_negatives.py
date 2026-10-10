import os
import time
import requests
from duckduckgo_search import DDGS
from concurrent.futures import ThreadPoolExecutor

# Keywords that look like cyclones but ARE NOT cyclones
SEARCH_QUERIES = [
    "ocean whirlpool from above",
    "spiral galaxy high resolution",
    "swirling coffee foam",
    "hurricane eye AI generated art",
    "spinning water drain",
    "hurricane optical illusion",
    "round white clouds from space",
    "circular weather pattern satellite"
]

TARGET_IMAGES_PER_QUERY = 1250 # 1250 * 8 = 10,000 images
OUTPUT_DIR = "Hard_Negatives_Dataset"

def download_image(url, save_path):
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            with open(save_path, 'wb') as f:
                f.write(response.content)
            return True
    except:
        pass
    return False

def scrape_category(query, count):
    print(f"[*] Searching for: {query}")
    ddgs = DDGS()
    results = ddgs.images(
        keywords=query,
        region="wt-wt",
        safesearch="moderate",
        max_results=count
    )
    
    category_dir = os.path.join(OUTPUT_DIR, query.replace(" ", "_"))
    os.makedirs(category_dir, exist_ok=True)
    
    urls = [res['image'] for res in results]
    print(f"[*] Found {len(urls)} images for '{query}'. Downloading...")
    
    success_count = 0
    with ThreadPoolExecutor(max_workers=10) as executor:
        for i, url in enumerate(urls):
            save_path = os.path.join(category_dir, f"{i}.jpg")
            if download_image(url, save_path):
                success_count += 1
                if success_count % 100 == 0:
                    print(f"  -> {query}: Downloaded {success_count} images")

    print(f"[+] Finished {query}: Successfully downloaded {success_count} images\n")
    return success_count

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"Starting dataset generation. Target: {len(SEARCH_QUERIES) * TARGET_IMAGES_PER_QUERY} images...")
    
    total_downloaded = 0
    for query in SEARCH_QUERIES:
        downloaded = scrape_category(query, TARGET_IMAGES_PER_QUERY)
        total_downloaded += downloaded
        time.sleep(2) # Be polite to the search engine
        
    print(f"\n[SUCCESS] Dataset generation complete!")
    print(f"Total Hard Negative images downloaded: {total_downloaded}")
    print(f"They are saved in the '{OUTPUT_DIR}' folder.")
    print("Next step: Upload this folder to your Google Drive 'No_Cyclone' folder and re-run Colab!")

if __name__ == "__main__":
    main()
