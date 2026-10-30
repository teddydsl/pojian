/* Stage 3: content-themed rooms, sound and a local data-page bridge. */
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
  const dataLink = $('#data-link');
  const panelDescription = $('#panel-description');
  const soundButton = $('#sound-button');
  const entranceButton = $('#entrance-button');
  const exploredCount = $('#explored-count');
  const exploredList = $('#explored-list');

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
  renderer.domElement.setAttribute('aria-label', '破茧阶段 3 三间主题茧房场景');

  scene.add(new THREE.HemisphereLight('#fff3dc', '#526651', 1.75));
  const sun = new THREE.DirectionalLight('#ffdcac', 2.45);
  sun.position.set(-8, 15, 8);
  scene.add(sun);

  if (!window.PojianHedgehog || !window.PojianStage3Art || !window.PojianCocoons || !window.PojianAudio) {
    $('#failure').hidden = false;
    $('#failure').textContent = '阶段 3 资源或内容配置未加载。请保留完整工程目录。';
    return;
  }
  const { forest, interior, huts, ownDoorTarget, roomAccent, roomLight, player, avatar, setTheme, updateDoorSign } = window.PojianStage3Art.build(THREE, scene);
  const audio = window.PojianAudio.create(window);
  const storageKey = 'pojian.stage3.explored';
  function readExplored() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) || '[]');
      return new Set(Array.isArray(saved) ? saved.filter(id => huts.some(hut => hut.id === id)) : []);
    } catch { return new Set(); }
  }
  const explored = readExplored();
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  function saveExplored() {
    try { window.localStorage.setItem(storageKey, JSON.stringify([...explored])); } catch { /* File URLs may disable storage. */ }
  }
  function updateExplored() {
    exploredCount.textContent = `${explored.size} / ${huts.length}`;
    exploredList.innerHTML = huts.map(hut => `<span class="explored-chip ${explored.has(hut.id) ? 'seen' : ''}">${explored.has(hut.id) ? '✓' : '○'} ${escapeHtml(hut.themeTitle)}</span>`).join('');
    state.progress.threeRooms = explored.size === huts.length;
    updateChecklist();
  }

  const keys=new Set();
  const state={mode:'home',room:null,busy:false,panelFocus:false,doorFocus:null,yaw:0,dragging:false,dragX:0,dragMoved:false,
    forestPosition:new THREE.Vector3(0,0,4.2),progress:{outside:false,knock:false,inside:false,focus:false,data:false,return:false,threeRooms:false,sound:false,closed:false}};
  player.position.set(0,0,1.65);
  camera.position.set(0,7,10);
  const clock=new THREE.Clock();
  let toastTimer=0;
  function say(text) {
    toast.textContent=text; toast.classList.add('visible');
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('visible'),3000);
  }
  function updateChecklist() {
    const labels={outside:'走入针毡森林',knock:'敲门并看到茧丝展开',inside:'发现不同主题的室内',sound:'开启并比较房间声音',focus:'切到数据面板近景',data:'打开示例数据页',return:'从茧房返回森林',threeRooms:'探索三间主题茧房'};
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
    if(state.panelFocus){prompt.textContent='数据面板近景 · 可打开示例页面 · Esc 返回';actionButton.hidden=true;return}
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
    hudPlace.textContent=state.mode==='forest'?'茧林 · 中央空地':state.mode==='home'?'我的树洞':state.room.name+' · '+state.room.themeTitle;
    hudHint.textContent=state.mode==='forest'?'沿三条小径寻找主题茧房':state.mode==='home'?'环顾穹顶，探索面板与出口':state.room.themeTitle+' · '+state.room.sound;
    interior.visible=state.mode!=='forest';forest.visible=state.mode==='forest';
    if(state.mode==='room'){roomAccent.material.color.set(state.room.color);roomLight.color.set(state.room.color);setTheme(state.room.themeId);audio.setTheme(state.room.themeId)}
    else {roomAccent.material.color.set('#b99973');roomLight.color.set('#e4aa76');setTheme('home');audio.setTheme(state.mode==='forest'?'forest':'home')}
    updateChecklist();
  }
  function safeDataUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const resolved = new URL(value, window.location.href);
      return ['http:', 'https:', 'file:'].includes(resolved.protocol) ? resolved.href : null;
    } catch { return null; }
  }
  function updatePanelLink() {
    const room = state.mode === 'room' ? state.room : null;
    const config = window.PojianCocoons.rooms.find(item => item.id === room?.id);
    const url = safeDataUrl(config?.dataUrl || (room ? '' : 'demo-data.html?room=home'));
    dataLink.hidden = !url;
    if (url) dataLink.href = url;
    panelDescription.textContent = room
      ? `${room.themeTitle} · ${config?.demoLine || '此处将显示屋主授权的数据信息。'} 当前为演示内容。`
      : '这是自己的示例数据页。正式人物标签和数据地址会在内容提供后替换。';
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
        transition(()=>{state.mode='room';state.room=hut;state.forestPosition.copy(player.position);player.position.set(0,0,1.65);state.progress.inside=true;explored.add(hut.id);saveExplored();updateExplored()});
        say('已进入 '+hut.themeTitle+'。观察布置、色光，并开启声音比较。');
      },1250);
    } else if(action.kind==='panel') {
      state.panelFocus=true;state.progress.focus=true;panelOverlay.hidden=false;player.visible=false;updateChecklist();updatePrompt();
      updatePanelLink();
      say('镜头已切到面板正前方，可打开示例数据页。');
    }
  }
  function closePanelFocus(){if(!state.panelFocus)return;state.panelFocus=false;panelOverlay.hidden=true;player.visible=true;updatePrompt();}
  actionButton.addEventListener('click',interact);
  $('#panel-return').addEventListener('click',closePanelFocus);
  dataLink.addEventListener('click', () => {
    state.progress.data = true; updateChecklist();
    say('示例数据页已在新标签打开；回到游戏标签可继续探索。');
  });
  soundButton.addEventListener('click', async () => {
    try {
      const enabled = await audio.toggle();
      soundButton.textContent = enabled ? '声音：开启' : '声音：关闭';
      soundButton.setAttribute('aria-pressed', String(enabled));
      if (enabled) { state.progress.sound = true; updateChecklist(); say('声音已开启。进入不同茧房可听到不同氛围。'); }
      else say(audio.supported ? '声音已关闭。' : '此浏览器暂不支持声音。');
    } catch { say('浏览器未能启动声音。你仍可继续探索。'); }
  });
  entranceButton.addEventListener('click', () => {
    const hut = huts.find(item => item.id === 'hill');
    hut.open = !hut.open; updateDoorSign(hut);
    entranceButton.textContent = hut.open ? '关闭苔坡树桩' : '开放苔坡树桩';
    if (!hut.open) state.progress.closed = true;
    updatePrompt(); say(hut.open ? '苔坡树桩已开放，可进入音乐收藏茧房。' : '苔坡树桩已关门，靠近后无法进入。');
  });
  $('#clear-exploration').addEventListener('click', () => {
    explored.clear(); saveExplored(); updateExplored(); say('本机的阶段 3 探索记录已清空。');
  });
  $('#reset-button').addEventListener('click',()=>{
    state.busy=false;state.mode='home';state.room=null;state.yaw=0;state.panelFocus=false;state.doorFocus=null;
    state.progress={outside:false,knock:false,inside:false,focus:false,data:false,return:false,threeRooms:explored.size===huts.length,sound:audio.isOn(),closed:false};
    player.position.set(0,0,1.65);player.rotation.y=0;
    huts.forEach(h=>{h.door.userData.progress=0;h.door.userData.opening=false;h.door.children.forEach(p=>p.rotation.y=0)});
    panelOverlay.hidden=true;player.visible=true;
    fade.classList.remove('on');updateHud();updateExplored();updatePrompt();say('演示已重置，已探索房间仍保存在本机。');
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
  entranceButton.textContent = huts.find(item => item.id === 'hill').open ? '关闭苔坡树桩' : '开放苔坡树桩';
  soundButton.textContent = audio.supported ? '声音：关闭' : '声音不可用';
  soundButton.disabled = !audio.supported;
  updateHud();updateExplored();updatePrompt();

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
    audio.update();
    renderer.render(scene,camera);
    requestAnimationFrame(animate);
  }
  animate();
})();
