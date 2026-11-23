"""Builds index.html: one self-contained file (styles, libraries and game code inlined)."""
import os
d = os.path.dirname(os.path.abspath(__file__))
rd = lambda p: open(os.path.join(d, p), encoding='utf-8').read()
esc = lambda s: s.replace('</script', '<\\/script')
app = '\n'.join(rd('src/' + f) for f in ['engine.js', 'ui.js', 'net.js', 'host.js', 'client.js', 'main.js'])
html = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<meta name="color-scheme" content="light dark"><title>Disruption Cycle: Capital Markets</title><style>' + rd('src/style.css') + '</style></head>'
        '<body><div id="app"></div><script>' + esc(rd('vendor/mqtt.min.js')) + '</script><script>' + esc(rd('vendor/qrcode.js')) + '</script><script>' + esc(app) + '</script></body></html>')
open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(html)
print('index.html', len(html), 'bytes')
