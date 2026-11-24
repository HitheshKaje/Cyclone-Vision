import urllib.request

html = urllib.request.urlopen('https://embed.windy.com/embed2.html').read().decode('utf-8')
print("Full HTML:")
print(html)
