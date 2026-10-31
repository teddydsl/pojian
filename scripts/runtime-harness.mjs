/* GPU-free inspection of the actual classic-script entry. Not a browser FPS benchmark. */
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
import {JSDOM,VirtualConsole} from 'jsdom';
const root=resolve(import.meta.dirname,'..');
export function boot(page='reviews/stage-5a-1.html') {
  const errors=[],console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e.message));
  const dom=new JSDOM(readFileSync(resolve(root,page),'utf8'),{url:`https://teddydsl.github.io/pojian/${page}`,runScripts:'outside-only',virtualConsole:console});
  const w=dom.window,doc=w.document,find=s=>doc.querySelector(s),timers=[],storage=new Map(),opened=[];
  let frame,art,camera,scene,renderer;
  Object.defineProperty(w,'localStorage',{value:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)}});
  const context=new Proxy({},{get:()=>()=>{}});w.HTMLCanvasElement.prototype.getContext=()=>context;
  w.HTMLElement.prototype.setPointerCapture=()=>{};
  w.Image=class{set src(v){this.value=v;this.onload?.();}};
  w.URL.createObjectURL=URL.createObjectURL;w.URL.revokeObjectURL=URL.revokeObjectURL;w.Blob=Blob;w.TextDecoder=TextDecoder;
  w.setTimeout=(callback,delay=0)=>{const t={callback,delay};timers.push(t);return t;};w.clearTimeout=t=>{const i=timers.indexOf(t);if(i>=0)timers.splice(i,1);};
  w.requestAnimationFrame=cb=>{frame=cb;};w.ResizeObserver=class{observe(){}};
  Object.defineProperty(find('#viewport'),'clientWidth',{value:1440});Object.defineProperty(find('#viewport'),'clientHeight',{value:900});
  w.open=()=>({opener:w,location:{replace:url=>opened.push(url)}});
  let audioOn=false;
  function install() {
    const THREE=w.THREE,Camera=THREE.PerspectiveCamera;
    THREE.PerspectiveCamera=class extends Camera{constructor(...args){super(...args);camera=this;}};
    THREE.Clock=class{elapsedTime=0;getDelta(){this.elapsedTime+=.016;return .016;}};
    THREE.WebGLRenderer=class{constructor(){renderer=this;this.domElement=doc.createElement('canvas');}setPixelRatio(){}setSize(){}render(){}};
    const build=w.PojianCurrentArt.build;w.PojianCurrentArt.build=(...args)=>{scene=args[1];art=build(...args);return art;};
    w.PojianAudio.create=()=>({supported:true,toggle:async()=>audioOn=!audioOn,isOn:()=>audioOn,setTheme(){},update(){}});
  }
  let parseMs=0,bootMs=0;
  const scripts=[...doc.querySelectorAll('script')];
  for(const el of scripts){
    if(!el.src){w.eval(el.textContent);continue;}
    const path=new URL(el.src).pathname.replace(/^\/pojian\//,''),source=readFileSync(resolve(root,path),'utf8');
    const runtime=path.endsWith('/runtime.js')||path.endsWith('/stage-5a-1.js');
    if(runtime)install();
    const before=performance.now();w.eval(source);const ms=performance.now()-before;
    if(runtime)bootMs+=ms;else parseMs+=ms;
  }
  function key(value,type='keydown'){w.dispatchEvent(new w.KeyboardEvent(type,{key:value,bubbles:true,cancelable:true}));}
  function tap(value){key(value);key(value,'keyup');}
  function tick(n=1){for(let i=0;i<n;i++)frame();}
  function drain(){let n=0;while(timers.length&&n++<200)timers.shift().callback();if(n>=200)throw Error('Timer loop');}
  function stats(){
    const THREE=w.THREE,frustum=new THREE.Frustum();scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
    frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
    let visibleMeshes=0,culledMeshes=0,estimatedCalls=0,estimatedTriangles=0,lights=0;const geometries=new Set(),materials=new Set(),textures=new Set();
    scene.traverseVisible(node=>{
      if(node.isLight)lights++;
      if(!node.isMesh||!node.geometry)return;
      if(node.frustumCulled&&!frustum.intersectsObject(node)){culledMeshes++;return;}
      const mats=Array.isArray(node.material)?node.material:[node.material];if(mats.every(m=>m.visible===false))return;
      visibleMeshes++;geometries.add(node.geometry);mats.forEach(m=>{materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);});
      const instances=node.isInstancedMesh?node.count:1;
      const triangles=(node.geometry.index?.count||node.geometry.attributes.position.count)/3*instances;
      estimatedTriangles+=triangles;estimatedCalls+=Array.isArray(node.material)?node.geometry.groups.length:1;
    });
    let geometryBytes=0;for(const geo of geometries){for(const a of Object.values(geo.attributes))geometryBytes+=a.array.byteLength;if(geo.index)geometryBytes+=geo.index.array.byteLength;}
    return {visibleMeshes,culledMeshes,estimatedCalls,estimatedTriangles:Math.round(estimatedTriangles),visibleLights:lights,uniqueGeometries:geometries.size,geometryBufferBytes:geometryBytes,uniqueMaterials:materials.size,uniqueTextures:textures.size};
  }
  function idleSample(frames=240){
    const observer=new w.MutationObserver(()=>{});observer.observe(doc.body,{subtree:true,childList:true,attributes:true,characterData:true});
    const before=performance.now();tick(frames);const ms=performance.now()-before,mutations=observer.takeRecords().length;observer.disconnect();
    return {frames,totalCpuMs:Number(ms.toFixed(2)),meanCpuMs:Number((ms/frames).toFixed(4)),domMutations:mutations};
  }
  return {w,doc,find,art,camera,scene,renderer,opened,storage,errors,tap,key,tick,drain,stats,idleSample,parseMs,bootMs,reconfigure:options=>dom.reconfigure(options),close:()=>dom.window.close()};
}
