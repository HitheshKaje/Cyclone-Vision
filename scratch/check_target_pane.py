import urllib.request

js = urllib.request.urlopen('https://embed.windy.com/v/41.1.0.emb.b79a/embed2.js').read().decode('utf-8')
pos = js.find('targetPane')
while pos != -1:
    print(js[pos-50:pos+150])
    pos = js.find('targetPane', pos+10)
