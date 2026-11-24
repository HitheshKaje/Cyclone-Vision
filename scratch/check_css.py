import urllib.request

css = urllib.request.urlopen('https://embed.windy.com/v/41.1.0.emb.b79a/embed2.css').read().decode('utf-8')
idx = 0
while True:
    pos = css.find('hide-particles', idx)
    if pos == -1: break
    print(f"[{pos}]: {css[max(0, pos-50):min(len(css), pos+100)]}\n")
    idx = pos + 14
