#!/usr/bin/env python3
"""Inventory optimized models and distinguish repository materials from startup assets."""
from pathlib import Path
from io import BytesIO
from PIL import Image
import json,struct
root=Path(__file__).resolve().parents[1]
active={'hedgehog-plush-single-colored','felt-forest-with-mushrooms','fuzzy-egg-game','fern-plant-ground','fern-plant-game','stylized-tree-game','log-game','mossy-shrub-cluster-game','glowing-wool-cave-game'}
models=[]
for path in sorted((root/'public/assets/models').glob('*.glb')):
    raw=path.read_bytes();length=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+length]);start=28+length
    triangles=sum(doc['accessors'][p['indices']]['count']//3 for m in doc.get('meshes',[]) for p in m['primitives'] if 'indices' in p)
    textures=[]
    for image in doc.get('images',[]):
        view=doc['bufferViews'][image['bufferView']];offset=start+view.get('byteOffset',0)
        im=Image.open(BytesIO(raw[offset:offset+view['byteLength']]))
        textures.append({'name':image.get('name',''),'width':im.width,'height':im.height,'encodedBytes':view['byteLength']})
    models.append({'path':str(path.relative_to(root)),'usage':'current' if path.stem in active else 'legacy-review-only','bytes':len(raw),'triangles':triangles,'textures':textures})
folders=[]
for name in ['public/assets/models','reviews/snapshots','reviews/source-glb','public/assets/references','public/assets/icons','src','vendor']:
    files=[p for p in (root/name).rglob('*') if p.is_file()]
    folders.append({'path':name,'files':len(files),'bytes':sum(p.stat().st_size for p in files),'startup':'embedded current models only' if name=='public/assets/models' else 'only accepted bundle' if name=='reviews/snapshots' else 'no','upload':name!='reviews/source-glb'})
release=json.loads((root/'public/release-manifest.json').read_text())
assets=[f for f in release['files'] if f['path']!='reviews/stage-5a.html']
report={'releaseId':release['releaseId'],'models':models,'folders':folders,'releaseFiles':assets,'releaseBytes':sum(f['bytes'] for f in assets),'releaseGzipEstimateBytes':sum(f['gzipBytes'] for f in assets),'notes':['Startup network graph is index + two hashed scripts + referenced WebP icons; model GLBs are embedded, not fetched again.','Gzip size is a local compression estimate; real transfer depends on CDN headers and browser caching.','Raw reviews/source-glb archives stay local and are ignored by Git; no files deleted.','Legacy sources/review snapshots are retained for provenance and are not loaded by the production entry.']}
(root/'docs/reports/resource-inventory.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:report[k] for k in ['releaseId','releaseBytes','releaseGzipEstimateBytes']}))
