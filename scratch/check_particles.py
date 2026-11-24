import urllib.request, re

js = urllib.request.urlopen('https://embed.windy.com/v/41.1.0.emb.b79a/embed2.js').read().decode('utf-8')
# Find all occurrences of 'disableWebGL' or particle initialization
idx = 0
while True:
    pos = js.find('particles', idx)
    if pos == -1: break
    snippet = js[max(0, pos-100):min(len(js), pos+150)]
    if 'get(' in snippet or 'store' in snippet or 'params' in snippet or 'setting' in snippet:
        print(f"[{pos}]: {snippet}\n")
    idx = pos + 9
