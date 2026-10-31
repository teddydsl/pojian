#!/usr/bin/env python3
"""HEVC originals -> H.264/AAC fast-start web copies. Originals stay untouched."""
from pathlib import Path
from datetime import datetime,timezone
import argparse,hashlib,json,re,shutil,subprocess

parser=argparse.ArgumentParser();parser.add_argument('--ffmpeg',required=True);args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
source=Path('/Users/ted/Downloads/物料/黑客松/播放视频')
names=['9c4ccb9feeb444b0acb833576a20792a.mp4','150139109f0b585532bc72e3db3fb357.mp4','e296f850d20b9970f047f954797cea8a.mp4']
archive=root/'reviews/source-video';archive.mkdir(parents=True,exist_ok=True)
output=root/'public/assets/videos';output.mkdir(parents=True,exist_ok=True)
rows=[]
for name in names:
    raw=source/name;shutil.copyfile(raw,archive/name);target=output/name
    command=[args.ffmpeg,'-hide_banner','-loglevel','error','-i',str(raw),'-map','0:v:0','-map','0:a:0?','-c:v','libx264','-preset','medium','-crf','22','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart','-y',str(target)]
    subprocess.run(command,check=True)
    info=subprocess.run([args.ffmpeg,'-hide_banner','-i',str(target)],capture_output=True,text=True).stderr
    if 'Video: h264' not in info:raise RuntimeError('H.264 verification failed: '+name)
    rows.append({'file':name,'originalCodec':'HEVC/hvc1','webCodec':'H.264/avc1 + AAC','originalBytes':raw.stat().st_size,'webBytes':target.stat().st_size,'originalSha256':hashlib.sha256(raw.read_bytes()).hexdigest(),'webSha256':hashlib.sha256(target.read_bytes()).hexdigest(),'stream':next((line.strip() for line in info.splitlines() if 'Video:' in line),''),'fastStart':target.read_bytes().find(b'moov')<target.read_bytes().find(b'mdat')})
    print(name,rows[-1]['webBytes'],rows[-1]['stream'],flush=True)
(root/'docs/reports/media-videos.json').write_text(json.dumps({'preparedAtUTC':datetime.now(timezone.utc).isoformat(),'videos':rows},ensure_ascii=False,indent=2)+'\n')
