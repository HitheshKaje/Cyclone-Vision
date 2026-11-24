import urllib.request, re

js = urllib.request.urlopen('https://embed.windy.com/v/41.1.0.emb.b79a/embed2.js').read().decode('utf-8')
idx = 0
while True:
    pos = js.find('particles', idx)
    if pos == -1: break
    snippet = js[max(0, pos-40):min(len(js), pos+80)]
    if 'set(' in snippet or 'default' in snippet or 'def' in snippet.lower():
        print(f"[{pos}]: {snippet}\n")
    idx = pos + 9
