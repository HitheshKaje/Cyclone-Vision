import urllib.request, re

js = urllib.request.urlopen('https://embed.windy.com/v/41.1.0.emb.b79a/embed2.js').read().decode('utf-8')
# Find where TileRenderer or tileLayer is created
pos = js.find('leaflet-canvas')
print("leaflet-canvas snippet:")
print(js[pos-100:pos+200])
