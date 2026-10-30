import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

// GPU-free interaction check. Visual quality is reviewed in the stage-2 HTML.
const root = resolve(import.meta.dirname, '..');
const source = name => readFileSync(resolve(root, name), 'utf8');
const elements = new Map();
const classList = () => ({ add() {}, remove() {}, toggle() {} });
function element(id = '') {
  if (!elements.has(id)) elements.set(id, {
    id, hidden: false, visible: true, clientWidth: 1200, clientHeight: 800,
    textContent: '', innerHTML: '', classList: classList(), listeners: {}, children: [],
    appendChild() {}, setAttribute() {}, setPointerCapture() {},
    addEventListener(type, callback) { this.listeners[type] = callback; },
  });
  return elements.get(id);
}
const ctx2d = { fillRect() {}, fillText() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, closePath() {}, arc() {}, fill() {}, strokeRect() {} };
const document = {
  querySelector(selector) { return element(selector); },
  createElement(tag) {
    if (tag !== 'canvas') throw new Error(`Unexpected element: ${tag}`);
    return { width: 0, height: 0, getContext() { return ctx2d; } };
  },
};
const handlers = {}, timers = [];
const window = { devicePixelRatio: 1, addEventListener(type, callback) { handlers[type] = callback; } };
let frame, art;
const sandbox = vm.createContext({
  console, document, window, performance,
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
vm.runInContext(source('src/hedgehog-v1.js'), sandbox, { filename: 'hedgehog-v1.js' });
vm.runInContext(source('src/stage2-art.js'), sandbox, { filename: 'stage2-art.js' });
const originalBuild = window.PojianStage2Art.build;
window.PojianStage2Art.build = (...args) => { art = originalBuild(...args); return art; };
vm.runInContext(source('src/stage2.js'), sandbox, { filename: 'stage2.js' });

function key(type, value) { handlers[type]({ key: value, repeat: false, preventDefault() {} }); }
function tick(n) { for (let i = 0; i < n; i++) frame(); }
function drainTimers() { let count = 0; while (timers.length && count++ < 100) timers.shift().callback(); if (count >= 100) throw new Error('Timer loop'); }
function assert(condition, message) { if (!condition) throw new Error(message); }
assert(element('#place').textContent === '我的树洞', 'Should start inside own cocoon');
assert(art.interior.visible && !art.forest.visible, 'Should show the inside dome at start');

key('keydown', 'w'); tick(35); key('keyup', 'w'); key('keydown', 'e'); key('keyup', 'e'); drainTimers();
assert(element('#place').textContent.includes('茧林'), 'Should exit into felt forest');
key('keydown', 'w'); tick(65); key('keyup', 'w'); key('keydown', 'e'); key('keyup', 'e');
tick(12);
assert(art.huts[1].door.userData.progress > .5, 'Open cocoon silk should animate');
drainTimers();
assert(element('#place').textContent.includes('溪畔倒木'), 'Should enter the open cocoon');
assert(art.interior.visible && !art.forest.visible, 'Should switch to indoor dome');

key('keydown', 'w'); tick(17); key('keyup', 'w'); key('keydown', 'e'); key('keyup', 'e');
assert(!element('#panel-overlay').hidden, 'Panel camera overlay should open');
tick(8);
key('keydown', 'Escape'); key('keyup', 'Escape');
assert(element('#panel-overlay').hidden, 'Escape should restore indoor exploration');
key('keydown', 'w'); tick(18); key('keyup', 'w'); key('keydown', 'e'); key('keyup', 'e'); drainTimers();
assert(element('#place').textContent.includes('茧林'), 'Should return to forest');
key('keydown', 'd'); tick(37); key('keyup', 'd'); key('keydown', 'e'); key('keyup', 'e');
assert(element('#checklist').innerHTML.match(/class="done"/g)?.length === 6, 'All six stage-2 path steps should complete');
element('#reset-button').listeners.click(); drainTimers();
assert(element('#place').textContent === '我的树洞', 'Reset should restore the start');
console.log('Stage 2 smoke path: own dome → felt forest → silk door → indoor panel focus → return → closed door → reset: OK');
