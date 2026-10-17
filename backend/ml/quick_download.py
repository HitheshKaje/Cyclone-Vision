import os
import requests
import time

NO_CYCLONE_DIR = r'd:\MainProjectMl\ProjectCode\backend\ml\dataset\No_Cyclone'

urls = [
    # Galaxies / Black Holes
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/M101_hires_STScI-PRC2006-10a.jpg/800px-M101_hires_STScI-PRC2006-10a.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/NGC_4414_%28NASA-med%29.jpg/800px-NGC_4414_%28NASA-med%29.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Andromeda_Galaxy_%28with_h-alpha%29.jpg/800px-Andromeda_Galaxy_%28with_h-alpha%29.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Black_hole_-_Messier_87_crop_max_res.jpg/800px-Black_hole_-_Messier_87_crop_max_res.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Black_hole_-_Messier_87.jpg/800px-Black_hole_-_Messier_87.jpg',
    
    # Non-cyclone weather / clouds
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Thunderstorm_in_Ann_Arbor.jpg/800px-Thunderstorm_in_Ann_Arbor.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Squall_line_approaching.jpg/800px-Squall_line_approaching.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Cumulonimbus_incus_cloud.jpg/800px-Cumulonimbus_incus_cloud.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Cloud_over_sea.jpg/800px-Cloud_over_sea.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Clear_ocean.jpg/800px-Clear_ocean.jpg'
]

for i, url in enumerate(urls):
    try:
        r = requests.get(url, timeout=10)
        if r.status_code == 200:
            with open(os.path.join(NO_CYCLONE_DIR, f'hard_negative_{i}.jpg'), 'wb') as f:
                f.write(r.content)
            print(f'Downloaded {url}')
    except Exception as e:
        print(f'Failed {url}: {e}')
