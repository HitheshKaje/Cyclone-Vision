import urllib.request

js = urllib.request.urlopen('https://embed.windy.com/v/41.1.0.emb.b79a/embed2.js').read().decode('utf-8')
idx = 0
while True:
    pos = js.find('particlesAnim', idx)
    if pos == -1: break
    print(f"[{pos}]: {js[max(0, pos-80):min(len(js), pos+120)]}\n")
    idx = pos + 13
