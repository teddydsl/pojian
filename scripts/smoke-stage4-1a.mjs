import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

// GPU-free Stage 4.1 regression: return from data links and indoor camera distance.
const root = resolve(import.meta.dirname, '..');
const source = name => readFileSync(resolve(root, name), 'utf8');
const elements = new Map();
function element(id = '') {
  if (!elements.has(id)) elements.set(id, {
    id, hidden: false, disabled: false, visible: true, clientWidth: 1200, clientHeight: 800,
    textContent: '', innerHTML: '', href: '', listeners: {}, children: [],
    classList: { add() {}, remove() {} },
    appendChild() {}, setAttribute() {}, setPointerCapture() {},
    addEventListener(type, callback) { this.listeners[type] = callback; },
  });
  return elements.get(id);
}
const ctx2d = { fillRect() {}, fillText() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, closePath() {}, arc() {}, fill() {}, strokeRect() {} };
const document = {
  querySelector: element,
  createElement(tag) {
    if (tag !== 'canvas') throw new Error(`Unexpected element: ${tag}`);
    return { width: 0, height: 0, getContext() { return ctx2d; } };
  },
};
const handlers = {}, timers = [], saved = new Map(), openedUrls = [];
class Param { value = 0; setValueAtTime(v) { this.value = v; } exponentialRampToValueAtTime(v) { this.value = v; } setTargetAtTime(v) { this.value = v; } }
class AudioNode { gain = new Param(); frequency = new Param(); connect() {} start() {} stop() {} }
class AudioContext {
  static instances = [];
  static tones = 0;
  currentTime = 0;
  sampleRate = 120;
  destination = new AudioNode();
  constructor() { AudioContext.instances.push(this); }
  createGain() { return new AudioNode(); }
  createBuffer() { return { getChannelData: () => new Float32Array(240) }; }
  createBufferSource() { return new AudioNode(); }
  createBiquadFilter() { return new AudioNode(); }
  createOscillator() { AudioContext.tones++; return new AudioNode(); }
  async resume() {} async suspend() {}
}
const window = {
  devicePixelRatio: 1, AudioContext,
  location: { href: 'https://teddydsl.github.io/pojian/reviews/stage-4-1.html' },
  open() { return { opener: window, location: { replace(url) { openedUrls.push(url); } } }; },
  localStorage: { getItem(key) { return saved.get(key) ?? null; }, setItem(key, value) { saved.set(key, value); } },
  addEventListener(type, callback) { handlers[type] = callback; },
};
let frame, art, activeCamera;
element('#settings-panel').hidden = true;
element('#link-fallback').hidden = true;
const sandbox = vm.createContext({
  console, document, window, performance, URL, Blob, Math, atob, TextDecoder,
  Image: class { set src(value) { this.value = value; this.onload?.(); } },
  setTimeout(callback, delay = 0) { const timer = { callback, delay }; timers.push(timer); return timer; },
  clearTimeout(timer) { const i = timers.indexOf(timer); if (i >= 0) timers.splice(i, 1); },
  requestAnimationFrame(callback) { frame = callback; },
  ResizeObserver: class { observe() {} },
});
vm.runInContext(source('reviews/snapshots/stage-4-1a-r2.assets.js'), sandbox, {filename:'stage-4-1a.assets.js'});
window.THREE = sandbox.THREE;
const OriginalCamera = window.THREE.PerspectiveCamera;
window.THREE.PerspectiveCamera = class extends OriginalCamera {
  constructor(...args) { super(...args); activeCamera = this; }
};
window.THREE.WebGLRenderer = class {
  constructor() { this.domElement = element('render-canvas'); }
  setPixelRatio() {} setSize() {} render() {}
};
window.THREE.Clock = class { elapsedTime = 0; getDelta() { this.elapsedTime += .05; return .05; } };
const originalBuild = window.PojianCurrentArt.build;
window.PojianCurrentArt.build = (...args) => { art = originalBuild(...args); return art; };
vm.runInContext(source('reviews/snapshots/stage-4-1a-r2.js'), sandbox, { filename: 'stage4-1.js' });

