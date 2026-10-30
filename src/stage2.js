/* Stage 2: playable felt-forest art pass. The hedgehog uses the user-selected v1 study. */
(() => {
  'use strict';
  const THREE = window.THREE;
  const $ = selector => document.querySelector(selector);
  const hudPlace = $('#place');
  const hudHint = $('#hint');
  const actionButton = $('#action-button');
  const prompt = $('#interaction-prompt');
  const toast = $('#toast');
  const fade = $('#fade');
  const checklist = $('#checklist');
  const viewport = $('#viewport');
  const panelOverlay = $('#panel-overlay');

  if (!THREE) {
    $('#failure').hidden = false;
    $('#failure').textContent = '3D 引擎未加载。请确认 public/vendor/three.global.js 与此 HTML 位于同一工程。';
    return;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#b8c4b7');
  scene.fog = new THREE.Fog('#b8c4b7', 18, 48);
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 80);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  } catch (error) {
    $('#failure').hidden = false;
    $('#failure').textContent = '浏览器无法启动 WebGL。请开启硬件加速后重新打开验收页。';
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.28;
  viewport.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', '破茧阶段 2 针毡森林与茧房场景');

  scene.add(new THREE.HemisphereLight('#fff3dc', '#526651', 1.75));
  const sun = new THREE.DirectionalLight('#ffdcac', 2.45);
  sun.position.set(-8, 15, 8);
  scene.add(sun);

  if (!window.PojianHedgehog || !window.PojianStage2Art) {
    $('#failure').hidden = false;
    $('#failure').textContent = '阶段 2 的 3D 资源脚本未加载。请保留完整工程目录。';
    return;
  }
  const { forest, interior, huts, ownDoorTarget, roomAccent, roomLight, player, avatar, panel } = window.PojianStage2Art.build(THREE, scene);

  const keys=new Set();
  const state={mode:'home',room:null,busy:false,panelFocus:false,doorFocus:null,yaw:0,dragging:false,dragX:0,dragMoved:false,
    forestPosition:new THREE.Vector3(0,0,4.2),progress:{outside:false,knock:false,inside:false,focus:false,return:false,closed:false}};
  player.position.set(0,0,1.65);
  camera.position.set(0,7,10);
  const clock=new THREE.Clock();
  let toastTimer=0;
  function say(text) {
    toast.textContent=text; toast.classList.add('visible');
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('visible'),3000);
  }
  function updateChecklist() {
    const labels={outside:'走入针毡森林',knock:'敲门并看到茧丝展开',inside:'进入茧内穹顶',focus:'切到数据面板近景',return:'从茧房返回森林',closed:'关门茧房不能进入'};
    checklist.innerHTML=Object.entries(labels).map(([key,label])=>
      `<li class="${state.progress[key]?'done':''}"><span>${state.progress[key]?'✓':'○'}</span>${label}</li>`).join('');
  }
  function currentAction() {
    if(state.busy||state.panelFocus)return null;
    if(state.mode==='forest') {
      if(player.position.distanceTo(ownDoorTarget)<2.5)return {kind:'own',label:'进入自己的树洞'};
      let nearest=null;
      for(const hut of huts) {
        const d=player.position.distanceTo(hut.doorTarget);
        if(d<3.1&&(!nearest||d<nearest.distance))nearest={kind:'hut',hut,distance:d,label:hut.open?'敲门 · '+hut.name:'查看关闭的树洞'};
      }
      return nearest;
    }
    if(player.position.distanceTo(new THREE.Vector3(0,0,-1.6))<1.15)
      return {kind:'panel',label:'聚焦中央数据面板'};
    if(player.position.distanceTo(new THREE.Vector3(0,0,-3.8))<1.65)
      return {kind:'exit',label:state.mode==='home'?'走出自己的茧房':'离开 '+state.room.name};
    return null;
  }
  function updatePrompt() {
    if(state.panelFocus){prompt.textContent='数据面板近景 · 按 Esc 返回探索';actionButton.hidden=true;return}
    const action=currentAction();
    if(action){prompt.textContent=action.label;actionButton.hidden=false;actionButton.textContent='E · '+action.label}
    else {prompt.textContent=state.mode==='forest'?'沿小径寻找茧房，靠近后按 E 敲门':'靠近中央面板或远处出口，按 E 互动';actionButton.hidden=true}
  }
  function transition(change) {
    state.busy=true;fade.classList.add('on');
    setTimeout(()=>{
      change();state.doorFocus=null;state.panelFocus=false;panelOverlay.hidden=true;player.visible=true;
      forest.visible=state.mode==='forest';interior.visible=state.mode!=='forest';
      camera.position.copy(player.position).add(state.mode==='forest'?new THREE.Vector3(0,6.3,8):new THREE.Vector3(0,2.4,2.4));
      updateHud();updatePrompt();
      setTimeout(()=>{fade.classList.remove('on');state.busy=false;updatePrompt()},100);
    },320);
  }
  function updateHud() {
    hudPlace.textContent=state.mode==='forest'?'茧林 · 中央空地':state.mode==='home'?'我的树洞':state.room.name+' · 室内';
    hudHint.textContent=state.mode==='forest'?'寻找树洞，敲门探索':state.mode==='home'?'环顾穹顶，探索面板与出口':'环顾穹顶，走近中央面板';
    interior.visible=state.mode!=='forest';forest.visible=state.mode==='forest';
    if(state.mode==='room'){roomAccent.material.color.set(state.room.color);roomLight.color.set(state.room.color)}
    else {roomAccent.material.color.set('#b99973');roomLight.color.set('#e4aa76')}
    updateChecklist();
  }
  function interact() {
    const action=currentAction();if(!action)return;
    if(action.kind==='own') {
      transition(()=>{state.forestPosition.copy(player.position);state.mode='home';state.room=null;player.position.set(0,0,1.65)});
      say('回到了自己的树洞。');
    } else if(action.kind==='exit') {
      if(state.mode==='home') {
        transition(()=>{state.mode='forest';player.position.set(0,0,4.2);state.progress.outside=true});
        say('走进茧林。试着靠近一间树洞。');
      } else {
        const hut=state.room;
        transition(()=>{state.mode='forest';player.position.set(hut.x,0,hut.doorZ+2.1);state.progress.return=true;hut.door.userData.opening=false;hut.door.userData.progress=0;hut.door.children.forEach(p=>p.rotation.y=0)});
        say('已返回茧林，可以继续探索。');
      }
    } else if(action.kind==='hut') {
      const hut=action.hut;
      if(!hut.open) {
        state.progress.closed=true;updateChecklist();say(hut.name+'暂时关门，不能进入。');return;
      }
      state.busy=true;state.doorFocus=hut;state.progress.knock=true;updateChecklist();
      say('咚、咚。示例主人已同意进入。');
      hut.door.userData.opening=true;
      setTimeout(()=>{
        transition(()=>{state.mode='room';state.room=hut;state.forestPosition.copy(player.position);player.position.set(0,0,1.65);state.progress.inside=true});
        say('已进入 '+hut.name+'。抬头和转向，看看茧丝穹顶。');
      },1250);
    } else if(action.kind==='panel') {
      state.panelFocus=true;state.progress.focus=true;panelOverlay.hidden=false;player.visible=false;updateChecklist();updatePrompt();
      say('镜头已切到面板正前方。数据网页将在阶段 3 接入。');
    }
  }
  function closePanelFocus(){if(!state.panelFocus)return;state.panelFocus=false;panelOverlay.hidden=true;player.visible=true;updatePrompt();}
  actionButton.addEventListener('click',interact);
  $('#panel-return').addEventListener('click',closePanelFocus);
  $('#reset-button').addEventListener('click',()=>{
    state.busy=false;state.mode='home';state.room=null;state.yaw=0;state.panelFocus=false;state.doorFocus=null;
    state.progress={outside:false,knock:false,inside:false,focus:false,return:false,closed:false};
    player.position.set(0,0,1.65);player.rotation.y=0;
    huts.forEach(h=>{h.door.userData.progress=0;h.door.userData.opening=false;h.door.children.forEach(p=>p.rotation.y=0)});
    panelOverlay.hidden=true;player.visible=true;
    fade.classList.remove('on');updateHud();updatePrompt();say('演示已重置，从自己的树洞重新开始。');
  });
  window.addEventListener('keydown',event=>{
    const key=event.key.toLowerCase();
    if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','e','escape'].includes(key))event.preventDefault();
    keys.add(key);
    if(key==='escape')closePanelFocus();
    if(key==='e'&&!event.repeat)interact();
  });
  window.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
  window.addEventListener('blur',()=>keys.clear());
  renderer.domElement.addEventListener('pointerdown',event=>{state.dragging=true;state.dragX=event.clientX;state.dragMoved=false;renderer.domElement.setPointerCapture(event.pointerId)});
  renderer.domElement.addEventListener('pointermove',event=>{
    if(!state.dragging)return;
    const delta=event.clientX-state.dragX;state.dragX=event.clientX;
    if(Math.abs(delta)>0){state.dragMoved=true;state.yaw-=delta*.005}
  });
  renderer.domElement.addEventListener('pointerup',()=>{state.dragging=false});
  renderer.domElement.addEventListener('pointercancel',()=>{state.dragging=false});
  function resize() {
    const width=viewport.clientWidth,height=viewport.clientHeight;
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(viewport);resize();
  updateHud();updatePrompt();

  function move(dt) {
    if(state.busy||state.panelFocus)return;
    const forward=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0);
    const sideways=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);
    if(!forward&&!sideways){avatar.position.y=THREE.MathUtils.damp(avatar.position.y,0,8,dt);return}
    const f=new THREE.Vector3(-Math.sin(state.yaw),0,-Math.cos(state.yaw));
    const r=new THREE.Vector3(Math.cos(state.yaw),0,-Math.sin(state.yaw));
    const direction=f.multiplyScalar(forward).add(r.multiplyScalar(sideways)).normalize();
    const speed=state.mode==='forest'?4.2:3.1;
    const next=player.position.clone().addScaledVector(direction,speed*dt);
    if(state.mode==='forest') {
      next.x=THREE.MathUtils.clamp(next.x,-15,15);next.z=THREE.MathUtils.clamp(next.z,-16,11.2);
      for(const hut of huts) {
        const center=new THREE.Vector2(hut.x,hut.z);
        const offset=new THREE.Vector2(next.x,next.z).sub(center);
        if(offset.length()<1.65){offset.setLength(1.65);next.x=center.x+offset.x;next.z=center.y+offset.y}
      }
    } else {
      const radius=Math.hypot(next.x,next.z);
      if(radius>4.32){next.x*=4.32/radius;next.z*=4.32/radius}
    }
    player.position.copy(next);
    const targetYaw=Math.atan2(-direction.x,-direction.z);
    player.rotation.y+=Math.atan2(Math.sin(targetYaw-player.rotation.y),Math.cos(targetYaw-player.rotation.y))*Math.min(1,dt*9);
    avatar.position.y=.045*Math.sin(clock.elapsedTime*14);
  }
  function animate() {
    const dt=Math.min(clock.getDelta(),.05);
    move(dt);
    for(const hut of huts){
      const door=hut.door, target=door.userData.opening?1:0;
      door.userData.progress=THREE.MathUtils.damp(door.userData.progress,target,5.7,dt);
      door.children[0].rotation.y=-door.userData.progress*1.36;
      door.children[1].rotation.y=door.userData.progress*1.36;
    }
    let targetPosition,lookAt;
    if(state.panelFocus){
      targetPosition=new THREE.Vector3(0,2.45,.1);lookAt=new THREE.Vector3(0,2.45,-2.23);
    }else if(state.doorFocus&&state.mode==='forest'){
      const hut=state.doorFocus;targetPosition=new THREE.Vector3(hut.x+1.4,2.8,hut.doorZ+4.0);lookAt=new THREE.Vector3(hut.x,1.35,hut.doorZ-.3);
    }else if(state.mode==='forest'){
      targetPosition=player.position.clone().add(new THREE.Vector3(Math.sin(state.yaw)*8.5,6.3,Math.cos(state.yaw)*8.5));
      lookAt=new THREE.Vector3(player.position.x,1.12,player.position.z);
    }else{
      targetPosition=player.position.clone().add(new THREE.Vector3(Math.sin(state.yaw)*2.45,2.27,Math.cos(state.yaw)*2.45));
      const radius=Math.hypot(targetPosition.x,targetPosition.z);
      if(radius>3.75){targetPosition.x*=3.75/radius;targetPosition.z*=3.75/radius}
      lookAt=new THREE.Vector3(player.position.x,1.25,player.position.z-.18);
    }
    camera.position.lerp(targetPosition,1-Math.exp(-4.7*dt));
    camera.lookAt(lookAt);
    updatePrompt();
    renderer.render(scene,camera);
    requestAnimationFrame(animate);
  }
  animate();
})();
