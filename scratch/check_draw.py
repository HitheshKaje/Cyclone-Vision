import urllib.request

js = urllib.request.urlopen('https://embed.windy.com/v/41.1.0.emb.b79a/embed2.js').read().decode('utf-8')
pos = 296002
print(js[pos+200:pos+1200])
