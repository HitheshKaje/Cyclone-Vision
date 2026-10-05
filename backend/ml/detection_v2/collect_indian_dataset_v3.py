import os
import csv
import random
import asyncio
import aiohttp
from io import BytesIO
from PIL import Image

# --- Configuration ---
TARGET_CYCLONE = 65000
TARGET_NO_CYCLONE = 85000
CONCURRENCY = 50 # Moderate to prevent API bans
IMG_SIZE = 224
OUTPUT_DIR = r"d:\MainProjectMl\ProjectCode\backend\ml\dataset_v3"
IBTRACS_URL = "https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/v04r00/access/csv/ibtracs.ALL.list.v04r00.csv"
IBTRACS_FILE = os.path.join(r"d:\MainProjectMl\ProjectCode\backend\ml", "ibtracs.csv")

os.makedirs(os.path.join(OUTPUT_DIR, "Cyclone"), exist_ok=True)
os.makedirs(os.path.join(OUTPUT_DIR, "No_Cyclone"), exist_ok=True)
os.makedirs(os.path.join(OUTPUT_DIR, "metadata"), exist_ok=True)

def get_gibs_url(lat, lon, time_str):
    lon_min, lon_max = max(-180, lon - 5.0), min(180, lon + 5.0)
    lat_min, lat_max = max(-90, lat - 5.0), min(90, lat + 5.0)
    date_str = time_str.split(" ")[0]
    
    return (
        "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?"
        "SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&"
        "LAYERS=MODIS_Terra_CorrectedReflectance_TrueColor&"
        "STYLES=&FORMAT=image/jpeg&TRANSPARENT=false&"
        f"HEIGHT={IMG_SIZE}&WIDTH={IMG_SIZE}&"
        f"BBOX={lon_min},{lat_min},{lon_max},{lat_max}&"
        f"TIME={date_str}&SRS=EPSG:4326"
    )

async def fetch_image(session, url, save_path):
    if os.path.exists(save_path): return True
    try:
        async with session.get(url, timeout=15) as response:
            if response.status == 200:
                content = await response.read()
                if content.startswith(b'<?xml'): return False
                img = Image.open(BytesIO(content))
                img.verify()
                
                img = Image.open(BytesIO(content))
                if img.convert("L").getextrema() == (0, 0): return False
                    
                img.save(save_path, "JPEG")
                return True
    except Exception:
        pass
    return False

async def worker(queue, session, pbar):
    while True:
        item = await queue.get()
        if item is None:
            queue.task_done()
            break
        url, save_path = item
        if await fetch_image(session, url, save_path):
            pbar['success'] += 1
        pbar['count'] += 1
        
        if pbar['count'] % 1000 == 0:
            print(f"Downloaded {pbar['success']} images so far...", flush=True)
        queue.task_done()

async def main():
    import urllib.request
    print("Checking for IBTrACS database...", flush=True)
    if not os.path.exists(IBTRACS_FILE):
        urllib.request.urlretrieve(IBTRACS_URL, IBTRACS_FILE)
    
    print("Parsing storms... Prioritizing Indian Ocean!", flush=True)
    indian_cyclones, global_cyclones = [], []
    
    with open(IBTRACS_FILE, 'r') as f:
        reader = csv.reader(f)
        next(reader); next(reader)
        for row in reader:
            if len(row) < 10: continue
            if not row[1].isdigit() or int(row[1]) < 2001: continue
                
            lat, lon = row[8].strip(), row[9].strip()
            if not lat or not lon or lat == ' ' or lon == ' ': continue
                
            obs = {'sid': row[0].strip(), 'time': row[6].strip(), 'lat': float(lat), 'lon': float(lon)}
            basin, nature, wind = row[3].strip(), row[7].strip(), row[19].strip()
            
            if nature in ['TS', 'NR'] or (wind and wind.isdigit() and int(wind) > 34):
                # Indian Ocean Priority (North AND South Indian Ocean, Arabian Sea, Bay of Bengal)
                if basin in ['NI', 'SI'] or (-40 <= obs['lat'] <= 30 and 40 <= obs['lon'] <= 100):
                    indian_cyclones.append(obs)
                else:
                    global_cyclones.append(obs)
                    
    random.shuffle(indian_cyclones)
    random.shuffle(global_cyclones)
    
    # Grab ALL Indian Ocean cyclones first, then pad with global cyclones to reach 65k
    cyclone_obs = (indian_cyclones + global_cyclones)[:int(TARGET_CYCLONE * 1.5)] 
    print(f"Found {len(indian_cyclones)} Indian Ocean cyclone observations! Padding with global.", flush=True)
    
    no_cyclone_obs = []
    print("Generating challenging Hard Negatives (focused on Indian Coastal regions)...", flush=True)
    for _ in range(int(TARGET_NO_CYCLONE * 1.5)):
        # 80% focus on Indian Ocean / Coastal Regions (North and South)
        if random.random() < 0.80:
            rlat, rlon = random.uniform(-40, 30), random.uniform(40, 100)
        else: # 20% global oceans
            rlat, rlon = random.uniform(-40, 40), random.uniform(-180, 180)
            
        ryear = random.randint(2005, 2023)
        no_cyclone_obs.append({
            'sid': f'NEG_{ryear}', 
            'time': f'{ryear}-{random.randint(1,12):02d}-{random.randint(1,28):02d} 12:00:00',
            'lat': rlat, 'lon': rlon
        })
        
    queue = asyncio.Queue()
    for i, obs in enumerate(cyclone_obs):
        queue.put_nowait((get_gibs_url(obs['lat'], obs['lon'], obs['time']), os.path.join(OUTPUT_DIR, "Cyclone", f"{obs['sid']}_{i}.jpg")))
    for i, obs in enumerate(no_cyclone_obs):
        queue.put_nowait((get_gibs_url(obs['lat'], obs['lon'], obs['time']), os.path.join(OUTPUT_DIR, "No_Cyclone", f"{obs['sid']}_neg_{i}.jpg")))
        
    print(f"Starting highly-concurrent download of up to {queue.qsize()} images...", flush=True)
    pbar = {'count': 0, 'success': 0}
    conn = aiohttp.TCPConnector(limit=CONCURRENCY)
    async with aiohttp.ClientSession(connector=conn) as session:
        workers = [asyncio.create_task(worker(queue, session, pbar)) for _ in range(CONCURRENCY)]
        await queue.join()
        for _ in range(CONCURRENCY): queue.put_nowait(None)
        await asyncio.gather(*workers)
        
    print(f"Download complete! Successfully downloaded {pbar['success']} images to dataset_v3.", flush=True)

if __name__ == "__main__":
    if os.name == 'nt': asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
