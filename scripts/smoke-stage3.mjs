import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

// GPU-free check of the three-room path, data-page bridge, local records and sound setup.
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
const handlers = {}, timers = [], saved = new Map();
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
  location: { href: 'https://teddydsl.github.io/pojian/reviews/stage-3.html' },
  localStorage: { getItem(key) { return saved.get(key) ?? null; }, setItem(key, value) { saved.set(key, value); } },
  addEventListener(type, callback) { handlers[type] = callback; },
};
let frame, art;
const sandbox = vm.createContext({
  console, document, window, performance, URL, Math,
  setTimeout(callback, delay = 0) { const timer = { callback, delay }; timers.push(timer); return timer; },
  clearTimeout(timer) { const i = timers.indexOf(timer); if (i >= 0) timers.splice(i, 1); },
  requestAnimationFrame(callback) { frame = callback; },
  ResizeObserver: class { observe() {} },
});
vm.runInContext(source('public/vendor/three.global.js'), sandbox, { filename: 'three.global.js' });
window.THREE = sandbox.THREE;
window.THREE.WebGLRenderer = class {
  constructor() { this.domElement = element('render-canvas'); }
  setPixelRatio() {} setSize() {} render() {}
};
window.THREE.Clock = class { elapsedTime = 0; getDelta() { this.elapsedTime += .05; return .05; } };
for (const file of ['public/data/cocoons.js', 'src/hedgehog-v1.js', 'src/stage3-audio.js', 'src/stage3-art.js'])
  vm.runInContext(source(file), sandbox, { filename: file });
const originalBuild = window.PojianStage3Art.build;
window.PojianStage3Art.build = (...args) => { art = originalBuild(...args); return art; };
vm.runInContext(source('src/stage3.js'), sandbox, { filename: 'stage3.js' });

function key(type, value) { handlers[type]({ key: value, repeat: false, preventDefault() {} }); }
function tick(n = 1) { for (let i = 0; i < n; i++) frame(); }
function drainTimers() { let count = 0; while (timers.length && count++ < 150) timers.shift().callback(); if (count >= 150) throw new Error('Timer loop'); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function interact() { key('keydown', 'e'); key('keyup', 'e'); }

assert(window.PojianCocoons.rooms.length === 3, 'Three rooms must be configurable');
assert(element('#place').textContent === '我的树洞', 'Starts inside own cocoon');
assert(!element('#sound-button').disabled, 'Sound control should be available');
await element('#sound-button').listeners.click();
assert(element('#sound-button').textContent.includes('开启'), 'Sound should enable on user gesture');
key('keydown', 'w'); tick(35); key('keyup', 'w'); interact(); drainTimers();
assert(element('#place').textContent.includes('茧林'), 'Should enter forest');

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
  AudioContext.instances[0].currentTime += 3; tick(2);
  art.player.position.set(0, 0, -1.6); interact(); tick(5);
  assert(!element('#panel-overlay').hidden, 'Panel focus should open');
  assert(element('#data-link').href.includes(`room=${hut.id}`), 'Data page URL should use room configuration');
  element('#data-link').listeners.click();
  key('keydown', 'Escape'); key('keyup', 'Escape');
  art.player.position.set(0, 0, -3.8); interact(); drainTimers();
  assert(element('#place').textContent.includes('茧林'), 'Should return to forest');
}

assert(element('#explored-count').textContent === '3 / 3', 'All room visits should be recorded');
assert(JSON.parse(saved.get('pojian.stage3.explored')).length === 3, 'Visits should persist locally');
assert(AudioContext.tones >= 3, 'Each theme should emit a sound cue');
assert((element('#checklist').innerHTML.match(/class="done"/g) || []).length === 8, 'All Stage 3 checks should pass');
element('#reset-button').listeners.click(); drainTimers();
assert(element('#explored-count').textContent === '3 / 3', 'Reset must retain saved exploration');
element('#clear-exploration').listeners.click();
assert(element('#explored-count').textContent === '0 / 3', 'Clear should remove local exploration');
console.log('Stage 3 smoke path: three themes → sound → panel links → local record → door toggle → reset: OK');
