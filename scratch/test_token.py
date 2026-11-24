import urllib.request

js = urllib.request.urlopen('https://embed.windy.com/v/41.1.0.emb.b79a/embed2.js').read().decode('utf-8')
pos = js.find('token')
while pos != -1:
    print(js[max(0, pos-40):min(len(js), pos+100)])
    pos = js.find('token', pos+5)
