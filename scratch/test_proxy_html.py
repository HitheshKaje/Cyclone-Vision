import requests

url = "https://embed.windy.com/embed2.html?lat=16.4&lon=81.8&zoom=6&overlay=rh"
headers = {"User-Agent": "Mozilla/5.0"}
r = requests.get(url, headers=headers)
html = r.text

injection = """
<script>
try {
    window.localStorage.setItem("particlesAnim", JSON.stringify("off"));
} catch(e) {}
</script>
<style>
    .leaflet-canvas, canvas.leaflet-layer {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
    }
</style>
"""
html = html.replace("</head>", f"{injection}</head>")
html = html.replace('<body class="target-embed">', '<body class="target-embed hide-particles no-particles">')
html = html.replace('href="v/', 'href="https://embed.windy.com/v/')
html = html.replace('src="js/', 'src="https://embed.windy.com/js/')
html = html.replace('src="v/', 'src="https://embed.windy.com/v/')
html = html.replace('src="/img/', 'src="https://embed.windy.com/img/')

print("Modified HTML length:", len(html))
print("Contains injection:", "particlesAnim" in html)
print("Contains absolute URLs:", "https://embed.windy.com/v/" in html)
