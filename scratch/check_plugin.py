import urllib.request

try:
    js = urllib.request.urlopen('https://embed.windy.com/v/41.1.0.emb.b79a/plugins/gl-particles.js').read().decode('utf-8')
    print("gl-particles.js found! Length:", len(js))
    pos = js.find('particlesAnim')
    print("particlesAnim in gl-particles:", pos)
    if pos != -1:
        print(js[pos-50:pos+150])
except Exception as e:
    print("error:", e)

try:
    js2 = urllib.request.urlopen('https://embed.windy.com/v/41.1.0.emb.b79a/plugins/particles.js').read().decode('utf-8')
    print("particles.js found! Length:", len(js2))
    pos2 = js2.find('particlesAnim')
    print("particlesAnim in particles.js:", pos2)
    if pos2 != -1:
        print(js2[pos2-50:pos2+150])
except Exception as e:
    print("error2:", e)
