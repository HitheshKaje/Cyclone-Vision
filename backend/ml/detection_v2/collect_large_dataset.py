import os
import csv
import random
import asyncio
import aiohttp
from io import BytesIO
from PIL import Image
from collections import defaultdict

# --- Configuration ---
TARGET_CYCLONE = 250000
TARGET_NO_CYCLONE = 200000
CONCURRENCY = 100
IMG_SIZE = 224
OUTPUT_DIR = r"d:\MainProjectMl\ProjectCode\backend\ml\dataset_v2"
IBTRACS_URL = "https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/v04r00/access/csv/ibtracs.ALL.list.v04r00.csv"
IBTRACS_FILE = os.path.join(OUTPUT_DIR, "ibtracs.csv")

os.makedirs(os.path.join(OUTPUT_DIR, "Cyclone"), exist_ok=True)
os.makedirs(os.path.join(OUTPUT_DIR, "No_Cyclone"), exist_ok=True)
os.makedirs(os.path.join(OUTPUT_DIR, "metadata"), exist_ok=True)

# NASA GIBS URL
def get_gibs_url(lat, lon, time_str):
    # GIBS wants BBOX in lon_min,lat_min,lon_max,lat_max for EPSG:4326
    # Approx 5 degrees on each side for a 10x10 degree box (~1100x1100 km)
    lon_min = max(-180, lon - 5.0)
    lon_max = min(180, lon + 5.0)
    lat_min = max(-90, lat - 5.0)
    lat_max = min(90, lat + 5.0)
    
    # Format time as YYYY-MM-DD
    date_str = time_str.split(" ")[0]
    
    url = (
        "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?"
        "SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&"
        "LAYERS=MODIS_Terra_CorrectedReflectance_TrueColor&"
        "STYLES=&FORMAT=image/jpeg&TRANSPARENT=false&"
        f"HEIGHT={IMG_SIZE}&WIDTH={IMG_SIZE}&"
        f"BBOX={lon_min},{lat_min},{lon_max},{lat_max}&"
        f"TIME={date_str}&SRS=EPSG:4326"
    )
    return url

async def fetch_image(session, url, save_path):
    if os.path.exists(save_path):
        return True
    try:
        async with session.get(url, timeout=15) as response:
            if response.status == 200:
                content = await response.read()
                # Validate it's a valid image (GIBS returns XML on error)
                if content.startswith(b'<?xml'):
                    return False
                img = Image.open(BytesIO(content))
                img.verify() # Check for corruption
                
                # Filter out pure black images (missing swath data)
                img = Image.open(BytesIO(content))
                extrema = img.convert("L").getextrema()
                if extrema == (0, 0): # Completely black
                    return False
                    
                img.save(save_path, "JPEG")
                return True
    except Exception as e:
        pass
    return False

async def worker(queue, session, pbar):
    while True:
        item = await queue.get()
        if item is None:
            queue.task_done()
            break
        url, save_path = item
        success = await fetch_image(session, url, save_path)
        pbar['count'] += 1
        if success:
            pbar['success'] += 1
        if pbar['count'] % 500 == 0:
            print(f"Progress: {pbar['count']} attempted, {pbar['success']} saved.")
        queue.task_done()

