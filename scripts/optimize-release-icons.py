#!/usr/bin/env python3
"""Create pixel-exact WebP derivatives; keep accepted original PNGs untouched."""
from pathlib import Path
from PIL import Image
import json

root=Path(__file__).resolve().parents[1]
source=root/'public/assets/icons'
target=root/'public/assets/icons-webp'
records=[]
for path in sorted(source.rglob('*.png')):
    image=Image.open(path).convert('RGBA')
    output=(target/path.relative_to(source)).with_suffix('.webp')
    output.parent.mkdir(parents=True,exist_ok=True)
    image.save(output,'WEBP',lossless=True,exact=True,method=6)
    decoded=Image.open(output).convert('RGBA')
    if decoded.tobytes()!=image.tobytes():
        raise RuntimeError(f'Lossless pixel verification failed: {path.name}')
    records.append({'source':str(path.relative_to(root)),'output':str(output.relative_to(root)),'originalBytes':path.stat().st_size,'releaseBytes':output.stat().st_size,'rgbaExact':True})
report={'icons':records,'originalBytes':sum(x['originalBytes'] for x in records),'releaseBytes':sum(x['releaseBytes'] for x in records)}
(root/'docs/reports').mkdir(parents=True,exist_ok=True)
(root/'docs/reports/icon-optimization.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='icons'}))
