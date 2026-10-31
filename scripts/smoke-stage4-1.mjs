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
vm.runInContext(source('public/vendor/three.global.js'), sandbox, { filename: 'three.global.js' });
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
for (const file of ['public/data/cocoons-stage4.js', 'src/hedgehog-v1.js', 'public/assets/models/hedgehog-plush-single-colored.embedded.js', 'src/hedgehog-felt-glb.js', 'public/assets/models/felt-forest-with-mushrooms.embedded.js', 'src/forest-glb.js', 'public/assets/models/fuzzy-egg-game.embedded.js', 'src/egg-glb.js', 'public/assets/models/fern-plant-game.embedded.js', 'public/assets/models/fern-plant-ground.embedded.js', 'src/fern-glb.js', 'src/stage3-audio.js', 'src/stage4-art.js'])
  vm.runInContext(source(file), sandbox, { filename: file });
const originalBuild = window.PojianStage4Art.build;
window.PojianStage4Art.build = (...args) => { art = originalBuild(...args); return art; };
vm.runInContext(source('src/stage4-1.js'), sandbox, { filename: 'stage4-1.js' });

function key(type, value) { handlers[type]({ key: value, repeat: false, preventDefault() {} }); }
function tick(n = 1) { for (let i = 0; i < n; i++) frame(); }
function drainTimers() { let count = 0; while (timers.length && count++ < 150) timers.shift().callback(); if (count >= 150) throw new Error('Timer loop'); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function interact() { key('keydown', 'e'); key('keyup', 'e'); }

assert(window.PojianCocoons.rooms.length === 3, 'Three rooms must be configurable');
assert(window.PojianModelStatus === 'glb', 'Stage 4.1 must load the approved GLB avatar');
const avatarModel = art.avatar.children[0];
assert(avatarModel.children.length === 1, 'The approved avatar must contain one hedgehog mesh');
assert(avatarModel.children[0].geometry.getAttribute('color')?.normalized, 'The approved avatar must have vertex colors');
assert(Math.abs(avatarModel.scale.y * .40087890625 - 2.2) < .01, 'The single hedgehog must keep the game avatar height');
assert(window.PojianForestStatus === 'glb', 'The forest scene GLB must load');
assert(art.forestDetail.ring.length === 12, 'The supplied forest must encircle the playable clearing');
assert(art.forestDetail.ring.some(tile => tile.position.z > 15) && art.forestDetail.ring.some(tile => tile.position.z < -15), 'The forest must continue north and south');
assert(art.forestDetail.ring.some(tile => tile.position.x > 15) && art.forestDetail.ring.some(tile => tile.position.x < -15), 'The forest must continue east and west');
assert(art.forest.children.some(item => item.geometry?.parameters?.width === 140), 'Ground must extend beyond visible fog');
assert(art.forestDetail.mushrooms.length === 9, 'High-detail source mushrooms must remain beside the routes and huts');
assert(window.PojianFernStatus === 'glb', 'The supplied fern GLBs must load');
assert(art.forestDetail.fern.count >= 180, 'Ferns must fill the forest floor and accent the paths');
assert(art.forestDetail.fern.ground.isInstancedMesh && art.forestDetail.fern.accents.isInstancedMesh, 'Ground cover must use shared instanced geometry');
assert(window.PojianEggStatus === 'glb', 'The supplied cocoon model must load');
assert(art.huts.every(hut => hut.shell?.name === 'supplied-fuzzy-egg-shell'), 'All three rooms must use the supplied cocoon');
assert(art.huts.every(hut => hut.door.children.length === 0), 'Overlapping decorative door leaves must be removed');
assert(art.forestDetail.hangingEggs.length === 4, 'Four background cocoons must hang from rear trees');
assert(art.panelMount.position.x < -2.5 && art.panelMount.rotation.y > 1.5, 'Data panel must be mounted on the side wall');
assert(art.panelApproach.distanceTo(new window.THREE.Vector3(0, 0, -3.8)) > 2, 'Panel and exit interaction areas must remain separate');
assert(element('#place').textContent === '我的树洞', 'Starts inside own cocoon');
assert(element('#loading').hidden, 'Loading cover should clear after first render');
element('#settings-button').listeners.click();
assert(!element('#settings-panel').hidden, 'Settings should open');
element('#task-toggle').listeners.click();
assert(element('#task-panel').hidden, 'Task panel should hide via settings');
element('#task-toggle').listeners.click();
assert(!element('#task-panel').hidden, 'Task panel should return via settings');
assert(!element('#sound-button').disabled, 'Sound control should be available');
await element('#sound-button').listeners.click();
assert(element('#sound-button').textContent === '开启', 'Sound should enable on user gesture');
element('#close-settings').listeners.click();
assert(element('#settings-panel').hidden, 'Settings should close');
key('keydown', 'w'); tick(35); key('keyup', 'w'); interact(); drainTimers();
assert(element('#place').textContent.includes('茧林'), 'Should enter forest');
art.player.position.set(-14, 0, -12.1);
key('keydown', 'w'); tick(10); key('keyup', 'w');
assert(Math.hypot(art.player.position.x + 14, art.player.position.z + 13) >= .55 - .001, 'Tree trunk should block walking through');

for (const hut of art.huts) {
  if (hut.id === 'hill') {
    element('#entrance-button').listeners.click();
    art.player.position.copy(hut.doorTarget); interact();
    assert(element('#place').textContent.includes('茧林'), 'Closed room must block entry');
    element('#entrance-button').listeners.click();
  }
  art.player.position.copy(hut.doorTarget); interact(); tick(12); drainTimers();
  assert(element('#place').textContent.includes(hut.themeTitle), `Should enter ${hut.themeTitle}`);
  assert(art.themeGroups[hut.themeId].visible, `Theme geometry should show for ${hut.themeTitle}`);
  if (hut.id === 'north') {
    art.player.position.set(2.45, 0, -1.2);
    key('keydown', 'w'); tick(9); key('keyup', 'w');
    assert(Math.hypot(art.player.position.x - 2.45, art.player.position.z + 2) >= .63 - .001, 'Furniture should block walking through');
  }
  AudioContext.instances[0].currentTime += 3; tick(2);
  art.player.position.copy(art.panelApproach); interact(); tick(5);
  assert(openedUrls.at(-1)?.includes(`room=${hut.id}`), 'Panel interaction should directly open configured data URL');
  assert(element('#link-fallback').hidden, 'Normal data flow should have no intermediate panel');
  assert(art.player.visible, 'Player must be visible immediately after opening the data page');
  assert(!element('#interaction-prompt').textContent.includes('Esc'), 'Return should not require Escape');
  const beforeReturn = art.player.position.clone();
  key('keydown', 'w'); tick(3); key('keyup', 'w');
  assert(art.player.position.distanceTo(beforeReturn) > .03, 'Player must move after data page opens without Escape');
  art.player.position.set(0, 0, 4.2); tick(35);
  assert(activeCamera.position.distanceTo(art.player.position) >= 2.6, 'Indoor camera must stay outside the avatar at the dome edge');
  art.player.position.set(0, 0, -3.8); interact(); drainTimers();
  assert(element('#place').textContent.includes('茧林'), 'Should return to forest');
}

assert(element('#explored-count').textContent === '3 / 3', 'All room visits should be recorded');
assert(JSON.parse(saved.get('pojian.stage3.explored')).length === 3, 'Visits should persist locally');
assert(AudioContext.tones >= 3, 'Each theme should emit a sound cue');
assert((element('#checklist').innerHTML.match(/class="done"/g) || []).length === 8, 'All Stage 4 route checks should pass');
// Blocked popup recovery remains in the same room with a retry link.
art.player.position.copy(art.huts[0].doorTarget); interact(); drainTimers();
art.player.position.copy(art.panelApproach);
window.open = () => null; interact();
assert(!element('#link-fallback').hidden, 'Blocked popup should show fallback');
assert(art.player.visible, 'Blocked popup must restore avatar visibility');
assert(element('#fallback-data-link').href.includes('room=north'), 'Fallback should target the same room');
element('#close-fallback').listeners.click();
assert(element('#link-fallback').hidden, 'Fallback should dismiss');
assert(!element('#interaction-prompt').textContent.includes('Esc'), 'Blocked popup recovery should not require Escape');
// An invalid URL must not open a new tab.
const originalUrl = window.PojianCocoons.rooms[0].dataUrl;
window.PojianCocoons.rooms[0].dataUrl = 'javascript:alert(1)';
interact();
assert(!element('#link-fallback').hidden && element('#fallback-data-link').hidden, 'Unsafe URL should have no retry link');
assert(art.player.visible, 'Invalid URL must not leave the player hidden');
window.PojianCocoons.rooms[0].dataUrl = originalUrl;
element('#close-fallback').listeners.click();
element('#reset-button').listeners.click(); drainTimers();
assert(element('#explored-count').textContent === '3 / 3', 'Reset must retain saved exploration');
element('#clear-exploration').listeners.click();
assert(element('#explored-count').textContent === '0 / 3', 'Clear should remove local exploration');
const review = source('reviews/stage-4-1.html');
const dataPage = source('reviews/demo-data-stage4.html');
assert(review.includes('icons/forest.svg') && dataPage.includes('icons/data.svg'), 'Game and data tabs need distinct favicons');
assert(review.includes('<title>茧林探索') && dataPage.includes('<title>数据视角'), 'Game and data tabs need distinct title prefixes');
console.log('Stage 4.1 smoke path: direct link → immediate return → safe camera → fallback → distinct tabs: OK');