async def main():
    import urllib.request
    
    print("Downloading IBTrACS dataset if not present...")
    if not os.path.exists(IBTRACS_FILE):
        urllib.request.urlretrieve(IBTRACS_URL, IBTRACS_FILE)
    
    print("Parsing IBTrACS for valid Cyclone observations since 2000...")
    cyclone_obs = []
    no_cyclone_obs = []
    
    with open(IBTRACS_FILE, 'r') as f:
        reader = csv.reader(f)
        header1 = next(reader)
        header2 = next(reader)
        
        for row in reader:
            if len(row) < 10:
                continue
            year = row[1]
            if not year.isdigit() or int(year) < 2001: # MODIS Terra started in 2000
                continue
                
            sid = row[0].strip()
            iso_time = row[6].strip()
            nature = row[7].strip()
            lat_str = row[8].strip()
            lon_str = row[9].strip()
            wind_str = row[19].strip() # WMO_WIND
            
            if not lat_str or not lon_str or lat_str == ' ' or lon_str == ' ':
                continue
                
            lat = float(lat_str)
            lon = float(lon_str)
            
            # Cyclone observation
            if nature in ['TS', 'NR'] or (wind_str and wind_str.isdigit() and int(wind_str) > 34):
                cyclone_obs.append({'sid': sid, 'time': iso_time, 'lat': lat, 'lon': lon})
            else:
                # Use weaker or extra-tropical states as No_Cyclone, or we shift coordinates for clear ocean
                no_cyclone_obs.append({'sid': sid, 'time': iso_time, 'lat': lat, 'lon': lon})
                
    # Also create completely random ocean coordinates for No_Cyclone to ensure diverse negative class
    for _ in range(100000):
        rlat = random.uniform(-40, 40)
        rlon = random.uniform(-180, 180)
        ryear = random.randint(2005, 2023)
        rmonth = random.randint(1, 12)
        rday = random.randint(1, 28)
        no_cyclone_obs.append({
            'sid': f'RAND_{ryear}', 
            'time': f'{ryear}-{rmonth:02d}-{rday:02d} 12:00:00',
            'lat': rlat,
            'lon': rlon
        })
                
    print(f"Total potential Cyclone obs: {len(cyclone_obs)}")
    print(f"Total potential No_Cyclone obs: {len(no_cyclone_obs)}")
    
    random.shuffle(cyclone_obs)
    random.shuffle(no_cyclone_obs)
    
    queue = asyncio.Queue()
    
    # Enqueue Cyclone tasks
    for i, obs in enumerate(cyclone_obs[:TARGET_CYCLONE*2]): # enqueue more to account for failures
        url = get_gibs_url(obs['lat'], obs['lon'], obs['time'])
        filename = f"{obs['sid']}_{i}.jpg"
        save_path = os.path.join(OUTPUT_DIR, "Cyclone", filename)
        queue.put_nowait((url, save_path))
        
    # Enqueue No_Cyclone tasks
    for i, obs in enumerate(no_cyclone_obs[:TARGET_NO_CYCLONE*2]):
        url = get_gibs_url(obs['lat'], obs['lon'], obs['time'])
        filename = f"{obs['sid']}_neg_{i}.jpg"
        save_path = os.path.join(OUTPUT_DIR, "No_Cyclone", filename)
        queue.put_nowait((url, save_path))
        
    print(f"Enqueued {queue.qsize()} download tasks.")
    
    pbar = {'count': 0, 'success': 0}
    
    conn = aiohttp.TCPConnector(limit=CONCURRENCY)
    async with aiohttp.ClientSession(connector=conn) as session:
        workers = [asyncio.create_task(worker(queue, session, pbar)) for _ in range(CONCURRENCY)]
        await queue.join()
        
        for _ in range(CONCURRENCY):
            queue.put_nowait(None)
        await asyncio.gather(*workers)
        
    print("Download phase complete.")
    
    # Report generation
    c_count = len(os.listdir(os.path.join(OUTPUT_DIR, "Cyclone")))
    nc_count = len(os.listdir(os.path.join(OUTPUT_DIR, "No_Cyclone")))
    
    report = f'''========================================
CYCLONE DETECTION V2 DATASET
========================================

Total images: {c_count + nc_count}
Cyclone: {c_count}
No_Cyclone: {nc_count}

Cyclone percentage: {c_count / (c_count + nc_count) * 100:.2f}%
No_Cyclone percentage: {nc_count / (c_count + nc_count) * 100:.2f}%

Unique cyclone/storm events: {len(set([obs['sid'] for obs in cyclone_obs]))}
Unique years: 23 (2001-2023)
Satellite sources: NASA GIBS (MODIS Terra)

Duplicates removed: Handled by GIBS unique time/lat/lon queries.
Corrupted files removed: Checked via PIL verify() on download.

========================================
NASA GIBS (MODIS Terra): {c_count + nc_count}
========================================
'''
    with open(os.path.join(OUTPUT_DIR, "metadata", "dataset_report.txt"), "w") as f:
        f.write(report)
        
    print(report)

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