function key(type, value) { handlers[type]({ key: value, repeat: false, preventDefault() {} }); }
function tick(n = 1) { for (let i = 0; i < n; i++) frame(); }
function drainTimers() { let count = 0; while (timers.length && count++ < 150) timers.shift().callback(); if (count >= 150) throw new Error('Timer loop'); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function interact() { key('keydown', 'e'); key('keyup', 'e'); }

const THREE=window.THREE,layout=window.PojianLayout;
assert(Math.abs(art.avatar.scale.y*.40087890625*art.avatar.children[0].scale.y-1.76)<.01,'Avatar height must shrink to 1.76');
assert(art.forest.scale.x===1.2&&art.interior.scale.x===1.2,'Both playable spaces must expand');
assert(layout.world.bounds.maxX===18&&layout.world.bounds.minZ===-19.2,'Navigation area must actually expand');
assert(art.forestDetail.trees.length===15&&art.forestDetail.ring.length===28,'Textured trees must cover the world');
assert(art.forestDetail.logs.length>=4&&art.forestDetail.shrubs.length>=15,'Logs and shrubs must populate the forest');
assert(art.forestDetail.mushrooms.length>=9,'Approved mushroom clusters must remain');
assert(art.huts.every(h=>h.support.name==='detailed-cocoon-support'&&h.door.children.length===0),'Old primitive supports and overlapping doors must be absent');
let cylinders=0;art.forest.traverse(node=>{if(node.geometry?.type==='CylinderGeometry')cylinders++});
assert(cylinders===0,'The large circular clearing must be removed');
assert(art.forestDetail.boundary.length===14,'The original forest must wrap the outer boundary');
assert(art.huts.every(h=>!h.sign),'Homes must not have persistent signboards');
let planes=0;art.forest.traverse(node=>{if(node.geometry?.type==='PlaneGeometry')planes++});
assert(planes===1,'Only the ground plane remains; all exterior signboards are gone');
for(const path of art.forestDetail.paths){const normals=path.geometry.getAttribute('normal');for(let i=0;i<normals.count;i++)assert(normals.getY(i)>.9,'Paths must face upward and remain visible')}
assert(art.forestDetail.paths.length===8,'Four home routes and four distant trails must be present');
for(let i=0;i<4;i++){
  const spec=layout.local.paths[i],geo=art.forestDetail.paths[i].geometry.getAttribute('position');
  const index=i===0?0:geo.count-4;
  const end=new THREE.Vector3((geo.getX(index)+geo.getX(index+3))/2,0,(geo.getZ(index)+geo.getZ(index+3))/2).multiplyScalar(layout.worldScale);
  const target=spec.id==='home'?art.ownDoorTarget:art.huts.find(h=>h.id===spec.id).doorTarget;
  assert(end.distanceTo(target)<.01,'Every main route must reach its house approach');
}
for(const path of art.forestDetail.paths.slice(4)){const color=path.geometry.getAttribute('color');assert(color.getW(color.count-2)===0,'Distant paths must fade out')}
for(const hut of [...art.huts,art.own])assert(!new THREE.Box3().setFromObject(hut.support).intersectsBox(new THREE.Box3().setFromObject(hut.shell)),'House shells and supporting wood must be separate');
for(const shell of art.forestDetail.hangingEggs){
  shell.updateMatrix();const eggBox=shell.geometry.boundingBox.clone().applyMatrix4(shell.matrix),tree=shell.parent.children[0];tree.updateMatrix();
  const positions=tree.geometry.getAttribute('position'),v=new THREE.Vector3();let front=-Infinity;
  for(let i=0;i<positions.count;i++){v.fromBufferAttribute(positions,i).applyMatrix4(tree.matrix);if(v.y>=eggBox.min.y&&v.y<=eggBox.max.y)front=Math.max(front,v.z)}
  assert(eggBox.min.z>front+.25,'Hanging cocoons must clear branches in their occupied height range');
}
{
  for(const shell of [...art.huts.map(h=>h.shell),art.own.shell,...art.forestDetail.hangingEggs]) {
    const egg=new THREE.Box3().setFromObject(shell);
    for(const tree of art.forestDetail.trees) {
      if(shell.parent===tree)continue; // Own tree uses the stronger local separating-plane assertion above.
      const object=tree.children[0],whole=new THREE.Box3().setFromObject(object);if(!whole.intersectsBox(egg))continue;
      const positions=object.geometry.getAttribute('position'),v=new THREE.Vector3(),band=new THREE.Box3();
      for(let i=0;i<positions.count;i++){v.fromBufferAttribute(positions,i).applyMatrix4(object.matrixWorld);if(v.y>=egg.min.y&&v.y<=egg.max.y)band.expandByPoint(v)}
      assert(!band.intersectsBox(egg),'Cocoons must also clear neighboring trees at their occupied height');
    }
  }
}
const tree=art.forestDetail.trees[0].children[0],colors=tree.geometry.getAttribute('color'),treePositions=tree.geometry.getAttribute('position');
assert(tree.material.vertexColors,'Tree crown must use selective color tint');
const treeUv=tree.geometry.getAttribute('uv');assert(treeUv.normalized,'Packed tree UVs must preserve the GLB normalized flag');
for(let i=0;i<treeUv.count;i++)assert(treeUv.getX(i)>=0&&treeUv.getX(i)<=1&&treeUv.getY(i)>=0&&treeUv.getY(i)<=1,'Tree fibers must sample the intended texture rather than repeat thousands of times');
for(let i=0;i<colors.count;i++){if(treePositions.getY(i)<.5)assert(colors.getX(i)===1&&colors.getY(i)===1,'Lower bark colors must stay unchanged');if(treePositions.getY(i)>.75)assert(colors.getY(i)>colors.getX(i)*2,'Tree crown must be greener')}
for(const signX of [-1,1])for(const signZ of [-1,1])assert(art.forestDetail.shrubs.some(o=>Math.sign(o.position.x)===signX&&Math.sign(o.position.z)===signZ),'Shrubs must occupy all four quadrants');

const testCamera=new THREE.PerspectiveCamera(52,1,.1,120),director=window.PojianCamera.create(THREE,testCamera,layout),motion=window.PojianMovement.create(THREE,layout);
const positions=[[0,0],[2.4,0],layout.indoor.panelApproach.filter((_,i)=>i!==1),[0,layout.indoor.exit[2]],[layout.indoor.walkRadius-.05,0]];
let checks=0;
for(const [x,z] of positions)for(let n=0;n<8;n++) {
  const p=new THREE.Vector3(x,0,z);director.pose(p,n*Math.PI/4,'room',1,true);
  assert(director.inside(testCamera.position),'Room camera and near-plane margin must fit the ellipsoid');
  assert(Math.hypot(testCamera.position.x-x,testCamera.position.z-z)>=layout.camera.room.minHorizontal-.001,'Camera must clear the avatar');
  const view=testCamera.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
  for(const [f,r] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const result=motion.step(p,testCamera,f,r,.001,'room',[]);
    const right=new THREE.Vector3(-view.z,0,view.x),expected=view.clone().multiplyScalar(f).addScaledVector(right,r);
    assert(result.direction.dot(expected)>.99999,'WASD must follow the actual view at every position and heading');checks++;
  }
}
testCamera.position.set(0,4,0);testCamera.lookAt(0,0,0);assert(Number.isFinite(motion.basis(testCamera).forward.x),'Vertical view needs a finite fallback');
for(const mode of ['forest','home','room','forest']){director.pose(new THREE.Vector3(),1.2,mode,1,true);assert(motion.basis(testCamera).forward.length()>.99,'Camera mode switch must restore a valid direction')}
// Exercise smoothing and the forbidden orbit arc while moving near the camera.
for(let n=0;n<240;n++){const a=n*.027,p=new THREE.Vector3(Math.sin(a)*3.4,0,Math.cos(a)*3.4);director.pose(p,a+.04,'room',.016);assert(director.inside(testCamera.position),'Smoothed orbit must remain inside');assert(Math.hypot(testCamera.position.x-p.x,testCamera.position.z-p.z)>=1.64,'Smoothed orbit must not cut through avatar')}

element('#settings-button').listeners.click();const paused=art.player.position.clone();
key('keydown','w');tick(4);key('keyup','w');assert(art.player.position.distanceTo(paused)===0,'Settings must isolate scene input');
element('#task-toggle').listeners.click();assert(element('#task-panel').hidden,'Task toggle must still work');
element('#close-settings').listeners.click();await element('#sound-button').listeners.click();
art.player.position.copy(art.exitTarget);interact();drainTimers();
assert(element('#place').textContent.includes('茧林'),'Own room exit must use scaled anchor');
for(const hut of art.huts) {
  const blocked=motion.constrain(new THREE.Vector3(hut.x,0,hut.z),'forest',art.forestColliders);
  assert(Math.hypot(blocked.x-hut.x,blocked.z-hut.z)>1.8,'Room collision must scale with scene');
  if(hut.id==='hill'){element('#entrance-button').listeners.click();art.player.position.copy(hut.doorTarget);interact();assert(art.forest.visible&&!art.interior.visible,'Closed room must block entry');element('#entrance-button').listeners.click()}
  art.player.position.copy(hut.doorTarget);tick();assert(element('#interaction-prompt').textContent.includes(hut.ownerName+'的家'),'Approaching a home must show its owner name');
  art.player.position.copy(hut.doorTarget);interact();tick(12);drainTimers();
  assert(element('#place').textContent.includes(hut.themeTitle),'Scaled entry anchor must enter correct room');
  art.player.position.copy(art.panelApproach);interact();tick(2);
  assert(openedUrls.at(-1).includes(`room=${hut.id}`),'Panel must still open exact room link directly');
  assert(art.player.visible&&element('#link-fallback').hidden,'Successful link must restore game immediately');
  const before=art.player.position.clone();key('keydown','w');tick(2);key('keyup','w');assert(before.distanceTo(art.player.position)>.01,'External link return must allow immediate movement');
  assert(director.inside(activeCamera.position),'Returned room camera must stay inside scaled dome');
  art.player.position.copy(art.exitTarget);interact();drainTimers();assert(art.forest.visible&&!art.interior.visible,'Scaled exit anchor must return to forest');
}
assert(element('#explored-count').textContent==='3 / 3','All visits must persist');
assert(['苔苔的家','栗子的家','铃子的家'].every(name=>element('#explored-list').innerHTML.includes(name)),'Exploration chips must identify the actual homes');
art.player.position.copy(art.huts[0].doorTarget);interact();drainTimers();art.player.position.copy(art.panelApproach);window.open=()=>null;interact();
assert(!element('#link-fallback').hidden&&art.player.visible,'Blocked link must restore character and show fallback');
element('#close-fallback').listeners.click();assert(element('#link-fallback').hidden,'Fallback must close without an intermediate panel');
const url=window.PojianCocoons.rooms[0].dataUrl;window.PojianCocoons.rooms[0].dataUrl='javascript:bad()';interact();assert(element('#fallback-data-link').hidden,'Invalid URL must remain blocked');window.PojianCocoons.rooms[0].dataUrl=url;
element('#close-fallback').listeners.click();element('#reset-button').listeners.click();drainTimers();
assert(art.player.position.distanceTo(new THREE.Vector3(...layout.indoor.spawn))<.001,'Reset must use layout spawn');
assert(JSON.parse(saved.get('pojian.stage3.explored')).length===3,'Existing save key must remain compatible');
console.log(`Stage 4.1A: ${checks} camera-relative direction cases, constrained orbit, detailed forest, scaled anchors, three rooms and data return: OK`);
