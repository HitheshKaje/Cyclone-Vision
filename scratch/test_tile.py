import urllib.request

req = urllib.request.Request(
    'https://ims.windy.com/im/v3.0/forecast/ecmwf-hres/2026112318/temp/surface/3/3/2.jpg',
    headers={'User-Agent': 'Mozilla/5.0'}
)
try:
    res = urllib.request.urlopen(req)
    print("Tile request success, code:", res.getcode(), "content-type:", res.headers.get('content-type'))
except Exception as e:
    print("Tile error:", e)
