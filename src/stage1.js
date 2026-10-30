/* Stage 1: playable greybox. Formal three-view hedgehog modeling begins in Stage 2. */
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

  if (!THREE) {
    $('#failure').hidden = false;
    $('#failure').textContent = '3D 引擎未加载。请确认 public/vendor/three.global.js 与此 HTML 位于同一工程。';
    return;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#cad8c7');
  scene.fog = new THREE.Fog('#cad8c7', 18, 45);
  const camera = new THREE.PerspectiveCamera(53, 1, 0.1, 80);
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
  viewport.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', '破茧阶段 1 三维灰盒场景');

  scene.add(new THREE.HemisphereLight('#f4f2dc', '#596a55', 2.1));
  const sun = new THREE.DirectionalLight('#fff1d1', 2.1);
  sun.position.set(-8, 15, 8);
  scene.add(sun);

  const mat = (color, roughness = 1) => new THREE.MeshStandardMaterial({ color, roughness, flatShading: true });
  const wood = mat('#80694e');
  const darkWood = mat('#5d4c3d');
  const paleWood = mat('#c5ae82');
  const moss = mat('#8a9e76');
  const leaf = mat('#738f73');
  const stone = mat('#9eaaa0');
  const pathMat = mat('#d4c5a2');
  const doorMat = mat('#283c30');
  const lineMat = new THREE.MeshBasicMaterial({ color: '#efe3c7', transparent: true, opacity: 0.8 });
  const geometry = {
    sphere: new THREE.SphereGeometry(1, 14, 10),
    box: new THREE.BoxGeometry(1, 1, 1),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
    cone: new THREE.ConeGeometry(1, 1, 8),
  };
  function add(parent, shape, material, position, scale = [1, 1, 1]) {
    const mesh = new THREE.Mesh(shape, material);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    parent.add(mesh);
    return mesh;
  }
  function labelTexture(title, subtitle) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 224;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#efe4c5'; ctx.fillRect(0, 0, 512, 224);
    ctx.fillStyle = '#684f35'; ctx.fillRect(14, 14, 484, 196);
    ctx.fillStyle = '#f5ecd4'; ctx.fillRect(23, 23, 466, 178);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#263c2b'; ctx.font = 'bold 44px sans-serif';
    ctx.fillText(title, 256, 100);
    ctx.fillStyle = '#6f755f'; ctx.font = '28px sans-serif';
    ctx.fillText(subtitle, 256, 158);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
  function sign(parent, title, subtitle, x, y, z, width = 2.5) {
    const material = new THREE.MeshBasicMaterial({ map: labelTexture(title, subtitle), side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width * 224 / 512), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  const forest = new THREE.Group(); scene.add(forest);
  const forestFloor = add(forest, new THREE.PlaneGeometry(40, 42), mat('#a9b99b'), [0, -0.04, -1]);
  forestFloor.rotation.x = -Math.PI / 2;
  function path(a, b, width = 2.7) {
    const midpoint = [(a[0] + b[0]) / 2, 0.01, (a[1] + b[1]) / 2];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const strip = add(forest, new THREE.PlaneGeometry(width, length), pathMat, midpoint);
    strip.rotation.x = -Math.PI / 2;
    strip.rotation.z = -Math.atan2(b[0] - a[0], b[1] - a[1]);
  }
  const clearing = add(forest, new THREE.CircleGeometry(5.2, 32), pathMat, [0, 0.015, 0]);
  clearing.rotation.x = -Math.PI / 2;
  path([0, 7], [0, 0], 3.2);
  path([0, 0], [-8, -7], 2.4);
  path([0, 0], [0, -12], 2.4);
  path([0, 0], [8, -7], 2.4);

  function tree(x, z, height, tint = leaf) {
    add(forest, geometry.cylinder, wood, [x, height / 2, z], [0.28, height, 0.28]);
    add(forest, geometry.sphere, tint, [x, height + 0.45, z], [1.25, 0.85, 1.2]);
    add(forest, geometry.sphere, tint, [x + 0.7, height + 0.12, z + 0.1], [0.72, 0.55, 0.76]);
  }
  [
    [-14,-13,4],[-11,-12,3.4],[-13,-4,4.2],[-12,4,3.4],[-7,9,3.8],[-4,12,3.1],
    [5,11,4.2],[12,10,3.7],[14,4,3.4],[12,-3,4],[13,-12,4],[5,-15,3.6],[-5,-16,4]
  ].forEach(([x,z,h],i) => tree(x,z,h,i%3===0?moss:leaf));
  function mushroom(x, z, scale = 1) {
    add(forest, geometry.cylinder, paleWood, [x, 0.25 * scale, z], [0.10 * scale, 0.48 * scale, 0.10 * scale]);
    add(forest, geometry.cone, mat('#e7dbc0'), [x, 0.58 * scale, z], [0.35 * scale, 0.27 * scale, 0.35 * scale]);
  }
  [[-5,2,1],[5,4,.8],[-3,-5,.7],[3,-9,1],[-10,-1,.9],[11,-10,.7],[-2,9,.85]].forEach(([x,z,s])=>{
    mushroom(x,z,s);mushroom(x+.4*s,z+.2*s,s*.68);
  });
  for (const [x,z,s] of [[-11,2,.5],[-7,-13,.7],[7,-13,.55],[11,5,.45],[-4,4,.4],[4,-4,.35]]) {
    add(forest,geometry.sphere,stone,[x,0.1,z],[s,.18,s*.7]);
  }

  const huts = [
    { id:'north', name:'北侧树洞', shape:'tree', x:-8, z:-7, doorZ:-5.55, color:'#796c52', open:true, personTags:[], contentTags:[], dataUrl:null },
    { id:'stream', name:'溪畔倒木', shape:'log', x:0, z:-12, doorZ:-10.55, color:'#887451', open:true, personTags:[], contentTags:[], dataUrl:null },
    { id:'hill', name:'苔坡树桩', shape:'stump', x:8, z:-7, doorZ:-5.55, color:'#6f7554', open:false, personTags:[], contentTags:[], dataUrl:null },
  ];
  function hutVisual(hut) {
    const group = new THREE.Group(); group.position.set(hut.x,0,hut.z); forest.add(group);
    const bark = mat(hut.color);
    if (hut.shape === 'tree') {
      add(group,geometry.cylinder,bark,[0,2,0],[1.7,4,1.7]);
      add(group,geometry.sphere,moss,[0,4.2,0],[2.3,.9,1.9]);
    } else if (hut.shape === 'log') {
      const log = add(group,geometry.cylinder,bark,[0,1.35,-.4],[1.35,4.2,1.35]);
      log.rotation.z = Math.PI / 2;
      add(group,geometry.sphere,moss,[.9,1.7,-.7],[1.15,.45,1.1]);
    } else {
      add(group,geometry.cylinder,bark,[0,1.05,0],[2,2.1,2]);
      add(group,geometry.cylinder,paleWood,[0,2.15,0],[2.02,.13,2.02]);
      add(group,geometry.sphere,moss,[1.1,1.25,-.5],[1.1,.45,1]);
    }
    const door = add(group,geometry.box,doorMat,[0,1.18,1.52],[1.15,2.2,.08]);
    add(group,geometry.box,paleWood,[-.69,1.18,1.57],[.16,2.45,.2]);
    add(group,geometry.box,paleWood,[.69,1.18,1.57],[.16,2.45,.2]);
    add(group,geometry.box,paleWood,[0,2.43,1.57],[1.54,.16,.2]);
    sign(group,hut.name,[...hut.personTags,...hut.contentTags].slice(0,2).join(' · ')||'标签待提供',0,2.95,1.8,2.5);
    hut.door = door;
    hut.group = group;
    hut.doorTarget = new THREE.Vector3(hut.x,0,hut.doorZ);
  }
  huts.forEach(hutVisual);
  // The player's own tree hole sits behind the forest arrival point.
  const own = new THREE.Group(); own.position.set(0,0,9.3); own.rotation.y=Math.PI; forest.add(own);
  add(own,geometry.cylinder,wood,[0,1.5,0],[1.9,3,1.9]);
  add(own,geometry.sphere,moss,[0,3.3,0],[2.3,.9,2]);
  add(own,geometry.box,doorMat,[0,1.12,1.55],[1.2,2.1,.08]);
  sign(own,'我的树洞','起点',0,2.8,1.8,2.2);
  const ownDoorTarget = new THREE.Vector3(0,0,7.75);

  const interior = new THREE.Group(); scene.add(interior); interior.visible = true;
  const roomFloor = add(interior,new THREE.CircleGeometry(5,48),mat('#d4d1c1'),[0,0.01,0]);
  roomFloor.rotation.x=-Math.PI/2;
  const wallMat=mat('#8e9b85');
  add(interior,geometry.box,wallMat,[-3.2,1.6,-4.8],[3.6,3.2,.25]);
  add(interior,geometry.box,wallMat,[3.2,1.6,-4.8],[3.6,3.2,.25]);
  add(interior,geometry.box,wallMat,[-4.8,1.6,0],[.25,3.2,9.6]);
  add(interior,geometry.box,wallMat,[4.8,1.6,0],[.25,3.2,9.6]);
  const roomExit = add(interior,geometry.box,doorMat,[0,1.15,-4.7],[1.4,2.3,.1]);
  add(interior,geometry.box,paleWood,[-.82,1.16,-4.59],[.14,2.4,.2]);
  add(interior,geometry.box,paleWood,[.82,1.16,-4.59],[.14,2.4,.2]);
  add(interior,geometry.box,paleWood,[0,2.37,-4.59],[1.77,.14,.2]);
  sign(interior,'树洞出口','靠近后按 E',0,2.95,-4.55,2.2);
  add(interior,geometry.box,wood,[-3.35,1.45,-2.5],[.22,2.9,.28]);
  const panel = add(interior,geometry.box,mat('#e4d9b8'),[-3.35,1.55,-2.22],[1.9,1.4,.08]);
  sign(interior,'资料面板','阶段 3 接入',-3.35,1.55,-2.16,1.65);
  const roomAccent=add(interior,geometry.sphere,mat('#98ae82'),[2.3,.72,-2.7],[1.25,.7,1.1]);
  add(interior,geometry.box,darkWood,[2.4,.38,-2.7],[1.8,.45,1.3]);

  const player = new THREE.Group(); scene.add(player);
  const avatar = new THREE.Group(); player.add(avatar);
  const bodyMat=mat('#a39378');
  const faceMat=mat('#d1bd9d');
  const quillMat=mat('#73685b');
  const eyeMat=new THREE.MeshStandardMaterial({color:'#1e2420',roughness:.3});
  add(avatar,geometry.sphere,bodyMat,[0,.85,.08],[.6,.65,.68]);
  add(avatar,geometry.sphere,faceMat,[0,1.07,-.48],[.43,.42,.43]);
  add(avatar,geometry.sphere,faceMat,[0,.93,-.77],[.22,.18,.22]);
  add(avatar,geometry.sphere,eyeMat,[0,.98,-.98],[.1,.09,.09]);
  for(const side of [-1,1]) {
    add(avatar,geometry.sphere,faceMat,[side*.38,1.3,-.27],[.15,.19,.09]);
    add(avatar,geometry.sphere,eyeMat,[side*.19,1.16,-.79],[.055,.065,.045]);
    add(avatar,geometry.sphere,bodyMat,[side*.47,.75,-.22],[.18,.3,.22]);
    add(avatar,geometry.sphere,bodyMat,[side*.3,.21,.28],[.19,.22,.25]);
  }
  const spineShape=new THREE.ConeGeometry(.105,.42,5);
  const up=new THREE.Vector3(0,1,0);
  for(let row=0;row<5;row++) {
    const theta=(row/4)*Math.PI*.78-.2;
    for(let col=0;col<10;col++) {
      const phi=(col/9)*Math.PI*1.38-Math.PI*.69;
      const x=Math.sin(phi)*(.5*Math.cos(theta));
      const y=.88+Math.sin(theta)*.58;
      const z=.16+Math.cos(phi)*.5*Math.cos(theta);
      if(z<-.12)continue;
      const normal=new THREE.Vector3(x*1.3,y-.9,z-.04).normalize();
      const spine=add(avatar,spineShape,quillMat,[x,y,z],[1,1,1]);
      spine.quaternion.setFromUnitVectors(up,normal);
    }
  }
  // A translucent ground marker makes the greybox avatar easy to track.
  const marker=new THREE.Mesh(new THREE.CircleGeometry(.65,20),new THREE.MeshBasicMaterial({color:'#30483a',transparent:true,opacity:.15,depthWrite:false}));
  marker.rotation.x=-Math.PI/2;marker.position.y=.025;player.add(marker);

  const keys=new Set();
  const state={mode:'home',room:null,busy:false,yaw:0,dragging:false,dragX:0,dragMoved:false,
    forestPosition:new THREE.Vector3(0,0,4.2),progress:{outside:false,knock:false,inside:false,return:false,closed:false}};
  player.position.set(0,0,1.65);
  camera.position.set(0,7,10);
  const clock=new THREE.Clock();
  let toastTimer=0;
  function say(text) {
    toast.textContent=text; toast.classList.add('visible');
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('visible'),3000);
  }
  function updateChecklist() {
    const labels={outside:'走出自己的树洞',knock:'敲开一间示例茧房',inside:'进入另一间树洞',return:'从树洞返回森林',closed:'发现关门状态不能进入'};
    checklist.innerHTML=Object.entries(labels).map(([key,label])=>
      `<li class="${state.progress[key]?'done':''}"><span>${state.progress[key]?'✓':'○'}</span>${label}</li>`).join('');
  }
  function currentAction() {
    if(state.busy)return null;
    if(state.mode==='forest') {
      if(player.position.distanceTo(ownDoorTarget)<2.5)return {kind:'own',label:'进入自己的树洞'};
      let nearest=null;
      for(const hut of huts) {
        const d=player.position.distanceTo(hut.doorTarget);
        if(d<3.1&&(!nearest||d<nearest.distance))nearest={kind:'hut',hut,distance:d,label:hut.open?'敲门 · '+hut.name:'查看关闭的树洞'};
      }
      return nearest;
    }
    if(player.position.distanceTo(new THREE.Vector3(0,0,-3.8))<2.2)
      return {kind:'exit',label:state.mode==='home'?'走出自己的树洞':'离开 '+state.room.name};
    if(state.mode==='room'&&player.position.distanceTo(new THREE.Vector3(-3.35,0,-2.2))<1.85)
      return {kind:'panel',label:'查看资料面板（占位）'};
    return null;
  }
  function updatePrompt() {
    const action=currentAction();
    if(action){prompt.textContent=action.label;actionButton.hidden=false;actionButton.textContent='E · '+action.label}
    else {prompt.textContent=state.mode==='forest'?'靠近树洞，查看门牌并敲门':'靠近前方出口，按 E 互动';actionButton.hidden=true}
  }
  function transition(change) {
    state.busy=true;fade.classList.add('on');
    setTimeout(()=>{
      change();
      forest.visible=state.mode==='forest';interior.visible=state.mode!=='forest';
      camera.position.copy(player.position).add(new THREE.Vector3(0,7.5,10));
      updateHud();updatePrompt();
      setTimeout(()=>{fade.classList.remove('on');state.busy=false;updatePrompt()},100);
    },320);
  }
  function updateHud() {
    hudPlace.textContent=state.mode==='forest'?'茧林 · 中央空地':state.mode==='home'?'我的树洞':state.room.name+' · 室内';
    hudHint.textContent=state.mode==='forest'?'寻找树洞，敲门探索':state.mode==='home'?'走向出口，开始探索':'观察房间，再从出口返回';
    interior.visible=state.mode!=='forest';forest.visible=state.mode==='forest';
    if(state.mode==='room')roomAccent.material.color.set(state.room.color);
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
        transition(()=>{state.mode='forest';player.position.set(hut.x,0,hut.doorZ+2.1);state.progress.return=true;hut.door.userData.opening=false;hut.door.scale.x=1});
        say('已返回茧林，可以继续探索。');
      }
    } else if(action.kind==='hut') {
      const hut=action.hut;
      if(!hut.open) {
        state.progress.closed=true;updateChecklist();say(hut.name+'暂时关门，不能进入。');return;
      }
      state.busy=true;state.progress.knock=true;updateChecklist();
      say('咚、咚。示例主人已同意进入。');
      hut.door.userData.opening=true;
      setTimeout(()=>{
        transition(()=>{state.mode='room';state.room=hut;state.forestPosition.copy(player.position);player.position.set(0,0,1.65);state.progress.inside=true});
        say('已进入 '+hut.name+'。这里暂用灰盒呈现。');
      },950);
    } else if(action.kind==='panel') {
      say('资料面板已占位。镜头切换与网页数据页在阶段 3 接入。');
    }
  }
  actionButton.addEventListener('click',interact);
  $('#reset-button').addEventListener('click',()=>{
    state.busy=false;state.mode='home';state.room=null;state.yaw=0;
    state.progress={outside:false,knock:false,inside:false,return:false,closed:false};
    player.position.set(0,0,1.65);player.rotation.y=0;
    huts.forEach(h=>{h.door.scale.x=1;h.door.userData.opening=false});
    fade.classList.remove('on');updateHud();updatePrompt();say('演示已重置，从自己的树洞重新开始。');
  });
  window.addEventListener('keydown',event=>{
    const key=event.key.toLowerCase();
    if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','e'].includes(key))event.preventDefault();
    keys.add(key);
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
    if(state.busy)return;
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
    for(const hut of huts)if(hut.door.userData.opening)hut.door.scale.x=THREE.MathUtils.damp(hut.door.scale.x,.05,7,dt);
    const distance=state.mode==='forest'?10.5:8;
    const height=state.mode==='forest'?8.1:6.4;
    const targetPosition=player.position.clone().add(new THREE.Vector3(Math.sin(state.yaw)*distance,height,Math.cos(state.yaw)*distance));
    camera.position.lerp(targetPosition,1-Math.exp(-5*dt));
    camera.lookAt(player.position.x,1.0,player.position.z);
    updatePrompt();
    renderer.render(scene,camera);
    requestAnimationFrame(animate);
  }
  animate();
})();
