import urllib.request, re

js = urllib.request.urlopen('https://embed.windy.com/v/41.1.0.emb.b79a/embed2.js').read().decode('utf-8')
matches = re.findall(r'ident:"([^"]+)"[^}]*layers:\[([^\]]+)\]', js)
for m in matches[:50]:
    print(f"{m[0]} --> {m[1]}")
