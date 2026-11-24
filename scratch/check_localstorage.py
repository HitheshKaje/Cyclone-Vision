import urllib.request

js = urllib.request.urlopen('https://embed.windy.com/v/41.1.0.emb.b79a/embed2.js').read().decode('utf-8')
pos = 0
while True:
    pos = js.find('localStorage', pos)
    if pos == -1: break
    print(f"[{pos}]: {js[max(0, pos-40):min(len(js), pos+120)]}\n")
    pos += 12
