/* Forest-first narrative on the accepted art, with map, media, locks and saved progress. */
(() => {
  'use strict';
  const THREE = window.THREE;
  const layout = window.PojianLayout;
  const $ = selector => document.querySelector(selector);
  const actionButton = $('#action-button');
  const prompt = $('#interaction-prompt');
  const toast = $('#toast');
  const fade = $('#fade');
  const checklist = $('#checklist');
  const viewport = $('#viewport');
  const fallback = $('#link-fallback');
  const fallbackLink = $('#fallback-data-link');
  const fallbackError = $('#link-error');
  const fpsValue = $('#fps-value');
  const loading = $('#loading');
  const soundButton = $('#sound-button');
  const exploredCount = $('#explored-count');
  const exploredList = $('#explored-list');
  const intro=$('#intro-overlay'),introProgress=$('#intro-progress'),introPercent=$('#intro-percent');
  const doorButton=$('#door-lock-button');
  const setText=(element,value)=>{if(element.textContent!==value)element.textContent=value;};
  const setHidden=(element,value)=>{if(element.hidden!==value)element.hidden=value;};

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
  renderer.domElement.setAttribute('aria-label', '破茧 茧林与主题茧房');

  const hemisphere = new THREE.HemisphereLight('#fff3dc', '#526651', 1.75);
  scene.add(hemisphere);
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
  const store=window.PojianSave.create(window,huts.map(h=>h.id));
  const weather=window.PojianWeather.create({THREE,scene,renderer,hemisphere,sun,scale:layout.worldScale,config:window.PojianUIConfig.sunny});
  const explored=new Set(store.state.explored);
  const hill=huts.find(h=>h.id==='hill');
  hill.open=false;
  updateDoorSign(hill);
  let ui,mediaInteraction,videoViewer;
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  function updateExplored() {
    const visitedOpenHomes=huts.filter(hut=>hut.id!=='hill'&&explored.has(hut.id)).length;
    exploredCount.textContent = `${visitedOpenHomes} / 2`;
    exploredList.innerHTML = huts.map(hut => `<span class="explored-chip ${explored.has(hut.id) ? 'seen' : ''}">${explored.has(hut.id) ? '✓' : '○'} ${escapeHtml(hut.name)}</span>`).join('');
    state.progress.twoRooms = visitedOpenHomes >= 2;
    updateChecklist();ui?.refresh();
  }

  const keys=new Set();
  const state={mode:'forest',room:null,busy:false,introActive:true,panelFocus:false,doorFocus:null,yaw:0,dragging:false,dragX:0,dragMoved:false,walked:0,
    forestPosition:new THREE.Vector3(...layout.world.spawn),progress:{...store.state.story,twoRooms:huts.filter(hut=>hut.id!=='hill'&&explored.has(hut.id)).length>=2}};
  player.position.set(...layout.world.spawn);
  cameraDirector.pose(player.position,state.yaw,state.mode,1,true);
  const clock=new THREE.Clock();
  let toastTimer=0;
  let frameCount=0, fpsStart=performance.now(), slowSamples=0;
  let pixelRatio=Math.min(window.devicePixelRatio||1,2);
  function say(text) {
    toast.textContent=text; toast.classList.add('visible');
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('visible'),3000);
  }
  function complete(key){if(state.progress[key])return;state.progress[key]=true;store.setStory(key);updateChecklist();}
  function updateChecklist() {
    const labels={wander:'在森林里转转',mapOpened:'打开地图',homeFound:'在地图上找到自己的茧房',homeEntered:'回到自己的茧房',infoOpened:'打开人物面板',videoOpened:'打开茧房视频',ownLocked:'给自己的茧房上锁',ownUnlocked:'再把自己的茧房开锁',twoRooms:'探索邻居茧房（3 选 2）'};
    const next=Object.entries(labels).find(([key])=>!state.progress[key]);
    setText($('#current-objective'),next?next[1]:'茧林探索完成，继续自由漫步');
    checklist.innerHTML=Object.entries(labels).map(([key,label])=>
      `<li class="${state.progress[key]?'done':''}"><span>${state.progress[key]?'✓':'○'}</span>${label}</li>`).join('');
  }
  function currentAction() {
    if(state.busy||state.introActive||state.panelFocus||videoViewer?.isOpen()||!fallback.hidden||ui?.blocksScene())return null;
    if(state.mode==='forest') {
      if(player.position.distanceTo(ownDoorTarget)<layout.reach.home)return {kind:'own',label:layout.local.owners.home+'的家 · 进入'};
      let nearest=null;
      for(const hut of huts) {
        if(!hut.open)continue;
        const d=player.position.distanceTo(hut.doorTarget);
        if(d<layout.reach.hut&&(!nearest||d<nearest.distance))nearest={kind:'hut',hut,distance:d,label:hut.name+' · 敲门'};
      }
      return nearest;
    }
    const actions=[];
    const panelDistance=player.position.distanceTo(panelApproach),exitDistance=player.position.distanceTo(exitTarget);
    if(panelDistance<layout.reach.panel)actions.push({kind:'panel',label:'打开人物面板',distance:panelDistance});
    if(exitDistance<layout.reach.exit)actions.push({kind:'exit',label:state.mode==='home'?'走出自己的茧房':'离开 '+state.room.name,distance:exitDistance});
    if(videoViewer)for(const pendant of art.pendants||[]){
      if(pendant.kind!=='video')continue;
      const distance=player.position.distanceTo(pendant.approachTarget);
      if(distance<window.PojianMediaConfig.videoReach)actions.push({kind:'video',pendant,label:'播放 '+pendant.label,distance});
    }
    return actions.sort((a,b)=>a.distance-b.distance)[0]||null;
  }
  function updatePrompt() {
    if(state.panelFocus){setText(prompt,'正在打开数据页…');setHidden(actionButton,true);return}
    if(state.introActive){setHidden(actionButton,true);return}
    const action=currentAction();
    if(action){setText(prompt,action.label);setHidden(actionButton,false);setText(actionButton,'E · '+action.label)}
    else {setText(prompt,state.mode==='forest'&&player.position.distanceTo(hill.doorTarget)<layout.reach.hut?'铃子的家已上锁，可以去拜访其他邻居':state.mode==='forest'?'沿小径寻找茧房，靠近后按 E 敲门':videoViewer?'靠近播放器、人物面板或出口，按 E 互动':'靠近左侧面板或正前方出口，按 E 互动');setHidden(actionButton,true)}
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
    mediaInteraction?.clear();
    weather.apply(state.mode);
    doorButton.hidden=state.mode!=='home';doorButton.textContent=store.state.doorOpen?'给茧房上锁':'给茧房开锁';
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
  function openDataPage({roomId,source}) {
    if(state.busy || videoViewer?.isOpen() || (source==='history'&&!explored.has(roomId)))return;
    $('#link-fallback h2').textContent='数据页未能自动打开';
    fallbackLink.textContent='重试打开数据页 ↗';
    const config=window.PojianCocoons.rooms.find(item=>item.id===roomId);
    const url=safeDataUrl(roomId==='home'?'demo-data-stage4.html?room=home':config?.dataUrl);
    keys.clear();state.dragging=false;
    state.panelFocus = true;
    player.visible = false;
    updatePrompt();
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
      if(source==='panel'&&roomId==='home')complete('infoOpened');
      restoreRoomView();
      say('数据页已直接打开；切回游戏可继续探索。');
    } catch {
      restoreRoomView();
      showLinkFallback('浏览器拦截了新标签，或数据页未能打开。可点击下方链接重试。', url);
      say('数据页未能自动打开，可以使用重试链接。');
    }
  }
  function openVideoPage(pendant){
    if(state.busy||state.mode==='forest'||ui.blocksScene()||!fallback.hidden||!videoViewer)return;
    if(!videoViewer.open(pendant.id))say('这段视频暂时不可用。');
  }
  function interact() {
    const action=currentAction();if(!action)return;
    if(action.kind==='own') {
      complete('homeEntered');
      transition(()=>{state.forestPosition.copy(player.position);state.mode='home';state.room=null;player.position.set(...layout.indoor.spawn)});
      say('回到了'+layout.local.owners.home+'的家。');
    } else if(action.kind==='exit') {
      if(state.mode==='home') {
        transition(()=>{state.mode='forest';player.position.copy(state.forestPosition)});
        say('回到茧林，可以去拜访邻居了。');
      } else {
        const hut=state.room;
        transition(()=>{state.mode='forest';player.position.set(...hut.returnPosition);hut.door.userData.opening=false;hut.door.userData.progress=0;hut.door.children.forEach(p=>p.rotation.y=0)});
        say('已返回茧林，可以继续探索。');
      }
    } else if(action.kind==='hut') {
      const hut=action.hut;
      if(!hut.open) {
        say(hut.name+'已上锁。可以先去拜访其他两间茧房。');return;
      }
      state.busy=true;state.doorFocus=hut;
      say('咚、咚。示例主人已同意进入。');
      hut.door.userData.opening=true;
      setTimeout(()=>{
        transition(()=>{state.mode='room';state.room=hut;state.forestPosition.copy(player.position);player.position.set(...layout.indoor.spawn);store.visit(hut.id);explored.add(hut.id);updateExplored()});
        say('已进入 '+hut.name+'。看看邻居的茧房。');
      },1250);
    } else if(action.kind==='panel') {
      openDataPage({roomId:state.mode==='room'?state.room.id:'home',source:'panel'});
    } else if(action.kind==='video') {
      openVideoPage(action.pendant);
    }
  }
  function closePanelFocus(){if(!state.panelFocus&&fallback.hidden)return;fallback.hidden=true;restoreRoomView();}
  actionButton.addEventListener('click',interact);
  doorButton.addEventListener('click',()=>{store.setDoor(!store.state.doorOpen);doorChanged();ui.refresh();});
  function doorChanged(){
    if(!store.state.doorOpen)complete('ownLocked');
    else if(state.progress.ownLocked)complete('ownUnlocked');
    doorButton.textContent=store.state.doorOpen?'给茧房上锁':'给茧房开锁';
    updatePrompt();say(store.state.doorOpen?'自己的茧房已开锁。':'自己的茧房已上锁；你仍可回家。');
  }
  $('#close-fallback').addEventListener('click', closePanelFocus);
  fallbackLink.addEventListener('click', () => { fallback.hidden = true; say('已尝试重新打开页面；切回游戏可继续探索。'); });
  soundButton.addEventListener('click', async () => {
    try {
      const enabled = await audio.toggle();
      $('#sound-state').textContent=enabled?'开启':'关闭';
      soundButton.setAttribute('aria-checked',String(enabled));
      if (enabled) say('声音已开启。');
      else say(audio.supported ? '声音已关闭。' : '此浏览器暂不支持声音。');
    } catch { say('浏览器未能启动声音。你仍可继续探索。'); }
  });
  const mapPaths=art.forestDetail.paths.slice(0,4).map(path=>{
    const positions=path.geometry.getAttribute('position'),points=[];
    for(let i=0;i<positions.count;i+=4)points.push([(positions.getX(i)+positions.getX(i+3))*.5*layout.worldScale,(positions.getZ(i)+positions.getZ(i+3))*.5*layout.worldScale]);
    return points;
  });
  ui=window.PojianStage5UI.mount({document,config:window.PojianUIConfig,store,
    houses:[{id:'home',name:layout.local.owners.home+'的家',x:art.own.x,z:art.own.z},...huts.map(h=>({id:h.id,name:h.name,x:h.x,z:h.z,themeTitle:h.themeTitle,sound:h.sound,color:h.color}))],
    bounds:layout.world.bounds,paths:mapPaths,
    view:()=>({mode:state.mode,roomId:state.room?.id,position:{x:player.position.x,z:player.position.z},heading:player.rotation.y}),
    onInputReset:()=>{keys.clear();state.dragging=false;},onOpenData:openDataPage,
    onMapOpen:()=>complete('mapOpened'),onHouseSelect:id=>{if(id==='home'){complete('homeFound');say('地图上标出了你的茧房。沿小路前往吧。');}},
    onDoorChange:doorChanged
  });
  if(art.pendants&&window.PojianMediaInteraction){
    videoViewer=window.PojianVideoViewer.create({document,config:window.PojianMediaConfig,
      resolveSource:item=>safeDataUrl('../public/assets/videos/'+encodeURIComponent(item.file)),
      onOpen:()=>{keys.clear();state.dragging=false;mediaInteraction?.clear();audio.pauseForMedia?.(true);if(state.mode==='home')complete('videoOpened');},
      onClose:()=>{keys.clear();state.dragging=false;audio.pauseForMedia?.(false);frameCount=0;fpsStart=performance.now();updatePrompt();}
    });
    mediaInteraction=window.PojianMediaInteraction.create({THREE,renderer,camera,pendants:art.pendants,
      blocked:()=>state.mode==='forest'||state.busy||state.panelFocus||videoViewer.isOpen()||!fallback.hidden||ui.blocksScene(),dragging:()=>state.dragging,
      onActivate:()=>openDataPage({roomId:state.mode==='room'?state.room.id:'home',source:'panel'})
    });
  }
  $('#clear-exploration').addEventListener('click',()=>{
    if(state.busy){say('请等转场完成后再清空记录。');return;}
    store.resetProgress();explored.clear();
    Object.keys(state.progress).forEach(key=>state.progress[key]=false);
    hill.open=false;updateDoorSign(hill);state.walked=0;
    updateExplored();say('探索记录已清空，界面与拜访偏好保留。');
  });
  $('#reset-button').addEventListener('click',()=>{
    if(state.busy){say('请等转场完成后再重置位置。');return;}
    ui.closeAll();
    state.busy=false;state.mode='forest';state.room=null;state.yaw=0;state.panelFocus=false;state.doorFocus=null;state.walked=0;
    player.position.set(...layout.world.spawn);player.rotation.y=0;
    cameraDirector.pose(player.position,state.yaw,state.mode,1,true);
    huts.forEach(h=>{h.door.userData.progress=0;h.door.userData.opening=false;h.door.children.forEach(p=>p.rotation.y=0)});
    fallback.hidden=true;player.visible=true;
    fade.classList.remove('on');updateHud();updateExplored();updatePrompt();say('演示已重置，已探索房间仍保存在本机。');
  });
  window.addEventListener('keydown',event=>{
    const key=event.key.toLowerCase();
    if(event.target?.matches?.('input,textarea,select,[contenteditable="true"]'))return;
    if(key==='escape'){
      event.preventDefault();keys.clear();state.dragging=false;
      if(videoViewer?.isOpen())videoViewer.close();else if(!fallback.hidden)closePanelFocus();else ui.escapeTop();return;
    }
    if(state.introActive||videoViewer?.isOpen()||ui.blocksScene()||!fallback.hidden||state.busy){keys.clear();return;}
    if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','e'].includes(key))event.preventDefault();
    keys.add(key);
    if(key==='e'&&!event.repeat)interact();
  });
  window.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
  window.addEventListener('blur',()=>keys.clear());
  renderer.domElement.addEventListener('pointerdown',event=>{if(state.introActive||videoViewer?.isOpen()||ui?.blocksScene()||!fallback.hidden||state.busy)return;state.dragging=true;state.dragX=event.clientX;state.dragMoved=false;renderer.domElement.setPointerCapture(event.pointerId)});
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
  $('#sound-state').textContent = audio.supported ? '关闭' : '不可用';
  soundButton.disabled = !audio.supported;
  updateHud();updateExplored();updatePrompt();
  let introTimer, introStep=0;
  function finishIntro(){if(!state.introActive)return;state.introActive=false;clearTimeout(introTimer);intro.hidden=true;updatePrompt();say('你来到了针毡森林。先四处走走，再打开地图。');}
  function advanceIntro(){if(!state.introActive)return;const pct=Math.min(100,Math.round(++introStep*3));introProgress.value=pct;introPercent.textContent=pct+'%';if(pct>=100)finishIntro();else introTimer=setTimeout(advanceIntro,120);}
  $('#intro-skip').addEventListener('click',finishIntro);
  introTimer=setTimeout(advanceIntro,120);

  function move(dt) {
    if(state.busy||state.introActive||state.panelFocus||videoViewer?.isOpen()||!fallback.hidden||ui?.blocksScene())return;
    const forward=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0);
    const sideways=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);
    if(!forward&&!sideways){avatar.position.y=THREE.MathUtils.damp(avatar.position.y,0,8,dt);return}
    const obstacles=state.mode==='forest'?forestColliders:(furnitureColliders[state.room?.themeId||'home']||[]);
    const result=movement.step(player.position,camera,forward,sideways,dt,state.mode,obstacles),direction=result.direction;
    const before=player.position.clone();player.position.copy(result.position);
    if(state.mode==='forest'&&!state.progress.wander){state.walked+=before.distanceTo(player.position);if(state.walked>=2.5)complete('wander');}
    const targetYaw=Math.atan2(-direction.x,-direction.z);
    player.rotation.y+=Math.atan2(Math.sin(targetYaw-player.rotation.y),Math.cos(targetYaw-player.rotation.y))*Math.min(1,dt*9);
    avatar.position.y=.045*Math.sin(clock.elapsedTime*14);
  }
  function animate() {
    const dt=Math.min(clock.getDelta(),.05);
    if(videoViewer?.isOpen()){requestAnimationFrame(animate);return;}
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
    ui.updateMap(false,performance.now());
    try { renderer.render(scene,camera); }
    catch {
      loading.hidden=true;$('#failure').hidden=false;
      $('#failure').textContent='3D 渲染中断。请重新打开此页；已探索记录仍保存在本机。';
      return;
    }
    setHidden(loading,true);
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
