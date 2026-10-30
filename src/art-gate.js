/* Art approval study. These procedural objects are NOT Stage 2 production GLB assets. */
(() => {
  'use strict';
  const canvas = document.getElementById('art-canvas');
  const errorBox = document.getElementById('viewer-error');
  const THREE = window.THREE;
  if (!THREE) { errorBox.hidden = false; errorBox.textContent = '本地 Three.js 未加载。请确认工程目录结构完整。'; return; }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (error) { errorBox.hidden = false; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(37, 1, .1, 100);
  scene.add(new THREE.HemisphereLight('#fff7e8', '#5b7063', 2.1));
  const key = new THREE.DirectionalLight('#ffe5c4', 3.1); key.position.set(-4, 7, 6); scene.add(key);
  const fill = new THREE.DirectionalLight('#b6d2c7', 1.25); fill.position.set(5, 3, -4); scene.add(fill);

  let seed = 74193;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  function feltTexture(color) {
    const size = 256, c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d'); x.fillStyle = color; x.fillRect(0, 0, size, size);
    for (let i = 0; i < 19000; i++) {
      const px = rnd() * size, py = rnd() * size, length = 1 + rnd() * 9;
      x.strokeStyle = rnd() > .56 ? `rgba(255,248,223,${.025 + rnd() * .12})` : `rgba(54,43,34,${.02 + rnd() * .07})`;
      x.lineWidth = .3 + rnd() * .7; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (rnd() - .5) * 3, py + length); x.stroke();
    }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; return tex;
  }
  const felt = color => { const texture=feltTexture(color); return new THREE.MeshStandardMaterial({ map:texture, bumpMap:texture, bumpScale:.018, roughness:1, metalness:0 }); };
  const mats = {
    cream: felt('#ead9be'), belly: felt('#f4e7d2'), peach: felt('#d89a83'),
    quill: [felt('#9d7656'),felt('#ad8460'),felt('#b58b68'),felt('#7d5e49')],
    scarf: felt('#ae4035'), bag: felt('#ad4435'), bagLight: felt('#c35a45'),
    brown: felt('#705541'), bark: felt('#785d48'), barkDark: felt('#5c493c'),
    moss: felt('#78896c'), mossLight: felt('#9aaa79'), mossDeep: felt('#4d6955'),
    wool: felt('#e7d5b9'), woolLight: felt('#f2e3ce'), mushroom: felt('#f0e9da'),
    dirt: felt('#bca88b'), deep: new THREE.MeshStandardMaterial({ color:'#2a332d', roughness:1 }),
    eye: new THREE.MeshPhysicalMaterial({ color:'#151914', roughness:.13, clearcoat:1 }),
    blue: new THREE.MeshPhysicalMaterial({ color:'#5ca4c6', roughness:.17, metalness:.1, clearcoat:1 }),
    goggles: new THREE.MeshStandardMaterial({ color:'#e7ddd0', roughness:.76 }),
    amber: new THREE.MeshBasicMaterial({ color:'#ffc883' }),
  };
  const sphere = new THREE.SphereGeometry(1, 28, 20);
  const ball = (p, m, pos, scale) => { const o = new THREE.Mesh(sphere, m); o.position.set(...pos); o.scale.set(...scale); p.add(o); return o; };
  const cylinder = (p, m, top, bottom, h, pos, segments=20) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(top,bottom,h,segments), m); o.position.set(...pos); p.add(o); return o; };
  const line = (p, pts, radius, m, segments=48) => { const curve = new THREE.CatmullRomCurve3(pts.map(v=>new THREE.Vector3(...v))); const o = new THREE.Mesh(new THREE.TubeGeometry(curve,segments,radius,6,false),m); p.add(o); return o; };
  const ring = (p, cx, cy, cz, rx, ry, r, m) => {
    const pts=[]; for(let i=0;i<=72;i++){const a=i/72*Math.PI*2;pts.push([cx+rx*Math.cos(a),cy+ry*Math.sin(a),cz]);} return line(p,pts,r,m,72);
  };
  const ground = (p, color=mats.moss) => {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(3.6,3.75,.12,64),color); o.position.y=-.08; p.add(o);
    const sh = new THREE.Mesh(new THREE.CircleGeometry(3.65,64),new THREE.MeshBasicMaterial({color:'#314a37',transparent:true,opacity:.11})); sh.rotation.x=-Math.PI/2;sh.position.y=.002;p.add(sh);
  };
  const groups = { hedgehog:new THREE.Group(), cocoon:new THREE.Group(), interior:new THREE.Group(), mushroom:new THREE.Group() };
  Object.values(groups).forEach(g=>scene.add(g));

  // The user preferred the original character study; both review and game load this shared shape.
  function buildHedgehog(p) {
    ground(p,mats.dirt);
    p.add(window.PojianHedgehog.create(THREE));
  }

  function mossMound(p,x,z,scale=1,light=false){
    ball(p,light?mats.mossLight:mats.moss,[x,.14*scale,z],[.55*scale,.24*scale,.45*scale]);
    for(let i=0;i<4;i++){const a=i*1.65+scale;ball(p,i%2?mats.moss:mats.mossDeep,[x+Math.cos(a)*.28*scale,.2*scale,z+Math.sin(a)*.22*scale],[.2*scale,.14*scale,.18*scale]);}
  }
  function mushroom(p,x,z,size=1){
    const stem=line(p,[[x,.08,z],[x+.03*size,.33*size,z],[x+.1*size,.68*size,z-.03*size]],.075*size,mats.mushroom,24);
    const cap = ball(p,mats.mushroom,[x+.1*size,.72*size,z-.03*size],[.38*size,.16*size,.36*size]);
    ball(p,mats.wool,[x+.1*size,.68*size,z-.03*size],[.31*size,.055*size,.3*size]);
    cap.rotation.z=-.08;
    return stem;
  }
  function barkTrunk(p,x,z,r,h){
    cylinder(p,mats.bark,r*.9,r,h,[x,h/2,z],14);
    for(let i=0;i<7;i++){const a=i/7*Math.PI*2;line(p,[[x+Math.cos(a)*r*.89,.1,z+Math.sin(a)*r*.89],[x+Math.cos(a+.08)*r*.86,h*.5,z+Math.sin(a+.08)*r*.86],[x+Math.cos(a+.05)*r*.8,h*.95,z+Math.sin(a+.05)*r*.8]],.015,mats.barkDark,18);}
  }
  function buildCocoon(p){
    ground(p,mats.moss);
    // A root and stump support the woven egg-shaped room.
    barkTrunk(p,0,-.49,1.07,.7);
    for(let i=0;i<7;i++){const a=i/7*Math.PI*2;line(p,[[Math.cos(a)*.78,.3,Math.sin(a)*.65-.49],[Math.cos(a)*1.15,.15,Math.sin(a)*.95-.49],[Math.cos(a)*1.65,.07,Math.sin(a)*1.2-.49]],.09,mats.bark,24);}
    ball(p,mats.wool,[0,1.8,-.35],[1.1,1.48,.89]);
    // Fibrous wraps cross the sides and top, leaving the front doorway legible.
    for(let j=0;j<34;j++){
      const t=j/34*Math.PI*2, pts=[];
      for(let i=0;i<=36;i++){
        const a=i/36*Math.PI*2;
        const y=1.8+Math.cos(a)*1.43;
        const rr=Math.max(.1,Math.sin(a));
        const twist=t+Math.sin(a*2+j*.6)*.09;
        const x=Math.cos(twist)*1.105*rr;
        const z=-.35+Math.sin(twist)*.9*rr;
        if(z>.46 && Math.abs(x)<.52 && y>.78 && y<2.26) continue;
        pts.push([x,y,z]);
      }
      for(let k=0;k<pts.length-1;k+=4){const part=pts.slice(k,k+5);if(part.length>1)line(p,part,.011+(j%4)*.0018,j%3?mats.woolLight:mats.wool,8);}
    }
    // Deep opening, bright wool rim and small warm lights.
    ball(p,mats.deep,[0,1.43,.55],[.48,.76,.08]);
    ball(p,new THREE.MeshBasicMaterial({color:'#cd7645'}),[0,1.43,.60],[.35,.60,.018]);
    ball(p,new THREE.MeshBasicMaterial({color:'#ffbd73',transparent:true,opacity:.45}),[0,1.46,.62],[.25,.47,.017]);
    ring(p,0,1.43,.665,.55,.82,.115,mats.woolLight);
    const glow=new THREE.PointLight('#ffb56b',3,4);glow.position.set(0,1.45,.95);p.add(glow);
    mossMound(p,-1.12,.74,.72,true);mossMound(p,1.15,.45,.62);mossMound(p,.73,-1.04,.6,true);
    mushroom(p,-1.65,.86,.85);mushroom(p,-1.38,.58,.55);mushroom(p,1.52,.55,.61);
    return p;
  }

  function dashboardTexture(){
    const c=document.createElement('canvas');c.width=1024;c.height=640;const x=c.getContext('2d');
    function box(px,py,w,h,r,fill,stroke){
      x.beginPath();x.moveTo(px+r,py);x.lineTo(px+w-r,py);x.quadraticCurveTo(px+w,py,px+w,py+r);x.lineTo(px+w,py+h-r);x.quadraticCurveTo(px+w,py+h,px+w-r,py+h);x.lineTo(px+r,py+h);x.quadraticCurveTo(px,py+h,px,py+h-r);x.lineTo(px,py+r);x.quadraticCurveTo(px,py,px+r,py);x.closePath();
      x.fillStyle=fill;x.fill();if(stroke){x.strokeStyle=stroke;x.lineWidth=3;x.stroke();}
    }
    x.clearRect(0,0,1024,640);
    box(12,12,1000,616,30,'rgba(241,227,210,.88)','rgba(255,245,225,.95)');
    box(30,30,964,580,24,'rgba(250,243,231,.44)','rgba(163,131,105,.38)');
    x.fillStyle='#554d48';x.font='bold 37px sans-serif';x.fillText('信息视角',61,89);
    x.font='21px sans-serif';x.fillStyle='#8c8073';x.fillText('画像标签  ·  推荐路径  ·  信息流',63,124);
    box(60,156,259,385,18,'rgba(255,248,235,.74)','rgba(175,142,118,.4)');
    box(345,156,316,385,18,'rgba(245,246,242,.65)','rgba(137,165,176,.48)');
    box(688,156,270,385,18,'rgba(255,246,239,.73)','rgba(192,146,118,.42)');
    x.font='bold 24px sans-serif';x.fillStyle='#63554b';x.fillText('用户画像',85,196);x.fillText('推荐算法节点',369,196);x.fillText('信息流卡片',712,196);
    const pills=[['标签待提供','#dca371'],['兴趣维度','#93b6c5'],['偏好维度','#e0a0a0'],['探索记录','#b0bd97']];
    pills.forEach(([name,color],i)=>{box(86,222+i*70,203,52,19,'rgba(255,255,255,.55)',color);x.fillStyle=color;x.beginPath();x.arc(111,248+i*70,8,0,Math.PI*2);x.fill();x.fillStyle='#67574b';x.font='19px sans-serif';x.fillText(name,133,256+i*70);});
    const nodes=[[500,267,32,'#e29d75'],[421,343,20,'#8eafbe'],[578,343,23,'#d88f91'],[492,422,24,'#adb78e'],[602,450,14,'#ecc081']];
    x.lineWidth=4;x.strokeStyle='rgba(197,153,124,.72)';[[0,1],[0,2],[1,3],[2,3],[2,4],[3,4]].forEach(([a,b])=>{x.beginPath();x.moveTo(nodes[a][0],nodes[a][1]);x.lineTo(nodes[b][0],nodes[b][1]);x.stroke();});
    nodes.forEach(([nx,ny,r,col])=>{x.fillStyle=col;x.beginPath();x.arc(nx,ny,r,0,Math.PI*2);x.fill();x.strokeStyle='rgba(255,255,255,.8)';x.lineWidth=3;x.stroke();});
    for(let i=0;i<3;i++){
      box(713,222+i*95,220,75,12,'rgba(255,255,255,.63)',i===1?'#93b6c5':'#dfaa87');
      x.fillStyle=['#d79a7a','#91b4be','#cda0a1'][i];x.fillRect(727,236+i*95,62,45);
      x.fillStyle='#998b7f';x.fillRect(800,242+i*95,114,7);x.fillRect(800,258+i*95,91,5);x.fillRect(800,272+i*95,105,5);
    }
    x.fillStyle='#8b7769';x.font='18px sans-serif';x.fillText('点击后进入完整数据页面',62,583);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
  }
  function miniTree(p,x,z,s){
    const trunk=cylinder(p,mats.bark,.08*s,.12*s,.72*s,[x,.36*s,z],9);
    for(let i=0;i<4;i++){const a=i*2.2;ball(p,i%2?mats.moss:mats.mossLight,[x+Math.cos(a)*.25*s,.8*s+Math.sin(i)*.1*s,z+Math.sin(a)*.18*s],[.35*s,.28*s,.32*s]);}
    return trunk;
  }
  function buildInterior(p){
    // The camera lives inside this dome. The older exterior cutaway is only a material reference.
    const domeTex=feltTexture('#ead5bd');
    const dome=new THREE.Mesh(new THREE.SphereGeometry(4.8,72,44,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({map:domeTex,bumpMap:domeTex,bumpScale:.07,roughness:1,side:THREE.BackSide,transparent:true,opacity:.94}));
    dome.scale.y=.79;p.add(dome);
    const floor=new THREE.Mesh(new THREE.CircleGeometry(4.8,72),mats.mossDeep);floor.rotation.x=-Math.PI/2;floor.position.y=-.025;p.add(floor);
    for(let j=0;j<26;j++){
      const az=j/26*Math.PI*2,pts=[];
      for(let k=0;k<=18;k++){
        const t=.1+k/18*(Math.PI/2-.1),r=4.73+Math.sin(t*5+j)*.08;
        pts.push([Math.cos(az+Math.sin(t*3+j)*.04)*r*Math.sin(t),3.72*Math.cos(t),Math.sin(az+Math.sin(t*3+j)*.04)*r*Math.sin(t)]);
      }
      line(p,pts,j%4===0?.16:.07,j%3===0?mats.woolLight:mats.wool,54);
    }
    for(let j=0;j<28;j++){
      const a=rnd()*Math.PI*2,r=1.7+rnd()*2.5,y=3.2+rnd()*.45;
      line(p,[[Math.cos(a)*r,y,Math.sin(a)*r],[Math.cos(a)*r+.06,y-.25-rnd()*.42,Math.sin(a)*r+.03]],.007,mats.woolLight,12);
    }
    // One walkable, winding route through glowing felt moss.
    const vertices=[],indices=[];
    for(let i=0;i<=24;i++){const z=3.3-i/24*6.7,x=Math.sin(i*.26)*.19;vertices.push(x-.72,.012,z,x+.72,.012,z);if(i<24){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}}
    const pathGeo=new THREE.BufferGeometry();pathGeo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));pathGeo.setIndex(indices);pathGeo.computeVertexNormals();
    p.add(new THREE.Mesh(pathGeo,new THREE.MeshStandardMaterial({map:feltTexture('#acaa8f'),roughness:1,side:THREE.DoubleSide})));
    const ribbonColors=['#8dbed1','#e9ab79','#d9949b'];
    for(let lane=0;lane<3;lane++){
      const pts=[];for(let i=0;i<=32;i++){const z=3.1-i/32*6.4;pts.push([(lane-1)*.78+Math.sin(i*.3+lane)*.18,.055+lane*.012,z]);}
      const halo=new THREE.MeshBasicMaterial({color:ribbonColors[lane],transparent:true,opacity:.22,depthWrite:false});
      line(p,pts,.055,halo,72);line(p,pts,.012,new THREE.MeshBasicMaterial({color:ribbonColors[lane]}),72);
    }
    for(let i=0;i<24;i++){
      const side=i%2?-1:1,z=(rnd()-.5)*7.2,x=side*(1.15+rnd()*2.4),scale=.3+rnd()*.7;
      mossMound(p,x,z,scale,i%3===0);
      if(i%4===0)miniTree(p,x,z,.42+rnd()*.32);
      if(i%5===0)mushroom(p,x+.15,z+.2,.31+rnd()*.28);
    }
    const glowMat=new THREE.MeshBasicMaterial({color:'#ffbd7d'});
    for(let i=0;i<34;i++){const side=i%2?-1:1,z=(rnd()-.5)*7,x=side*(.95+rnd()*2.7);ball(p,glowMat,[x,.11+rnd()*.28,z],[.018,.018,.018]);}
    const panel=new THREE.Mesh(new THREE.PlaneGeometry(3.15,1.97),new THREE.MeshBasicMaterial({map:dashboardTexture(),transparent:true,opacity:.97,side:THREE.DoubleSide,depthWrite:false}));
    panel.position.set(0,1.83,-2.65);p.add(panel);
    const border=new THREE.MeshBasicMaterial({color:'#ffdfbd'});
    line(p,[[-1.59,.85,-2.66],[-1.59,2.82,-2.66],[1.59,2.82,-2.66],[1.59,.85,-2.66],[-1.59,.85,-2.66]],.024,border,56);
    const warm=new THREE.PointLight('#eda675',3.3,9);warm.position.set(-2.5,2.8,0);p.add(warm);
    const blue=new THREE.PointLight('#7294bd',1.4,7);blue.position.set(2.6,2.4,-1.5);p.add(blue);
    const red=new THREE.PointLight('#c66e6d',.9,6);red.position.set(2.6,2.2,1.4);p.add(red);
    return p;
  }
  function buildMushrooms(p){
    ground(p,mats.moss);
    for(const [x,z,s] of [[0,0,1.75],[-1.0,.56,.94],[1.1,.5,1.12],[-1.45,-.35,.63],[1.65,-.6,.76]])mushroom(p,x,z,s);
    mossMound(p,-1.13,-.62,.8,true);mossMound(p,1.3,-.88,.65);
    for(let i=0;i<8;i++){const x=(rnd()-.5)*3.3,z=(rnd()-.5)*2.2;line(p,[[x,.03,z],[x+.04,.19,z+.01],[x+.08,.28,z+.02]],.012,mats.mossDeep,10);}
  }
  buildHedgehog(groups.hedgehog);buildCocoon(groups.cocoon);buildInterior(groups.interior);buildMushrooms(groups.mushroom);

  const info={
    hedgehog:{title:'刺猬 · 用户选定的上一版',caption:'已恢复你选择的上一版 3D 造型；三视图仍是后续正式模型的细节参考。',img:'hedgehog.png',alt:'刺猬正面、侧面、背面三视图参考',index:'REFERENCE / 01',refTitle:'角色三视图参考',refDesc:'左侧使用你选定的上一版可旋转造型。三视图仍作为正式模型的轮廓、毛毡材质和配饰细节参考。',height:1.13,dist:6.2},
    cocoon:{title:'茧房外部 · 木与编织茧',caption:'树洞／树桩／倒木承托乳白编织茧；入口有暖光并可用茧丝展开。该组合是待确认提案。',img:'forest-cocoon-path.png',alt:'林间路径和发光编织茧房参考',index:'REFERENCE / 02',refTitle:'森林里的发光茧',refDesc:'新参考显示弯曲土径、雾中的针毡树和发光椭圆茧。建议以木质树洞承托编织茧，既保留树洞设定，也获得清晰的茧房轮廓。',height:1.5,dist:7.7},
    interior:{title:'茧房内部 · 玩家进入后的视角',caption:'相机位于茧内，拖动可环顾穹顶。中央面板包含画像标签、推荐节点与信息流卡片；地面苔藓和光带留出可走通道。',img:'cocoon-interior-inside-v2.png',alt:'从茧房内部向前看的针毡穹顶与数据面板目标图',index:'TARGET / INSIDE VIEW',refTitle:'真正的茧内视角',refDesc:'这张目标图依据你的描述重制：半透明毛毡褶皱穹顶、中央柔光数据面板、发光苔藓微缩森林和蜿蜒的信息光带。暖米色底搭配蓝、橙、红渐变，表现“被算法包裹的温柔牢笼”。',height:1.6,dist:8.7},
    mushroom:{title:'蘑菇 · 毛毡道具',caption:'柔软不对称的奶油色菌帽与细柄；单支和簇生组合帮助辨路，不遮挡角色和门。',img:'felt-mushrooms.png',alt:'针毡蘑菇参考组图',index:'REFERENCE / 04',refTitle:'蘑菇作为微缩路标',refDesc:'参考图里的蘑菇有软毛边和柔和冷暖光。正式模型至少做单支、簇生、高矮变化，在森林中复用。',height:.9,dist:6.8},
  };
  let kind='hedgehog', yaw=0, pitch=.18, zoom=1, dragging=false, lastX=0,lastY=0;
  function setView(next){
    kind=next;Object.entries(groups).forEach(([name,g])=>{g.visible=name===kind;});
    document.querySelectorAll('[data-kind]').forEach(b=>b.classList.toggle('active',b.dataset.kind===kind));
    const i=info[kind];document.getElementById('object-title').textContent=i.title;
    document.getElementById('object-caption').textContent=i.caption;
    const image=document.getElementById('main-reference');image.src=`../public/assets/references/${i.img}`;image.alt=i.alt;
    document.getElementById('reference-index').textContent=i.index;
    document.getElementById('reference-title').textContent=i.refTitle;
    document.getElementById('reference-desc').textContent=i.refDesc;
    document.getElementById('reference-link').href=image.src;
    yaw=0;pitch=kind==='interior'?.12:.18;zoom=1;
    document.querySelector('.angle-buttons').hidden=kind==='interior';
    document.getElementById('canvas-help').textContent=kind==='interior'?'拖动环顾茧内空间':'拖动旋转 · 滚轮缩放';
    syncAngleButtons();
    resize();
  }
  function syncAngleButtons(){
    const preset=Math.abs(yaw)<.15?'front':Math.abs(Math.abs(yaw)-Math.PI/2)<.15?'side':Math.abs(Math.abs(yaw)-Math.PI)<.15?'back':'';
    document.querySelectorAll('[data-angle]').forEach(b=>b.classList.toggle('active',b.dataset.angle===preset));
  }
  document.querySelectorAll('[data-kind]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.kind)));
  document.querySelectorAll('[data-angle]').forEach(b=>b.addEventListener('click',()=>{yaw={front:0,side:Math.PI/2,back:Math.PI}[b.dataset.angle];pitch=.18;syncAngleButtons();}));
  canvas.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!dragging)return;yaw+=(e.clientX-lastX)*.008;pitch=Math.max(-.32,Math.min(.75,pitch+(e.clientY-lastY)*.005));lastX=e.clientX;lastY=e.clientY;syncAngleButtons();});
  canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('pointercancel',()=>dragging=false);
  canvas.addEventListener('wheel',e=>{e.preventDefault();if(kind!=='interior')zoom=Math.max(.72,Math.min(1.5,zoom+Math.sign(e.deltaY)*.065));},{passive:false});
  function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=kind==='interior'?(camera.aspect<1?58:50):37;camera.updateProjectionMatrix();}
  if('ResizeObserver' in window)new ResizeObserver(resize).observe(canvas);else window.addEventListener('resize',resize);
  function frame(){
    const i=info[kind];
    if(kind==='interior'){
      camera.position.set(0,1.22,2.45);
      camera.lookAt(Math.sin(yaw)*Math.cos(pitch),1.22+Math.sin(pitch),2.45-Math.cos(yaw)*Math.cos(pitch));
    }else{
      const d=i.dist*zoom*Math.max(1,1/camera.aspect);camera.position.set(Math.sin(yaw)*Math.cos(pitch)*d,i.height+Math.sin(pitch)*d,Math.cos(yaw)*Math.cos(pitch)*d);camera.lookAt(0,i.height,0);
    }
    renderer.render(scene,camera);requestAnimationFrame(frame);
  }
  setView(kind);resize();frame();
})();
