#!/usr/bin/env python3
"""Refresh the sprite fingerprint manifest inside check.html.
Run after any boss art change, alongside bumping ASSET_V in js/boss.js."""
import hashlib, glob, json, re
manifest = {}
for p in sorted(glob.glob('assets/boss/mirrormines/*.png')) + sorted(glob.glob('assets/boss/infinityisles/*.png')):
    manifest[p] = {'sha': hashlib.sha256(open(p, 'rb').read()).hexdigest(), 'bytes': len(open(p, 'rb').read())}
src = open('check.html').read()
src = re.sub(r'var MANIFEST = \{.*?\};', 'var MANIFEST = ' + json.dumps(manifest) + ';', src, count=1, flags=re.S)
open('check.html', 'w').write(src)
print('manifest refreshed:', len(manifest), 'files')
