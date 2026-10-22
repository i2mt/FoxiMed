#!/usr/bin/env python3
"""Regenerate after editing any packaged runtime file; exclude the manifest itself."""
import hashlib,json,re,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
sw=(root/'service-worker.js').read_text()
block=sw.split('const urlsToCache = [',1)[1].split('];',1)[0]
urls=[u for u in re.findall(r"'\./([^']+)'",block) if not u.startswith('reference-offline-manifest.json')]
urls += [f'drug-reference-book-{i:02}.js?v=4' for i in range(1,11)]+['drug-reference-source.pdf']
files=[]
for url in dict.fromkeys(urls):
 data=(root/url.split('?')[0]).read_bytes();files.append({'url':url,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
version=re.search(r"const APP_VERSION = '([^']+)'",(root/'script.js').read_text())[1]
assert re.search(r"const VERSION='([^']+)'",(root/'reference-offline.js').read_text())[1]==version, 'Offline module and app versions differ'
m={'schema':1,'version':version,'scope':'Full reference text, source PDF, and same-origin app shell; excludes voice model and external icon/font CDN assets.','files':files}
output=json.dumps(m,ensure_ascii=False,indent=2)+'\n'
if '--check' in sys.argv:
 assert (root/'reference-offline-manifest.json').read_text()==output, 'Offline manifest is stale; regenerate before publishing'
else:(root/'reference-offline-manifest.json').write_text(output)
print(json.dumps({'files':len(files),'bytes':sum(f['bytes'] for f in files),'MiB':round(sum(f['bytes'] for f in files)/1048576,2)}))
