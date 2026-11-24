import urllib.request, re

js = urllib.request.urlopen('https://embed.windy.com/v/41.1.0.emb.b79a/embed2.js').read().decode('utf-8')
pos = js.find('userSettings')
if pos != -1:
    print(js[pos-100:pos+500])
else:
    print("userSettings not found")
