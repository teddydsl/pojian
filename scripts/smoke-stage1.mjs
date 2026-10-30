import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

// Runs the interaction path without a browser or GPU. It verifies startup and
// state transitions; visual acceptance remains a human review of the HTML.
const root = resolve(import.meta.dirname, '..');
const library = readFileSync(resolve(root, 'public/vendor/three.global.js'), 'utf8');
const game = readFileSync(resolve(root, 'src/stage1.js'), 'utf8');
const elements = new Map();
const classList = () => ({ add() {}, remove() {} });
function element(id = '') {
  if (!elements.has(id)) elements.set(id, {
    id, hidden: false, clientWidth: 1200, clientHeight: 800,
    textContent: '', innerHTML: '', classList: classList(), listeners: {},
    appendChild() {}, setAttribute() {}, setPointerCapture() {},
    addEventListener(type, callback) { this.listeners[type] = callback; },
  });
  return elements.get(id);
}
const document = {
  querySelector(selector) { return element(selector); },
  createElement(tag) {
    if (tag !== 'canvas') throw new Error(`Unexpected element: ${tag}`);
    return { width: 0, height: 0, getContext() { return { fillRect() {}, fillText() {} }; } };
  },
};
const handlers = {};
const window = { devicePixelRatio: 1, addEventListener(type, callback) { handlers[type] = callback; } };
let frame;
const context = vm.createContext({
  console, document, window, performance,
  setTimeout(callback) { callback(); return 1; }, clearTimeout() {},
  requestAnimationFrame(callback) { frame = callback; },
  ResizeObserver: class { observe() {} },
});
vm.runInContext(library, context, { filename: 'three.global.js' });
window.THREE = context.THREE;
window.THREE.WebGLRenderer = class {
  constructor() { this.domElement = element('render-canvas'); }
  setPixelRatio() {} setSize() {} render() {}
};
window.THREE.Clock = class { elapsedTime = 0; getDelta() { this.elapsedTime += .05; return .05; } };
vm.runInContext(game, context, { filename: 'stage1.js' });

function key(type, value) { handlers[type]({ key: value, repeat: false, preventDefault() {} }); }
function tick(n) { for (let i = 0; i < n; i++) frame(); }
function assert(condition, message) { if (!condition) throw new Error(message); }
assert(element('#place').textContent === '我的树洞', 'Should start in own tree hole');
key('keydown', 'w'); tick(35); key('keyup', 'w'); key('keydown', 'e'); key('keyup', 'e');
assert(element('#place').textContent.includes('茧林'), 'Should exit into forest');
key('keydown', 'w'); tick(65); key('keyup', 'w'); key('keydown', 'e'); key('keyup', 'e');
assert(element('#place').textContent.includes('溪畔倒木'), 'Should enter open cocoon');
key('keydown', 'w'); tick(35); key('keyup', 'w'); key('keydown', 'e'); key('keyup', 'e');
assert(element('#place').textContent.includes('茧林'), 'Should return to forest');
key('keydown', 'd'); tick(37); key('keyup', 'd'); key('keydown', 'e'); key('keyup', 'e');
assert(element('#checklist').innerHTML.includes('发现关门状态不能进入'), 'Closed door check should render');
assert(element('#checklist').innerHTML.match(/class="done"/g)?.length === 5, 'All five acceptance items should complete');
element('#reset-button').listeners.click();
assert(element('#place').textContent === '我的树洞', 'Reset should restore starting room');
console.log('Stage 1 smoke path: own room → forest → open cocoon → forest → closed cocoon → reset: OK');
