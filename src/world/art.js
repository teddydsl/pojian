/* Current art composition: detailed exterior and the accepted interior. */
(() => {
  'use strict';
  function build(THREE, scene) {
    const layout = window.PojianLayout;
    let seed = 48127;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const sphere = new THREE.SphereGeometry(1, 24, 16);
    const point = p => new THREE.Vector3(...p);
    function felt(color, bump = .035) {
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const x = c.getContext('2d'); x.fillStyle = color; x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 13500; i++) {
        const px = rnd() * 256, py = rnd() * 256;
        x.strokeStyle = rnd() > .52 ? `rgba(255,249,226,${.025 + rnd() * .14})` : `rgba(39,30,22,${.02 + rnd() * .09})`;
        x.lineWidth = .4 + rnd() * .7; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (rnd() - .5) * 3, py + 1 + rnd() * 7); x.stroke();
      }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
      return new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: bump, roughness: 1, metalness: 0 });
    }
    const m = {
      earth: felt('#b6a88a'), path: felt('#d2bda0'), moss: felt('#7d936f'), mossLight: felt('#9aab79'), mossDark: felt('#546b53'),
      bark: felt('#795942'), barkDark: felt('#533f33'), cutWood: felt('#b59874'), wool: felt('#e7d5b8'), woolLight: felt('#f1e4d0'),
      mushroom: felt('#eae6d7'), stone: felt('#a9aa94'), leaf: felt('#73896c'), duskleaf: felt('#6f807a'),
      dark: new THREE.MeshStandardMaterial({ color: '#24332e', roughness: 1 }),
      amber: new THREE.MeshBasicMaterial({ color: '#f7b978' }),
      thread: new THREE.MeshBasicMaterial({ color: '#f3dfc5', transparent: true, opacity: .88 }),
    };
    const importedFern = window.PojianFernScene?.create(THREE);
    function mesh(parent, geo, mat, pos, scale) { const o = new THREE.Mesh(geo, mat); o.position.set(...pos); if (scale) o.scale.set(...scale); parent.add(o); return o; }
    function ball(parent, mat, pos, scale) { return mesh(parent, sphere, mat, pos, scale); }
    function tube(parent, coords, radius, mat, segments = 28) {
      const curve = new THREE.CatmullRomCurve3(coords.map(point));
      return mesh(parent, new THREE.TubeGeometry(curve, segments, radius, 5, false), mat, [0, 0, 0]);
    }
    function ring(parent, center, radii, radius, mat) {
      const coords = []; for (let i = 0; i <= 48; i++) { const a = i / 48 * Math.PI * 2; coords.push([center[0] + Math.cos(a) * radii[0], center[1] + Math.sin(a) * radii[1], center[2]]); }
      return tube(parent, coords, radius, mat, 48);
    }
    function labelTexture(title, subtitle) {
      const c = document.createElement('canvas'); c.width = 512; c.height = 224; const x = c.getContext('2d');
      x.fillStyle = '#e6d8bb'; x.fillRect(0, 0, 512, 224); x.fillStyle = '#5b6b51'; x.fillRect(12, 12, 488, 200);
      x.fillStyle = '#f6eedb'; x.fillRect(22, 22, 468, 180);
      x.fillStyle = '#3f5342'; x.font = 'bold 47px sans-serif'; x.textAlign = 'center'; x.fillText(title, 256, 102);
      x.fillStyle = '#78816c'; x.font = '28px sans-serif'; x.fillText(subtitle, 256, 164);
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
    }
    function informationTexture(title = '信息视角') {
      // Anonymized structure only: no ages, personalities, browsing records or real tags.
      const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
      const x = c.getContext('2d');
      x.fillStyle = '#ecddc9'; x.fillRect(0, 0, 1024, 512);
      x.fillStyle = '#fff5e7'; x.fillRect(16, 16, 992, 480);
      x.fillStyle = '#486456'; x.font = 'bold 42px sans-serif'; x.fillText(title, 54, 83);
      x.fillStyle = '#a58168'; x.font = '22px sans-serif'; x.fillText('脱敏结构示意 · 未接入真实用户资料', 54, 122);
      const xs = [55, 366, 699], widths = [282, 306, 269];
      const headings = ['用户画像', '浏览信息', '内容标签'];
      for (let i = 0; i < 3; i++) {
        x.fillStyle = ['#e7eee6', '#e8ecee', '#f1e8df'][i]; x.fillRect(xs[i], 157, widths[i], 302);
        x.fillStyle = '#486456'; x.font = 'bold 26px sans-serif'; x.fillText(headings[i], xs[i] + 17, 201);
      }
      // Profile: anonymous icon plus intentionally unreadable placeholders.
      for (let i = 0; i < 3; i++) {
        const y = 229 + i * 70;
        x.fillStyle = '#fff9ec'; x.fillRect(75, y, 242, 56);
        x.beginPath(); x.arc(105, y + 28, 13, 0, Math.PI * 2); x.fillStyle = '#c4d4c5'; x.fill();
        x.fillStyle = '#cbd7c9'; x.fillRect(132, y + 16, 148, 8); x.fillRect(132, y + 32, 92, 6);
      }
      // Browsing information: abstract cards, with no titles or event history.
      for (let i = 0; i < 3; i++) {
        const y = 229 + i * 70;
        x.fillStyle = '#fffaf1'; x.fillRect(384, y, 268, 56);
        x.fillStyle = ['#c5d5c8', '#d7bca9', '#b9c9d2'][i]; x.fillRect(397, y + 10, 45, 36);
        x.fillStyle = '#cbd6ce'; x.fillRect(457, y + 15, 169, 7); x.fillRect(457, y + 31, 113, 6);
      }
      // Content tags: neutral, masked placeholders rather than inferred interests.
      for (let i = 0; i < 5; i++) {
        const y = 227 + i * 42;
        x.fillStyle = i % 2 ? '#e6ded3' : '#d9e4dc'; x.fillRect(719, y, 227, 31);
        x.fillStyle = '#b5c5ba'; x.fillRect(734, y + 12, 116 + i % 3 * 25, 7);
      }
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
    }
    function sign(parent, title, sub, pos, width = 2.4) {
      return mesh(parent, new THREE.PlaneGeometry(width, width * 224 / 512), new THREE.MeshBasicMaterial({ map: labelTexture(title, sub), side: THREE.DoubleSide }), pos);
    }
    function mound(parent, x, z, s = 1, light = false) {
      ball(parent, light ? m.mossLight : m.moss, [x, .17 * s, z], [.55 * s, .23 * s, .47 * s]);
      for (let j = 0; j < 3; j++) { const a = j * 2.1 + s; ball(parent, j % 2 ? m.mossDark : m.mossLight, [x + Math.cos(a) * .25 * s, .19 * s, z + Math.sin(a) * .22 * s], [.23 * s, .14 * s, .22 * s]); }
    }
    function mushroom(parent, x, z, s = 1) {
      tube(parent, [[x, .02, z], [x + .015 * s, .28 * s, z], [x + .055 * s, .56 * s, z - .025 * s]], .075 * s, m.mushroom, 18);
      ball(parent, m.mushroom, [x + .055 * s, .58 * s, z - .025 * s], [.33 * s, .14 * s, .33 * s]);
      ball(parent, m.woolLight, [x + .055 * s, .53 * s, z - .025 * s], [.28 * s, .06 * s, .27 * s]);
    }
    function curvedPath(parent, coords, width, options={}) {
      const curve = new THREE.CatmullRomCurve3(coords.map(([x,z])=>new THREE.Vector3(x,.035,z)));
      const vertices=[],uvs=[],colors=[],indices=[],steps=72,lanes=[-.5,-.4,.4,.5],edge=[0,1,1,0];
      const length=curve.getLength();
      for(let i=0;i<=steps;i++) {
        const t=i/steps,p=curve.getPoint(t),tangent=curve.getTangent(t),n=new THREE.Vector3(tangent.z,0,-tangent.x).normalize();
        const fade=options.fade?1-THREE.MathUtils.smoothstep(t,.25,1):1;
        const w=width*(.94+.06*Math.sin(t*17))*(options.fade?1-.35*t:1);
        for(let lane=0;lane<4;lane++) {
          vertices.push(p.x+n.x*w*lanes[lane],.035+(options.layer||0)*.001,p.z+n.z*w*lanes[lane]);
          uvs.push(lane/3,t*length/2);colors.push(1,1,1,edge[lane]*fade);
        }
        if(i<steps)for(let lane=0;lane<3;lane++){const a=i*4+lane;indices.push(a,a+4,a+1,a+1,a+4,a+5)}
      }
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,4));geo.setIndex(indices);geo.computeVertexNormals();
      const material=m.path.clone();material.vertexColors=true;material.transparent=true;material.depthWrite=false;
      const path=mesh(parent,geo,material,[0,0,0]);path.name=options.fade?'distant-fading-path':'cocoon-guiding-path';return path;
    }
    const config = window.PojianCocoons;
    const {forest,forestDetail,huts,own,ownDoorTarget,forestObstacles,forestColliders,updateDoorSign} = window.PojianForest.build(THREE,scene,layout,{mesh,m,tube,sign,labelTexture,curvedPath,rnd,importedFern});
    const interior = new THREE.Group(); scene.add(interior);
    const domeTex = felt('#e8d5bd', .07);
    const dome = mesh(interior, new THREE.SphereGeometry(layout.local.room.radius, 64, 36, 0, Math.PI * 2, 0, Math.PI / 2), domeTex, [0, 0, 0], [1, .86, 1]);
    dome.material.side = THREE.BackSide;
    const roomFloor = mesh(interior, new THREE.CircleGeometry(layout.local.room.floorRadius, 64), m.mossDark, [0, -.005, 0]); roomFloor.rotation.x = -Math.PI / 2;
    for (let j = 0; j < 22; j++) {
      const a = j / 22 * Math.PI * 2, pts = [];
      for (let k = 0; k <= 15; k++) { const t = .12 + k / 15 * (Math.PI / 2 - .12); pts.push([Math.cos(a + Math.sin(t * 3 + j) * .035) * 4.7 * Math.sin(t), 4.04 * Math.cos(t), Math.sin(a + Math.sin(t * 3 + j) * .035) * 4.7 * Math.sin(t)]); }
      tube(interior, pts, j % 4 ? .06 : .13, j % 3 ? m.wool : m.woolLight, 36);
    }
    for (let i = 0; i < 31; i++) { const side = i % 2 ? -1 : 1, x = side * (1.1 + rnd() * 2.6), z = (rnd() - .5) * 6.5, s = .33 + rnd() * .55; mound(interior, x, z, s, i % 4 === 0); if (i % 5 === 0) mushroom(interior, x, z, .32 + rnd() * .27); }
    for (let lane = 0; lane < 3; lane++) {
      const pts = []; for (let i = 0; i <= 25; i++) { const z = 3.2 - i / 25 * 6.5; pts.push([(lane - 1) * .64 + Math.sin(i * .31 + lane) * .15, .045, z]); }
      tube(interior, pts, .025, new THREE.MeshBasicMaterial({ color: ['#92b8cb', '#f5b879', '#d69b9d'][lane], transparent: true, opacity: .8 }), 64);
    }
    const roomAccent = ball(interior, new THREE.MeshBasicMaterial({ color: '#b99973' }), [3.2, .5, -2.9], [.42, .27, .34]);
    const roomLight = new THREE.PointLight('#e4aa76', 2.2, 8); roomLight.position.set(-2.5, 2.6, -.9); interior.add(roomLight);
    const blue = new THREE.PointLight('#87a8c5', 1.3, 7); blue.position.set(2.9, 2.2, -2); interior.add(blue);
    const red = new THREE.PointLight('#c77e7d', .7, 5); red.position.set(2.5, 1.6, 1.7); interior.add(red);
    // Mount the complete silk-wrapped panel on the left wall. The back-wall exit
    // stays visible and reachable along the central path.
    const panelMount = new THREE.Group();
    panelMount.position.set(...layout.local.room.panelMount);
    panelMount.rotation.y = layout.local.room.panelYaw;
    interior.add(panelMount);
    mesh(panelMount, new THREE.PlaneGeometry(3.18, 1.84), m.woolLight, [0, 1.85, -.08]);
    const panel = mesh(panelMount, new THREE.PlaneGeometry(2.75, 1.38), new THREE.MeshBasicMaterial({ map: informationTexture(), side: THREE.DoubleSide, transparent: true, opacity: .98 }), [0, 1.85, 0]);
    function roundedFrame(width, height, radius, z, fiberRadius, material) {
      const points = [];
      for (const [cx, cy, start] of [
        [width / 2 - radius, height / 2 - radius, 0],
        [-width / 2 + radius, height / 2 - radius, Math.PI / 2],
        [-width / 2 + radius, -height / 2 + radius, Math.PI],
        [width / 2 - radius, -height / 2 + radius, Math.PI * 1.5],
      ]) {
        for (let i = 0; i <= 7; i++) {
          const a = start + i / 7 * Math.PI / 2;
          points.push([cx + Math.cos(a) * radius, 1.85 + cy + Math.sin(a) * radius, z]);
        }
      }
      points.push(points[0]);
      tube(panelMount, points, fiberRadius, material, 96);
    }
    roundedFrame(3.22, 1.88, .22, .04, .085, m.wool);
    roundedFrame(3.06, 1.72, .18, .06, .025, m.thread);
    roundedFrame(3.34, 2.00, .26, -.07, .016, m.thread);
    const themeGroups = {
      nature: new THREE.Group(), journey: new THREE.Group(), music: new THREE.Group(),
    };
    Object.values(themeGroups).forEach(group => { interior.add(group); group.visible = false; });
    for (const [name, color] of [['nature', '#b3d79b'], ['journey', '#efba85'], ['music', '#a4a8e1']]) {
      const light = new THREE.PointLight(color, 2.0, 6.5);
      light.position.set(2.7, 1.65, -1.4);
      themeGroups[name].add(light);
    }
    const leafGreen = felt('#86a87c'), leafPale = felt('#bed3a3');
    const paper = felt('#e4d7b9'), copper = felt('#bc866a');
    const lilac = felt('#8c92bf'), gold = felt('#d8ae78');
    // Nature: miniature leaf specimens and moss-covered observation stations.
    for (const side of [-1, 1]) {
      const fixture = layout.local.room.furniture.nature[side < 0 ? 0 : 1];
      const g = new THREE.Group();g.position.set(fixture[0],0,fixture[1]);themeGroups.nature.add(g);
      const x = 0;
      tube(g, [[x, .05, 1.5], [x + side * .1, .68, 1.33], [x + side * .2, 1.38, 1.2]], .065, m.bark, 20);
      for (let j = 0; j < 5; j++) {
        const a = j * .83;
        const leaf = ball(g, j % 2 ? leafPale : leafGreen, [x + side * (.25 + j * .055), .52 + j * .22, 1.35 + Math.sin(a) * .35], [.14, .29, .075]);
        leaf.rotation.z = side * (.5 + j * .08);
      }
      mesh(g, new THREE.CylinderGeometry(.55, .63, .16, 16), m.cutWood, [x, .22, 0]);
      ball(g, m.mossLight, [x, .36, 0], [.39, .13, .31]);
      mushroom(g, x + side * .35, .1, .55);
    }
    sign(themeGroups.nature, '叶脉标本', '示例主题', [-2.42, 1.62, -2.8], 1.35);
    // Journey: felt map fragments, a compass, and a small travelling case.
    const journey = themeGroups.journey;
    const map = mesh(journey, new THREE.PlaneGeometry(1.38, 1.1), new THREE.MeshBasicMaterial({ map: labelTexture('远行地图', '示例主题'), side: THREE.DoubleSide }), [2.48, 1.65, -2.55]);
    map.rotation.y = -.35;
    const caseAnchor=layout.local.room.furniture.journey[0],caseGroup=new THREE.Group();caseGroup.position.set(caseAnchor[0],0,caseAnchor[1]);journey.add(caseGroup);
    mesh(caseGroup, new THREE.BoxGeometry(1.15, .72, .5), felt('#9e735c'), [0, .42, 0]);
    tube(caseGroup, [[-.3, .8, 0], [-.3, 1.03, 0], [.28, 1.03, 0], [.28, .8, 0]], .055, copper, 18);
    const compassAnchor=layout.local.room.furniture.journey[1],compassGroup=new THREE.Group();compassGroup.position.set(compassAnchor[0],0,compassAnchor[1]);journey.add(compassGroup);
    const compass = mesh(compassGroup, new THREE.CylinderGeometry(.47, .47, .08, 32), gold, [0, .12, 0]);
    compass.rotation.y = .6;
    for (let j = 0; j < 4; j++) {
      const a = j * Math.PI / 2;
      tube(compassGroup, [[0, .18, 0], [Math.sin(a) * .31, .19, Math.cos(a) * .31]], .018, m.barkDark, 8);
    }
    sign(journey, '旅途路标', '示例主题', [-2.5, 1.85, -2.7], 1.35);
    // Music: hanging felt discs and a simple row of softly coloured keys.
    const music = themeGroups.music;
    for (let j = 0; j < 5; j++) {
      const x = (j - 2) * .6;
      tube(music, [[x, 3.7, -2.9], [x, 2.6 + j % 2 * .27, -2.9]], .014, m.thread, 10);
      const disc = mesh(music, new THREE.CylinderGeometry(.27 + j % 2 * .06, .27 + j % 2 * .06, .11, 24), j % 2 ? gold : lilac, [x, 2.43 + j % 2 * .27, -2.9]);
      disc.rotation.x = Math.PI / 2;
    }
    const keysAnchor=layout.local.room.furniture.music[1],keysGroup=new THREE.Group();keysGroup.position.set(keysAnchor[0],0,keysAnchor[1]);music.add(keysGroup);
    for (let j = 0; j < 7; j++) {
      mesh(keysGroup, new THREE.BoxGeometry(.3, .16 + j % 3 * .12, .54), j % 2 ? lilac : gold, [-.36 + (j % 3) * .36, .2, -.35 + Math.floor(j / 3) * .58]);
    }
    const seatAnchor=layout.local.room.furniture.music[0],seatGroup=new THREE.Group();seatGroup.position.set(seatAnchor[0],0,seatAnchor[1]);music.add(seatGroup);
    ball(seatGroup, lilac, [0, .44, 0], [.7, .16, .63]);
    ring(seatGroup, [0, .58, 0], [.45, .45], .045, gold);
    sign(music, '声音收藏', '示例主题', [-2.42, 1.68, -2.75], 1.35);
    const panelMaps = { home: informationTexture('我的信息视角') };
    for (const room of config?.rooms || []) panelMaps[room.themeId] = informationTexture(room.themeTitle);
    function setTheme(themeId) {
      Object.entries(themeGroups).forEach(([name, group]) => { group.visible = name === themeId; });
      panel.material.map = panelMaps[themeId] || panelMaps.home;
      panel.material.needsUpdate = true;
    }
    // The exit remains on the back wall, unobstructed by the side-mounted panel.
    ball(interior, m.dark, layout.local.room.exitVisual, [.68, 1.08, .06]);
    const exitVisual=layout.local.room.exitVisual;
    ring(interior, [exitVisual[0],exitVisual[1],exitVisual[2]+.09], [.76, 1.14], .13, m.woolLight);
    sign(interior, '树洞出口', '靠近后按 E', [exitVisual[0],2.82,exitVisual[2]+.18], 1.8);
    for (let i = 0; i < 28; i++) { const a = rnd() * Math.PI * 2, r = 1.3 + rnd() * 2.9; ball(interior, m.amber, [Math.cos(a) * r, .14 + rnd() * .3, Math.sin(a) * r], [.018, .018, .018]); }
    const player = new THREE.Group(); scene.add(player);
    const avatar = new THREE.Group(); player.add(avatar);
    const hedgehog = window.PojianHedgehog.create(THREE); hedgehog.rotation.y = Math.PI; avatar.add(hedgehog);
    const marker = mesh(player, new THREE.CircleGeometry(.66, 28), new THREE.MeshBasicMaterial({ color: '#274836', transparent: true, opacity: .14, depthWrite: false }), [0, .023, 0]); marker.rotation.x = -Math.PI / 2;
    forest.scale.setScalar(layout.worldScale);
    interior.scale.setScalar(layout.roomScale);
    avatar.scale.setScalar(layout.avatarScale);
    marker.scale.setScalar(layout.avatarScale);
    const panelApproach = new THREE.Vector3(...layout.indoor.panelApproach);
    const exitTarget = new THREE.Vector3(...layout.indoor.exit);
    forest.updateMatrixWorld(true); interior.updateMatrixWorld(true);
    return { layout, exitTarget, forestColliders, furnitureColliders:layout.indoor.furniture, forest, forestDetail, interior, huts, own, ownDoorTarget, roomAccent, roomLight, player, avatar, panel, panelMount, panelApproach, setTheme, themeGroups, updateDoorSign, forestObstacles };
  }
  window.PojianCurrentArt = { build };
})();
