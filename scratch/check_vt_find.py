import urllib.request, re

js = urllib.request.urlopen('https://embed.windy.com/v/41.1.0.emb.b79a/embed2.js').read().decode('utf-8')
matches = re.findall(r'(\w+)\s*=\s*new\s+\w+\(\{[^}]*particles:[^}]*\}\)', js)
print("matches:", matches)
pos = js.find('vt=')
if pos != -1:
    print(js[pos-50:pos+300])
else:
    print("vt= not found")
