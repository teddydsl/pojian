import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {boot} from './runtime-harness.mjs';
const root=resolve(import.meta.dirname,'..'),read=p=>readFileSync(resolve(root,p));
const game=boot('reviews/media-pendants.html'),{w,doc,find,art,camera,renderer,tap,tick,drain}=game,THREE=w.THREE;
assert.ok(art&&find('#failure').hidden);assert.deepEqual(game.errors,[]);
assert.equal(art.pendants.length,4);assert.equal(art.pendants.filter(p=>p.kind==='data').length,1);
const videos=art.pendants.filter(p=>p.kind==='video');
assert.equal(videos.length,3);assert.ok(videos.every(p=>p.mesh.geometry===videos[0].mesh.geometry));
assert.ok(videos.every(p=>p.mesh.material===videos[0].mesh.material));
assert.equal(art.panelMount.children.length,1,'Remove the original landscape panel, backing and silk rings');
assert.equal(art.panel.geometry.userData.source,'video-player-pendant');
assert.equal(art.panel.geometry.userData.face,'data');
const dot=new THREE.Vector3();let vertexChecks=0;
for(const p of art.pendants){
  assert.ok(p.mesh.geometry.getAttribute('uv'));assert.ok(p.mesh.geometry.userData.projectedFrontTriangles>0);
  const front=p.mesh.geometry.groups.find(g=>g.materialIndex===1),idx=p.mesh.geometry.index,uv=p.mesh.geometry.getAttribute('uv');
  for(let n=front.start;n<front.start+front.count;n++){const i=idx.getX(n);assert.ok(uv.getX(i)>=0&&uv.getX(i)<=1);assert.ok(uv.getY(i)>=0&&uv.getY(i)<=1);}
  p.group.traverse(node=>{
    if(!node.geometry)return;
    const positions=node.geometry.getAttribute('position');
    for(let i=0;i<positions.count;i++){
      dot.fromBufferAttribute(positions,i);node.localToWorld(dot);art.interior.worldToLocal(dot);
      const r=w.PojianLayout.local.room.radius,h=r*w.PojianLayout.local.room.heightRatio;
      assert.ok((dot.x**2+dot.z**2)/(r*r)+dot.y**2/(h*h)<1,'The housing, native rope and ceiling cord must fit inside the dome');vertexChecks++;
    }
  });
  assert.ok(p.group.children.some(n=>n.name==='pendant-ceiling-cord'),'Every housing must hang from the dome');
  assert.equal(new THREE.Box3().setFromObject(p.mesh).intersectsBox(new THREE.Box3().setFromObject(art.interiorExit)),false,'Keep the new door unobstructed');
}
const pos=art.panel.geometry.getAttribute('position');
for(let i=0;i<pos.count;i++)if(Math.abs(pos.getX(i))<.17&&pos.getY(i)>.045&&pos.getY(i)<.69)assert.ok(pos.getZ(i)<=.018001,'The data face must not retain the old raised play triangle');
const viewer=find('#media-viewer'),video=find('#media-viewer-video');
assert.ok(viewer.hidden);assert.equal(video.preload,'none');assert.ok(!video.hasAttribute('src'),'Do not load a video before the E interaction');
renderer.domElement.getBoundingClientRect=()=>({left:0,top:0,width:1440,height:900,right:1440,bottom:900});
function aim(p){
  art.interior.updateMatrixWorld(true);
  const target=p.mesh.localToWorld(new THREE.Vector3(0,.38,.045));
  const forward=new THREE.Vector3(0,0,1).transformDirection(p.mesh.matrixWorld);
  camera.position.copy(target).addScaledVector(forward,2.8);camera.lookAt(target);camera.updateMatrixWorld(true);
}
function canvas(type,x=720,y=450){renderer.domElement.dispatchEvent(new w.MouseEvent(type,{clientX:x,clientY:y,button:0,bubbles:true}));}
function clickPendant(p){aim(p);canvas('pointerdown');canvas('pointerup');canvas('click');}
function approach(p){
  const direction=new THREE.Vector3(0,0,1).transformDirection(p.mesh.matrixWorld);direction.y=0;direction.normalize();
  art.player.position.copy(p.approachTarget).addScaledVector(direction,1.05);tick();
  assert.ok(find('#interaction-prompt').textContent.includes(p.label),'Nearest video must show its E prompt');
  assert.ok(find('#action-button').textContent.includes('E · 播放'));
}
function openNear(p){approach(p);tap('e');assert.equal(viewer.hidden,false);assert.equal(find('#media-viewer-title').textContent,p.label);const item=w.PojianMediaConfig.videos.find(v=>v.id===p.id);assert.ok(video.src.endsWith('/public/assets/videos/'+item.file));}
function assertClosed(){assert.ok(viewer.hidden);assert.ok(!video.hasAttribute('src'));assert.ok(!game.audioState().mediaPaused);}
// Clicking the 3D video is no longer an activation path.
for(const p of videos){clickPendant(p);assert.ok(viewer.hidden);assert.equal(game.opened.length,0);}
art.player.position.set(...w.PojianLayout.indoor.spawn);tick();tap('e');assert.ok(viewer.hidden,'Far-away E must not open a video');
find('#settings-button').click();find('#sound-button').click();await new Promise(resolve=>setImmediate(resolve));tap('Escape');assert.ok(game.audioState().enabled);
for(const p of videos){
  approach(p);const position=art.player.position.clone(),heading=art.player.rotation.y,roomLabel=find('#place').textContent,urls=game.opened.length;
  tap('e');assert.ok(!viewer.hidden);assert.equal(game.opened.length,urls,'Playback stays in this page');assert.ok(game.audioState().mediaPaused);assert.ok(game.audioState().enabled,'Preserve the ambient sound preference');assert.equal(doc.activeElement,find('#media-viewer-close'));
  const renderCalls=renderer.renderCalls;game.key('w');tap('e');canvas('pointerdown');canvas('pointermove',760,450);canvas('pointerup');tick(6);game.key('w','keyup');
  assert.equal(art.player.position.distanceTo(position),0,'Freeze movement during playback');assert.equal(art.player.rotation.y,heading);assert.equal(renderer.renderCalls,renderCalls,'Do not render 3D behind the playing video');
  tap('Escape');assertClosed();assert.equal(find('#place').textContent,roomLabel);assert.equal(art.player.position.distanceTo(position),0);tick();assert.ok(renderer.renderCalls>renderCalls);assert.ok(video.__pauseCalls>0&&video.__loadCalls>0);
}
// Escape, explicit close, and backdrop close all stop/unload playback.
openNear(videos[0]);find('#media-viewer-close').click();assertClosed();
openNear(videos[1]);viewer.click();assertClosed();
// Keep keyboard focus inside the viewer while its video/native controls are active.
openNear(videos[2]);doc.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}));assert.equal(doc.activeElement,video);doc.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));assert.equal(doc.activeElement,find('#media-viewer-close'));tap('Escape');assertClosed();
// Autoplay refusal is recoverable using native controls in the same overlay.
const originalPlay=w.HTMLMediaElement.prototype.play;
w.HTMLMediaElement.prototype.play=()=>Promise.reject(new Error('autoplay refused'));
openNear(videos[0]);await new Promise(resolve=>setImmediate(resolve));assert.ok(find('#media-viewer-status').textContent.includes('播放按钮'));assert.ok(video.controls);tap('Escape');w.HTMLMediaElement.prototype.play=originalPlay;
openNear(videos[0]);video.dispatchEvent(new w.Event('error'));assert.ok(find('#media-viewer-status').textContent.includes('未能加载'));tap('Escape');assertClosed();
// Opening playback needs no popup permissions; data links keep their original bridge.
w.open=()=>null;openNear(videos[1]);tap('Escape');assertClosed();
const data=art.pendants.find(p=>p.kind==='data');clickPendant(data);assert.ok(find('#link-fallback h2').textContent.includes('数据'));assert.equal(find('#link-fallback').hidden,false);tap('Escape');
w.open=()=>({opener:w,location:{replace:url=>game.opened.push(url)}});
clickPendant(data);assert.ok(game.opened.at(-1).endsWith('demo-data-stage4.html?room=home'));
art.player.position.copy(art.panelApproach);tap('e');assert.ok(game.opened.at(-1).endsWith('room=home'),'Proximity + E data action remains available');
approach(videos[0]);find('#settings-button').click();tap('e');assert.ok(viewer.hidden,'Settings isolate E activation');tap('Escape');
// A held movement key is cleared on close, then a fresh key moves normally.
openNear(videos[2]);const paused=art.player.position.clone();game.key('w');tap('Escape');tick(3);assert.equal(art.player.position.distanceTo(paused),0);game.key('w');tick(2);game.key('w','keyup');assert.ok(art.player.position.distanceTo(paused)>.001);
art.player.position.copy(art.exitTarget);tap('e');drain();assert.ok(art.forest.visible);
art.player.position.copy(videos[0].approachTarget);tap('e');assert.ok(viewer.hidden,'Hidden interior video must not open in the forest');
for(const hut of art.huts){
  art.player.position.copy(hut.doorTarget);tap('e');drain();assert.ok(art.interior.visible);
  clickPendant(data);assert.ok(game.opened.at(-1).endsWith('room='+hut.id),'Data card keeps the current room target');
  openNear(videos[2]);tap('Escape');assertClosed();
  art.player.position.copy(art.exitTarget);tap('e');drain();assert.ok(art.forest.visible);
}
// Relative playback works from disk, and URL never leaves the current game document.
art.player.position.copy(art.ownDoorTarget);tap('e');drain();
game.reconfigure({url:'file:///workspace/pojian/reviews/media-pendants.html'});openNear(videos[0]);assert.equal(video.src,'file:///workspace/pojian/public/assets/videos/'+w.PojianMediaConfig.videos[0].file);tap('Escape');
for(const item of w.PojianMediaConfig.videos){const file=read('public/assets/videos/'+item.file);assert.ok(file.includes(Buffer.from('avc1')));assert.ok(file.indexOf('moov')<file.indexOf('mdat'));}
const report=JSON.parse(read('docs/reports/media-videos.json'));assert.equal(report.videos.length,3);assert.ok(report.videos.every(v=>v.fastStart));
for(const entry of JSON.parse(read('reviews/snapshots/media-pendants.manifest.json')).outputs)assert.equal(createHash('sha256').update(read(entry.path)).digest('hex'),entry.sha256);
for(const item of w.PojianMediaConfig.videos)assert.ok(existsSync(resolve(root,'public/assets/videos',item.file)));
game.close();
console.log(`Media review OK: one supplied housing, three shared video meshes + one data face, ${vertexChecks} dome-clearance samples, nearby E prompts, same-page video overlay/close/input/audio/render lifecycle, unchanged room-specific data links, all rooms, H.264 fast-start playback and snapshot hashes.`);
