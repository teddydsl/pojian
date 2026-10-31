/* Current runtime: Stage 4.1A spatial contract and camera-relative movement. */
(() => {
  'use strict';
  const THREE = window.THREE;
  const layout = window.PojianLayout;
  const $ = selector => document.querySelector(selector);
  const hudPlace = $('#place');
  const hudHint = $('#hint');
  const actionButton = $('#action-button');
  const prompt = $('#interaction-prompt');
  const toast = $('#toast');
  const fade = $('#fade');
  const checklist = $('#checklist');
  const viewport = $('#viewport');
  const taskPanel = $('#task-panel');
  const taskToggle = $('#task-toggle');
  const settingsPanel = $('#settings-panel');
  const settingsButton = $('#settings-button');
  const fallback = $('#link-fallback');
  const fallbackLink = $('#fallback-data-link');
  const fallbackError = $('#link-error');
  const fpsValue = $('#fps-value');
  const loading = $('#loading');
  const soundButton = $('#sound-button');
  const entranceButton = $('#entrance-button');
  const exploredCount = $('#explored-count');
  const exploredList = $('#explored-list');

  if (!THREE) {
    loading.hidden = true;
    $('#failure').hidden = false;
    $('#failure').textContent = '3D 引擎未加载。请确认 public/vendor/three.global.js 与此 HTML 位于同一工程。';
    return;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#b8c4b7');
  scene.fog = new THREE.Fog('#b8c4b7', 18*layout.worldScale, 48*layout.worldScale);
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 120);
  const cameraDirector = window.PojianCamera.create(THREE,camera,layout);
  const movement = window.PojianMovement.create(THREE,layout);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  } catch (error) {
    loading.hidden = true;
    $('#failure').hidden = false;
    $('#failure').textContent = '浏览器无法启动 WebGL。请开启硬件加速后重新打开验收页。';
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.28;
  viewport.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', '破茧阶段 4.1 茧林与主题茧房');

  scene.add(new THREE.HemisphereLight('#fff3dc', '#526651', 1.75));
  const sun = new THREE.DirectionalLight('#ffdcac', 2.45);
  sun.position.set(-8, 15, 8);
  scene.add(sun);

  if (!window.PojianHedgehog || !window.PojianCurrentArt || !window.PojianCocoons || !window.PojianAudio) {
    loading.hidden = true;
    $('#failure').hidden = false;
    $('#failure').textContent = '阶段 4 资源或内容配置未加载。请保留完整工程目录。';
    return;
  }
  let art;
  try { art = window.PojianCurrentArt.build(THREE, scene); }
  catch (error) {
    loading.hidden = true;
    $('#failure').hidden = false;
    $('#failure').textContent = '3D 场景创建失败。请检查工程文件是否完整后重新打开验收页。';
    return;
  }
  const { forest, interior, huts, ownDoorTarget, roomAccent, roomLight, player, avatar, panelApproach, setTheme, updateDoorSign, forestColliders, furnitureColliders, exitTarget } = art;
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
    forestPosition:new THREE.Vector3(...layout.world.spawn),progress:{outside:false,knock:false,inside:false,focus:false,data:false,return:false,threeRooms:false,sound:false,closed:false}};
  player.position.set(...layout.indoor.spawn);
  cameraDirector.pose(player.position,state.yaw,state.mode,1,true);
  const clock=new THREE.Clock();
  let toastTimer=0;
  let frameCount=0, fpsStart=performance.now(), slowSamples=0;
  let pixelRatio=Math.min(window.devicePixelRatio||1,2);
  function say(text) {
    toast.textContent=text; toast.classList.add('visible');
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('visible'),3000);
  }
  function updateChecklist() {
    const labels={outside:'走入针毡森林',knock:'敲门并进入茧房',inside:'发现不同主题的室内',sound:'开启并比较房间声音',focus:'靠近并打开数据面板',data:'直接到达示例数据页',return:'从茧房返回森林',threeRooms:'探索三间主题茧房'};
    checklist.innerHTML=Object.entries(labels).map(([key,label])=>
      `<li class="${state.progress[key]?'done':''}"><span>${state.progress[key]?'✓':'○'}</span>${label}</li>`).join('');
  }
  function currentAction() {
    if(state.busy||state.panelFocus||!fallback.hidden||!settingsPanel.hidden)return null;
    if(state.mode==='forest') {
      if(player.position.distanceTo(ownDoorTarget)<layout.reach.home)return {kind:'own',label:'进入自己的树洞'};
      let nearest=null;
      for(const hut of huts) {
        const d=player.position.distanceTo(hut.doorTarget);
        if(d<layout.reach.hut&&(!nearest||d<nearest.distance))nearest={kind:'hut',hut,distance:d,label:hut.open?'敲门 · '+hut.name:'查看关闭的树洞'};
      }
      return nearest;
    }
    if(player.position.distanceTo(panelApproach)<layout.reach.panel)
      return {kind:'panel',label:'打开左侧数据面板'};
    if(player.position.distanceTo(exitTarget)<layout.reach.exit)
      return {kind:'exit',label:state.mode==='home'?'走出自己的茧房':'离开 '+state.room.name};
    return null;
  }
  function updatePrompt() {
    if(state.panelFocus){prompt.textContent='正在打开数据页…';actionButton.hidden=true;return}
    const action=currentAction();
    if(action){prompt.textContent=action.label;actionButton.hidden=false;actionButton.textContent='E · '+action.label}
    else {prompt.textContent=state.mode==='forest'?'沿小径寻找茧房，靠近后按 E 敲门':'靠近左侧面板或正前方出口，按 E 互动';actionButton.hidden=true}
  }
  function transition(change) {
    state.busy=true;fade.classList.add('on');
    setTimeout(()=>{
      change();state.doorFocus=null;state.panelFocus=false;fallback.hidden=true;player.visible=true;
      forest.visible=state.mode==='forest';interior.visible=state.mode!=='forest';
      cameraDirector.pose(player.position,state.yaw,state.mode,1,true);
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
      const base = new URL(window.PojianBasePath || './', window.location.href);
      const resolved = new URL(value, base);
      return ['http:', 'https:', 'file:'].includes(resolved.protocol) ? resolved.href : null;
    } catch { return null; }
  }
  function showLinkFallback(message, url) {
    fallback.hidden = false;
    fallbackError.textContent = message;
    fallbackLink.hidden = !url;
    if (url) fallbackLink.href = url;
  }
  function restoreRoomView() {
    state.panelFocus = false;
    player.visible = true;
    cameraDirector.pose(player.position,state.yaw,state.mode,1,true);
    updatePrompt();
  }
  function openDataPage() {
    const room = state.mode === 'room' ? state.room : null;
    const config = window.PojianCocoons.rooms.find(item => item.id === room?.id);
    const url = safeDataUrl(config?.dataUrl || (room ? '' : 'demo-data-stage4.html?room=home'));
    state.panelFocus = true;
    state.progress.focus = true;
    player.visible = false;
    updateChecklist(); updatePrompt();
    if (!url) {
      restoreRoomView();
      showLinkFallback('这间茧房的数据地址尚未配置。关闭提示后可继续探索。', null);
      say('数据地址不可用；游戏仍保留在原房间。');
      return;
    }
    try {
      // Open inside the key or click gesture, then cut the opener before navigation.
      const tab = window.open('', '_blank');
      if (!tab) throw new Error('popup blocked');
      tab.opener = null;
      tab.location.replace(url);
      state.progress.data = true; updateChecklist();
      restoreRoomView();
      say('数据页已直接打开；切回游戏可继续探索。');
    } catch {
      restoreRoomView();
      showLinkFallback('浏览器拦截了新标签，或数据页未能打开。可点击下方链接重试。', url);
      say('数据页未能自动打开，可以使用重试链接。');
    }
  }
  function interact() {
    const action=currentAction();if(!action)return;
    if(action.kind==='own') {
      transition(()=>{state.forestPosition.copy(player.position);state.mode='home';state.room=null;player.position.set(...layout.indoor.spawn)});
      say('回到了自己的树洞。');
    } else if(action.kind==='exit') {
      if(state.mode==='home') {
        transition(()=>{state.mode='forest';player.position.set(...layout.world.spawn);state.progress.outside=true});
        say('走进茧林。试着靠近一间树洞。');
      } else {
        const hut=state.room;
        transition(()=>{state.mode='forest';player.position.set(...hut.returnPosition);state.progress.return=true;hut.door.userData.opening=false;hut.door.userData.progress=0;hut.door.children.forEach(p=>p.rotation.y=0)});
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
        transition(()=>{state.mode='room';state.room=hut;state.forestPosition.copy(player.position);player.position.set(...layout.indoor.spawn);state.progress.inside=true;explored.add(hut.id);saveExplored();updateExplored()});
        say('已进入 '+hut.themeTitle+'。观察布置、色光，并开启声音比较。');
      },1250);
    } else if(action.kind==='panel') {
      openDataPage();
    }
  }
  function closePanelFocus(){if(!state.panelFocus&&fallback.hidden)return;fallback.hidden=true;restoreRoomView();}
  actionButton.addEventListener('click',interact);
  $('#close-fallback').addEventListener('click', closePanelFocus);
  fallbackLink.addEventListener('click', () => { fallback.hidden = true; say('已尝试重新打开数据页；切回游戏可继续探索。'); });
  soundButton.addEventListener('click', async () => {
    try {
      const enabled = await audio.toggle();
      soundButton.textContent = enabled ? '开启' : '关闭';
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
  function setSettingsOpen(open) {
    keys.clear();state.dragging=false;
    settingsPanel.hidden = !open;
    settingsButton.setAttribute('aria-expanded', String(open));
    settingsButton.setAttribute('aria-label', open ? '关闭设置' : '打开设置');
  }
  settingsButton.addEventListener('click', () => setSettingsOpen(settingsPanel.hidden));
  $('#close-settings').addEventListener('click', () => setSettingsOpen(false));
  let tasksVisible = true;
  try { tasksVisible = window.localStorage.getItem('pojian.stage4.tasksVisible') !== 'false'; } catch { /* Session-only setting. */ }
  function setTasksVisible(visible) {
    tasksVisible = visible;
    taskPanel.hidden = !visible;
    taskToggle.textContent = visible ? '显示' : '隐藏';
    taskToggle.setAttribute('aria-pressed', String(visible));
    try { window.localStorage.setItem('pojian.stage4.tasksVisible', String(visible)); } catch { /* Session-only setting. */ }
  }
  taskToggle.addEventListener('click', () => setTasksVisible(!tasksVisible));
  setTasksVisible(tasksVisible);
  $('#reset-button').addEventListener('click',()=>{
    state.busy=false;state.mode='home';state.room=null;state.yaw=0;state.panelFocus=false;state.doorFocus=null;
    state.progress={outside:false,knock:false,inside:false,focus:false,data:false,return:false,threeRooms:explored.size===huts.length,sound:audio.isOn(),closed:false};
    player.position.set(...layout.indoor.spawn);player.rotation.y=0;
    cameraDirector.pose(player.position,state.yaw,state.mode,1,true);
    huts.forEach(h=>{h.door.userData.progress=0;h.door.userData.opening=false;h.door.children.forEach(p=>p.rotation.y=0)});
    fallback.hidden=true;player.visible=true;
    fade.classList.remove('on');updateHud();updateExplored();updatePrompt();say('演示已重置，已探索房间仍保存在本机。');
  });
  window.addEventListener('keydown',event=>{
    const key=event.key.toLowerCase();
    if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','e','escape'].includes(key))event.preventDefault();
    keys.add(key);
    if(key==='escape'){if(!settingsPanel.hidden)setSettingsOpen(false);else closePanelFocus()}
    if(key==='e'&&!event.repeat)interact();
  });
  window.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
  window.addEventListener('blur',()=>keys.clear());
  renderer.domElement.addEventListener('pointerdown',event=>{if(!settingsPanel.hidden||!fallback.hidden||state.busy)return;state.dragging=true;state.dragX=event.clientX;state.dragMoved=false;renderer.domElement.setPointerCapture(event.pointerId)});
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
  soundButton.textContent = audio.supported ? '关闭' : '不可用';
  soundButton.disabled = !audio.supported;
  updateHud();updateExplored();updatePrompt();

  function move(dt) {
    if(state.busy||state.panelFocus||!fallback.hidden||!settingsPanel.hidden)return;
    const forward=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0);
    const sideways=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);
    if(!forward&&!sideways){avatar.position.y=THREE.MathUtils.damp(avatar.position.y,0,8,dt);return}
    const obstacles=state.mode==='forest'?forestColliders:(furnitureColliders[state.room?.themeId]||[]);
    const result=movement.step(player.position,camera,forward,sideways,dt,state.mode,obstacles),direction=result.direction;
    player.position.copy(result.position);
    const targetYaw=Math.atan2(-direction.x,-direction.z);
    player.rotation.y+=Math.atan2(Math.sin(targetYaw-player.rotation.y),Math.cos(targetYaw-player.rotation.y))*Math.min(1,dt*9);
    avatar.position.y=.045*Math.sin(clock.elapsedTime*14);
  }
  function animate() {
    const dt=Math.min(clock.getDelta(),.05);
    cameraDirector.pose(player.position,state.yaw,state.mode,dt);
    move(dt);
    for(const hut of huts){
      const door=hut.door, target=door.userData.opening?1:0;
      door.userData.progress=THREE.MathUtils.damp(door.userData.progress,target,5.7,dt);
      if (door.children.length === 2) {
        door.children[0].rotation.y=-door.userData.progress*1.36;
        door.children[1].rotation.y=door.userData.progress*1.36;
      }
    }
    if(state.doorFocus&&state.mode==='forest'){
      const hut=state.doorFocus;
      camera.position.lerp(new THREE.Vector3(hut.x+1.7,3.5,hut.doorZ+4.8),1-Math.exp(-4.7*dt));
      camera.lookAt(hut.x,1.6,hut.doorZ-.36);
    }else cameraDirector.pose(player.position,state.yaw,state.mode,0);
    updatePrompt();
    audio.update();
    try { renderer.render(scene,camera); }
    catch {
      loading.hidden=true;$('#failure').hidden=false;
      $('#failure').textContent='3D 渲染中断。请重新打开此页；已探索记录仍保存在本机。';
      return;
    }
    loading.hidden=true;
    frameCount++;
    const now=performance.now(), elapsed=now-fpsStart;
    if(elapsed>=1200){
      const fps=Math.round(frameCount*1000/elapsed);
      fpsValue.textContent=fps+' FPS';
      slowSamples=fps<28?slowSamples+1:0;
      if(slowSamples>=2&&pixelRatio>1){
        pixelRatio=1;renderer.setPixelRatio(pixelRatio);resize();slowSamples=0;
        say('已自动降低渲染精度，让探索更流畅。');
      }
      fpsStart=now;frameCount=0;
    }
    requestAnimationFrame(animate);
  }
  animate();
})();
