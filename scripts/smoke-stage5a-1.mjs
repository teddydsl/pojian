import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {JSDOM,VirtualConsole} from 'jsdom';

const root=resolve(import.meta.dirname,'..'),read=path=>readFileSync(resolve(root,path),'utf8');
const acceptedAssets=read('reviews/snapshots/stage-5a-1.assets.js');
const saveStart=acceptedAssets.indexOf('/* src/systems/save.js */');
const saveEnd=acceptedAssets.indexOf('/* src/systems/weather.js */',saveStart);
assert.ok(saveStart>=0&&saveEnd>saveStart);
const acceptedSave=acceptedAssets.slice(saveStart,saveEnd);
const roomIds=['north','stream','hill'],key='pojian.save';
function saveHarness(entries={},unavailable=false){
  const data=new Map(Object.entries(entries));
  const win={localStorage:{getItem(k){if(unavailable)throw Error('storage denied');return data.get(k)??null;},setItem(k,v){if(unavailable)throw Error('quota');data.set(k,v);}}};
  vm.runInNewContext(acceptedSave,{window:win,Date});
  return {store:win.PojianSave.create(win,roomIds),data,win};
}
const legacy={'pojian.stage3.explored':'["north","hill","north","bad"]','pojian.stage4.tasksVisible':'false'};
const migrated=saveHarness(legacy);
assert.equal(migrated.store.state.explored.join(','),'north,hill');
assert.equal(migrated.store.state.ui.tasksVisible,false);
assert.equal(migrated.store.state.visited.north,0,'Unknown historical visit counts must not be invented');
migrated.store.visit('north');migrated.store.setDoor(false);
assert.equal(migrated.store.state.visited.north,1);
const reloaded=migrated.win.PojianSave.create(migrated.win,roomIds);
assert.equal(reloaded.state.doorOpen,false);assert.equal(reloaded.state.explored.length,2);
reloaded.resetProgress();
assert.equal(migrated.win.PojianSave.create(migrated.win,roomIds).state.explored.length,0,'Cleared v2 must not reimport legacy data');
assert.equal(migrated.data.get('pojian.stage3.explored'),legacy['pojian.stage3.explored'],'Legacy keys remain untouched');
assert.equal(saveHarness({...legacy,'pojian.stage3.explored':'broken'}).store.state.ui.tasksVisible,false,'A corrupt legacy field must not erase the independent task preference');
for(const bad of ['not json','null','[]','{"explored":false,"ui":42,"collections":true}']){
  const h=saveHarness({...legacy,[key]:bad});assert.equal(h.store.state.explored.length,0);assert.equal(h.store.state.weather,'clear');
}
const malformed=saveHarness({[key]:JSON.stringify({explored:['north','north',17,'other'],visited:{north:-3,hill:2.7,stream:4},messages:[{id:'a',title:'hello',read:false},{id:'a',title:'duplicate'},{title:'no id'}],collections:{lifetimePointIds:['moss-1','unknown'],daily:{date:'2026-10-31',pointIds:['mushroom-1','moss-1']}}})});
assert.equal(malformed.store.state.explored.join(','),'north');assert.equal(malformed.store.state.visited.north,0);assert.equal(malformed.store.state.visited.stream,4);
assert.equal(malformed.store.state.messages.length,1);malformed.store.readMessages();assert.equal(malformed.store.state.messages[0].read,true);
assert.equal(malformed.store.state.collections.daily.pointIds.join(','),'mushroom-1');
const memory=saveHarness({},true);memory.store.visit('stream');assert.equal(memory.store.state.explored[0],'stream');assert.equal(memory.store.persistent,false);

