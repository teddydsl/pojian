#!/usr/bin/env python3
"""Verify the published release over HTTPS, including decoded content hashes."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import gzip,hashlib,json,time,urllib.request
root=Path(__file__).resolve().parents[1]
manifest=json.loads((root/'public/release-manifest.json').read_text())
base='https://teddydsl.github.io/pojian/'
targets=[{'path':f['path'],'sha256':f['sha256']} for f in manifest['files']]
for name in ['reviews/demo-data-stage4.html','public/assets/icons/forest.svg']:
    targets.append({'path':name,'sha256':hashlib.sha256((root/name).read_bytes()).hexdigest()})

def check(entry):
    path=entry['path'];url=base+('' if path=='index.html' else path)+'?release='+manifest['releaseId']
    started=time.perf_counter()
    request=urllib.request.Request(url,headers={'Accept-Encoding':'gzip','Cache-Control':'no-cache','User-Agent':'Pojian-release-verification'})
    with urllib.request.urlopen(request,timeout=45) as response:
        raw=response.read();encoding=response.headers.get('Content-Encoding','identity')
        data=gzip.decompress(raw) if encoding=='gzip' else raw
        digest=hashlib.sha256(data).hexdigest()
        result={'path':path,'http':response.status,'matches':digest==entry['sha256'],'sha256':digest,'decodedBytes':len(data),'transferBytes':len(raw),'encoding':encoding,'seconds':round(time.perf_counter()-started,3),'contentType':response.headers.get('Content-Type','')}
        if not result['matches']:raise RuntimeError('Published content does not match local release: '+path)
        return result

with ThreadPoolExecutor(max_workers=4) as pool:
    results=list(pool.map(check,targets))
report={'releaseId':manifest['releaseId'],'url':base,'verifiedAtUTC':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'method':'HTTPS GET, Cache-Control:no-cache, version query; decompressed SHA-256 comparison. Network timings are this verification run, not a simulated browser load.','files':results,'verifiedFiles':len(results),'allMatch':all(x['matches'] for x in results)}
(root/'docs/reports/pages-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'releaseId':report['releaseId'],'verifiedFiles':len(results),'allMatch':report['allMatch'],'largestAsset':max(results,key=lambda x:x['decodedBytes'])},indent=2))