// Exercise actual DOM handlers, real Three.js art/core math, and a renderer stub.
// This is not a browser or a GPU test; visual acceptance remains with the local HTML.
const html=read('reviews/stage-5a-1.html'),vc=new VirtualConsole();
vc.on('jsdomError',error=>{throw error;});
const dom=new JSDOM(html,{url:'https://teddydsl.github.io/pojian/reviews/stage-5a-1.html',runScripts:'outside-only',virtualConsole:vc});
const w=dom.window,doc=w.document,$=selector=>doc.querySelector(selector);
const storage=new Map(),timers=[],opened=[];let frame,art,camera,scene,renderer,ui;
Object.defineProperty(w,'localStorage',{value:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)}});
const ctx2d=new Proxy({},{get:()=>()=>{}});
w.HTMLCanvasElement.prototype.getContext=()=>ctx2d;
w.HTMLElement.prototype.setPointerCapture=()=>{};
w.Image=class{set src(v){this.value=v;this.onload?.();}};
w.URL.createObjectURL=URL.createObjectURL;w.URL.revokeObjectURL=URL.revokeObjectURL;w.Blob=Blob;w.TextDecoder=TextDecoder;
w.setTimeout=(callback,delay=0)=>{const t={callback,delay};timers.push(t);return t;};
w.clearTimeout=t=>{const i=timers.indexOf(t);if(i>=0)timers.splice(i,1);};
w.requestAnimationFrame=callback=>{frame=callback;};w.ResizeObserver=class{observe(){}};
Object.defineProperty($('#viewport'),'clientWidth',{value:1200});Object.defineProperty($('#viewport'),'clientHeight',{value:800});
w.open=()=>({opener:w,location:{replace:url=>opened.push(url)}});
w.eval(read('reviews/snapshots/stage-5a-1.assets.js'));
const THREE=w.THREE;
const Camera=THREE.PerspectiveCamera;
THREE.PerspectiveCamera=class extends Camera{constructor(...args){super(...args);camera=this;}};
THREE.Clock=class{elapsedTime=0;getDelta(){this.elapsedTime+=.05;return .05;}};
THREE.WebGLRenderer=class{constructor(){renderer=this;this.domElement=doc.createElement('canvas');}setPixelRatio(){}setSize(){}render(){}};
const build=w.PojianCurrentArt.build;
w.PojianCurrentArt.build=(...args)=>{scene=args[1];art=build(...args);return art;};
const mount=w.PojianStage5UI.mount;let mapInput;
w.PojianStage5UI.mount=args=>{mapInput=args;ui=mount(args);return ui;};
// Keep sound behavior gesture-only without audio output in a DOM test.
let audioOn=false;w.PojianAudio.create=()=>({supported:true,toggle:async()=>audioOn=!audioOn,isOn:()=>audioOn,setTheme(){},update(){}});
w.eval(read('reviews/snapshots/stage-5a-1.js'));
const tick=(n=1)=>{for(let i=0;i<n;i++)frame();},click=selector=>{assert.ok($(selector),selector);$(selector).click();};
const press=(key,type='keydown')=>w.dispatchEvent(new w.KeyboardEvent(type,{key,bubbles:true,cancelable:true}));
const tap=key=>{press(key);press(key,'keyup');};
function drain(){let n=0;while(timers.length&&n++<150)timers.shift().callback();assert.ok(n<150,'No timer loops');}
function moveCheck(expectMovement){const start=art.player.position.clone();press('w');tick(3);press('w','keyup');assert.equal(start.distanceTo(art.player.position)>.001,expectMovement);}
const saved=()=>JSON.parse(storage.get(key));
assert.equal($('#failure').hidden,true);assert.ok(art);assert.equal($('#task-panel').hidden,false);
assert.equal(art.interiorRevision.removedSigns,5,'All theme caption boards and the old exit label must be removed');
assert.equal(art.interiorRevision.removedExitParts,2,'The old dark oval and wool ring must both be retired');
assert.equal(art.interiorExit.userData.model,'glowing-wool-cave-game');
assert.equal(art.interiorRevision.hanging.length,10,'Music discs and their cords must move together clear of the new arch');
const doorMesh=art.interiorExit.children[0].children[0],doorBox=new THREE.Box3().setFromObject(art.interiorExit);
assert.equal(doorMesh.geometry.index.count/3,16940,'Use the supplied detailed door, not another primitive');
assert.ok(doorMesh.material.map&&doorMesh.material.normalMap&&doorMesh.material.roughnessMap,'Door PBR textures must remain connected');
assert.ok(Math.abs(doorBox.getSize(new THREE.Vector3()).y-2.88)<1e-6,'Door scale follows the room scale');
const doorPositions=doorMesh.geometry.getAttribute('position'),localPoint=new THREE.Vector3();
for(let i=0;i<doorPositions.count;i++){
  localPoint.fromBufferAttribute(doorPositions,i);doorMesh.localToWorld(localPoint);art.interior.worldToLocal(localPoint);
  const r=w.PojianLayout.local.room.radius-.07,h=w.PojianLayout.local.room.radius*w.PojianLayout.local.room.heightRatio-.07;
  assert.ok((localPoint.x**2+localPoint.z**2)/(r*r)+localPoint.y**2/(h*h)<1,'The complete door must stay visible inside the dome');
}
assert.ok(art.exitTarget.z-doorBox.max.z>.4&&art.exitTarget.z-doorBox.max.z<.8,'Exit interaction target must sit in front of the actual supplied door');
assert.equal(new THREE.Box3().setFromObject(art.panelMount).intersectsBox(doorBox),false,'Door must not overlap the side-mounted data panel');
let remainingPlanes=0;
art.interior.traverse(node=>{
  if(node.geometry?.type!=='PlaneGeometry')return;
  remainingPlanes++;let parent=node.parent;while(parent&&parent!==art.panelMount)parent=parent.parent;
  assert.equal(parent,art.panelMount,'Only the interactive data panel planes remain inside');
});
assert.equal(remainingPlanes,2,'Keep the panel and its backing while removing caption cards');
for(const hanging of art.interiorRevision.hanging)assert.equal(new THREE.Box3().setFromObject(hanging).intersectsBox(doorBox),false,'The new arch must also clear the music decorations');
assert.equal(doc.querySelectorAll('.hud-nav button').length,6);
assert.equal($('#explored-list').textContent.replace(/\s/g,''),'○苔苔的家○栗子的家○铃子的家');
moveCheck(true); // The pinned task tracker is nonmodal.
for(const [name,path] of Object.entries(w.PojianUIConfig.icons))assert.ok(existsSync(resolve(root,'public/assets/icons',path)),name);
assert.equal(Object.keys(w.PojianUIConfig.icons).length,15);
for(const img of doc.querySelectorAll('img'))assert.ok(img.getAttribute('src')&&!img.getAttribute('src').includes('undefined'));
click('#weather-button');assert.equal($('#weather-popover').hidden,false);
assert.equal(doc.querySelectorAll('.weather-item').length,5);assert.equal(doc.querySelectorAll('.weather-item button').length,0,'Weather is read only');
assert.equal(doc.querySelector('.weather-item.current span').textContent,'晴 · 当前');
moveCheck(false);click('#data-button');assert.equal($('#weather-popover').hidden,true);assert.equal($('#data-popover').hidden,false);
click('[data-page="friends"]');assert.equal($('#data-popover').hidden,true);assert.equal($('#friends-panel').hidden,false);assert.equal($('#task-panel').hidden,true);
tap('Escape');assert.equal($('#friends-panel').hidden,true);assert.equal(doc.activeElement,$('#data-button'));moveCheck(true);
click('#data-button');click('[data-page="history"]');
assert.ok([...doc.querySelectorAll('[data-room-id]')].every(b=>b.disabled),'Unvisited homes cannot open history links');
click('#map-button');assert.equal($('#history-panel').hidden,true);assert.equal($('#map-panel').hidden,false);
assert.equal(doc.querySelectorAll('[data-map-house]').length,4);assert.equal(doc.querySelectorAll('#map-routes polyline').length,4);
assert.ok($('#map-caption').textContent.includes('阿吉的家（室内）'));
assert.ok(!$('#map-player').getAttribute('transform').includes('NaN'));
assert.equal(mapInput.paths[0].length,73,'Map follows the actual sampled road rather than straight-line guesses');
click('#messages-button');click('#settings-button');assert.equal($('#messages-panel').hidden,true);assert.equal($('#settings-panel').hidden,false);assert.equal($('#map-panel').hidden,false);
moveCheck(false);tap('Escape');assert.equal($('#settings-panel').hidden,true);assert.equal($('#map-panel').hidden,false);tap('Escape');assert.equal($('#map-panel').hidden,true);moveCheck(true);
click('#settings-button');click('#task-toggle');assert.equal(saved().ui.tasksVisible,false);tap('Escape');assert.equal($('#task-panel').hidden,true);
click('#tasks-button');assert.equal($('#task-panel').hidden,false);assert.equal(saved().ui.tasksVisible,true);
click('#map-button');click('#tasks-button');assert.equal($('#map-panel').hidden,true);assert.equal($('#task-panel').hidden,false,'Task entrance restores the tracker from another left-side page');
click('#settings-button');click('#own-door-toggle');assert.equal(saved().doorOpen,false);tap('Escape');
art.player.position.copy(art.exitTarget);tap('e');drain();assert.ok(art.forest.visible);assert.equal(renderer.toneMappingExposure,1.32);assert.equal(scene.fog.near,26.4);
art.player.position.copy(art.ownDoorTarget);tick();assert.ok($('#interaction-prompt').textContent.includes('今日歇息'));
tap('e');drain();assert.equal(art.interior.visible,true,'Owner can enter their closed home');assert.equal(renderer.toneMappingExposure,1.28);assert.equal(scene.fog.near,21.599999999999998);
art.player.position.copy(art.exitTarget);tap('e');drain();
for(const hut of art.huts){
  art.player.position.copy(hut.doorTarget);tick();tap('e');drain();assert.ok($('#place').textContent.includes(hut.name));
  assert.equal(renderer.toneMappingExposure,1.28,'Indoor theme light must be restored');
  click('#map-button');assert.ok($('#map-caption').textContent.includes(hut.name+'（室内）'));tap('Escape');
  art.player.position.copy(art.panelApproach);tap('e');assert.ok(opened.at(-1).includes('room='+hut.id));assert.ok(art.player.visible);assert.ok($('#link-fallback').hidden);moveCheck(true);
  art.player.position.copy(art.exitTarget);tap('e');drain();assert.ok(art.forest.visible);assert.equal(renderer.toneMappingExposure,1.32);
}
assert.equal(saved().explored.length,3);assert.equal(saved().visited.north,1);assert.equal($('#explored-count').textContent,'3 / 3');
assert.ok(!$('#explored-list').textContent.includes('自然观察'));
assert.equal(saved().messages.length,0,'5A.1 does not fabricate task/reward messages');assert.equal(saved().badges.length,0);
click('#map-button');assert.ok(doc.querySelectorAll('.map-house.visited').length===3);tap('Escape');
// History destination stays explicit even while standing in the forest.
function history(){click('#data-button');click('[data-page="history"]');}
history();const forestPosition=art.player.position.clone();click('[data-room-id="stream"]');
assert.ok(opened.at(-1).endsWith('room=stream'));assert.ok(art.forest.visible);assert.ok(art.player.visible);assert.ok($('#history-panel').hidden);assert.equal(art.player.position.distanceTo(forestPosition),0);moveCheck(true);
w.open=()=>null;history();click('[data-room-id="hill"]');assert.equal($('#link-fallback').hidden,false);assert.ok($('#fallback-data-link').href.endsWith('room=hill'));assert.ok(art.forest.visible);moveCheck(false);tap('Escape');moveCheck(true);
const config=w.PojianCocoons.rooms[0],originalUrl=config.dataUrl;config.dataUrl='javascript:alert(1)';history();click('[data-room-id="north"]');assert.equal($('#fallback-data-link').hidden,true);assert.ok(art.forest.visible);tap('Escape');config.dataUrl=originalUrl;
// Opening an overlay must clear a held movement key and a canvas drag.
press('w');click('#map-button');const paused=art.player.position.clone();tick(3);assert.equal(paused.distanceTo(art.player.position),0);tap('Escape');tick(3);assert.equal(paused.distanceTo(art.player.position),0);press('w','keyup');moveCheck(true);
click('#settings-button');click('#sound-button');await new Promise(resolve=>setImmediate(resolve));assert.equal($('#sound-button').getAttribute('aria-checked'),'true');tap('Escape');
click('#data-button');click('[data-page="profile"]');assert.ok($('#profile-content').textContent.includes('3'));tap('Escape');
click('#data-button');click('[data-page="profile"]');click('#data-button');click('[data-page="profile"]');assert.equal($('#profile-panel').hidden,false,'Selecting the current data page keeps it open');tap('Escape');
// UI infrastructure derives unread markers and reads messages on open. No gameplay generation yet.
const msg={id:'fixture',icon:'complete',title:'验收消息',body:'仅测试夹具',at:0,read:false};mapInput.store.state.messages.push(msg);ui.refresh();assert.equal($('#message-dot').hidden,false);click('#messages-button');assert.equal($('#message-dot').hidden,true);assert.equal(msg.read,true);tap('Escape');
click('#settings-button');click('#clear-exploration');assert.equal(saved().explored.length,0);assert.equal(saved().messages.length,0);assert.equal(saved().doorOpen,false);click('#reset-button');assert.ok(art.interior.visible);assert.equal(renderer.toneMappingExposure,1.28);
dom.reconfigure({url:'file:///Users/ted/Workspace/Projects/Hackathon/pojian/reviews/stage-5a-1.html'});
w.open=()=>({opener:w,location:{replace:url=>opened.push(url)}});
art.player.position.copy(art.panelApproach);tap('e');assert.equal(opened.at(-1),'file:///Users/ted/Workspace/Projects/Hackathon/pojian/reviews/demo-data-stage4.html?room=home');assert.ok(art.player.visible);moveCheck(true);
// All review URLs stay relative, including file:// and the Pages subpath.
for(const script of doc.querySelectorAll('script[src]'))assert.ok(existsSync(resolve(root,'reviews',script.getAttribute('src'))));
assert.ok(existsSync(resolve(root,'reviews/demo-data-stage4.html')));
for(const base of ['file:///Users/ted/Workspace/Projects/Hackathon/pojian/reviews/stage-5a-1.html','https://teddydsl.github.io/pojian/reviews/stage-5a-1.html']){
  assert.ok(new URL('demo-data-stage4.html?room=north',new URL('./',base)).href.includes('/pojian/reviews/demo-data-stage4.html?room=north'));
  for(const path of Object.values(w.PojianUIConfig.icons))assert.ok(new URL(w.PojianUIConfig.iconRoot+path,base).href.includes('/pojian/reviews/snapshots/stage-5a-1-icons/'));
}
// Historical source hashes describe provenance; editable current sources can evolve.
// Frozen output hashes and the accepted art baseline remain the integrity contract.
const acceptedManifest=JSON.parse(read('reviews/snapshots/stage-5a-1.manifest.json'));
for(const entry of [...acceptedManifest.sources.filter(x=>x.path.startsWith('reviews/snapshots/')),...acceptedManifest.outputs])assert.equal(createHash('sha256').update(readFileSync(resolve(root,entry.path))).digest('hex'),entry.sha256,entry.path);
dom.window.close();
console.log('5A.1 OK: supplied PBR door, full-mesh dome clearance, sign removal, panel/music separation; legacy migration, DOM HUD/input isolation, map anchors, three visits, explicit links/fallback, own-door preference, sunny/indoor lighting, relative assets and manifests. Visual/GPU review remains manual.');
