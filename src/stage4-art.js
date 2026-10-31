/* Stage 4 keeps the accepted world while tightening panel layout and movement. */
(() => {
  'use strict';
  function build(THREE, scene) {
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
    function tree(parent, x, z, height, type = 0) {
      const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
      mesh(g, new THREE.CylinderGeometry(.19, .36, height, 9), m.bark, [0, height / 2, 0]);
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI * .53 + .3, side = Math.cos(a), depth = Math.sin(a);
        tube(g, [[0, height * .54, 0], [side * .33, height * .75, depth * .29], [side * .72, height * (1.05 + i % 2 * .08), depth * .55]], .065, m.barkDark, 18);
      }
      if (type !== 1) {
        const col = type === 2 ? m.duskleaf : m.leaf;
        for (const [px, py, pz, sx, sy, sz] of [[0, height + .2, 0, .85, .53, .73], [-.64, height - .03, .12, .6, .45, .56], [.55, height + .02, -.18, .67, .48, .62]])
          ball(g, col, [px, py, pz], [sx, sy, sz]);
      }
      if (!importedFern) mound(g, -.38, .26, .58, true);
    }
    function curvedPath(parent, coords, width) {
      const curve = new THREE.CatmullRomCurve3(coords.map(([x, z]) => new THREE.Vector3(x, .027, z)));
      const vertices = [], uvs = [], indices = [];
      for (let i = 0; i <= 38; i++) {
        const t = i / 38, p = curve.getPoint(t), tangent = curve.getTangent(t), n = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
        const w = width * (.92 + .08 * Math.sin(t * 17));
        vertices.push(p.x - n.x * w / 2, .027, p.z - n.z * w / 2, p.x + n.x * w / 2, .027, p.z + n.z * w / 2);
        uvs.push(0, t * 4, 1, t * 4);
        if (i < 38) { const a = i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geo.setIndex(indices); geo.computeVertexNormals();
      return mesh(parent, geo, m.path, [0, 0, 0]);
    }
    const forest = new THREE.Group(); scene.add(forest);
    // The floor continues beyond the fog range, so no flat back edge appears.
    const floorSize = window.PojianForestScene ? 140 : 42;
    const groundMaterial = importedFern ? felt('#73896a', .045) : m.earth;
    const floor = mesh(forest, new THREE.PlaneGeometry(floorSize, window.PojianForestScene ? 140 : 44), groundMaterial, [0, -.055, -1]); floor.rotation.x = -Math.PI / 2;
    if (window.PojianForestScene) groundMaterial.map.repeat.set(140 / 42, 140 / 44);
    mesh(forest, new THREE.CylinderGeometry(importedFern ? 4.35 : 5.2, importedFern ? 4.4 : 5.3, .08, 64), m.path, [0, -.005, 0]);
    curvedPath(forest, [[0, 8.8], [-.2, 5.3], [.1, 2.4], [0, 0]], 2.6);
    curvedPath(forest, [[0, 0], [-3.1, -1.4], [-5.6, -4.2], [-8, -5.65]], 2.25);
    curvedPath(forest, [[0, 0], [.45, -3.7], [-.25, -7.3], [0, -10.7]], 2.22);
    curvedPath(forest, [[0, 0], [3.1, -1.6], [5.6, -3.9], [8, -5.65]], 2.25);
    const trees = [[-14,-13,4.2,0],[-11,-12,3.4,1],[-13,-4,4.7,2],[-12,4,3.7,0],[-8,8,4.4,1],[-4,12,3.9,0],
      [5,11,4.7,2],[11,9,4.1,0],[14,4,3.9,1],[12,-3,4.5,0],[13,-12,4.2,2],[5,-15,3.8,1],[-6,-16,4.5,0],[-16,8,4.7,0],[16,-6,4.2,1]];
    trees.forEach(([x, z, h, t]) => tree(forest, x, z, h, t));
    const forestObstacles = trees.map(([x, z]) => ({ x, z, radius: .55 }));
    // The fern LOD fills the green floor; a few full-detail plants anchor the
    // route edges. The older round grass mounds remain only as a fallback.
    const fernDetail = { ground: null, accents: null, count: 0 };
    if (importedFern) {
      function instances(source, sites, name) {
        const batch = new THREE.InstancedMesh(source.geometry, source.material, sites.length);
        const dummy = new THREE.Object3D(); batch.name = name;
        sites.forEach(([x, z, scale, turn], i) => {
          dummy.position.set(x, .015, z);
          dummy.rotation.set(0, turn, 0);
          dummy.scale.setScalar(scale);
          dummy.updateMatrix(); batch.setMatrixAt(i, dummy.matrix);
        });
        batch.instanceMatrix.needsUpdate = true;
        forest.add(batch);
        return batch;
      }
      const groundSites = [];
      for (let attempt = 0; attempt < 720 && groundSites.length < 175; attempt++) {
        const x = (rnd() - .5) * 36, z = (rnd() - .5) * 37 - 1;
        if (Math.hypot(x, z) < 5.1) continue;
        if (Math.abs(x) < 1.7 && z > -12 && z < 11) continue;
        if (z < -1 && z > -9 && Math.abs(Math.abs(x) + z - 1.5) < 1.65) continue;
        if ([[-8, -7], [0, -12], [8, -7], [0, 9.3]].some(([hx, hz]) => Math.hypot(x - hx, z - hz) < 2.35)) continue;
        groundSites.push([x, z, .55 + rnd() * .9, rnd() * Math.PI * 2]);
      }
      const accentSites = [
        [-4.9, 2.8, 1.45], [4.7, 2.5, 1.4], [-6.2, -4.6, 1.35], [-9.8, -6.7, 1.25],
        [-2.1, -10.2, 1.45], [2.0, -10.0, 1.35], [6.2, -4.8, 1.3], [9.9, -7.1, 1.3],
        [-2.0, 7.8, 1.3], [2.1, 8.5, 1.4], [-12.1, -2.1, 1.35], [11.8, -11.1, 1.4],
      ].map(([x, z, scale]) => [x, z, scale, rnd() * Math.PI * 2]);
      fernDetail.ground = instances(importedFern.ground, groundSites, 'fern-ground-cover');
      fernDetail.accents = instances(importedFern.accent, accentSites, 'fern-path-accents');
      fernDetail.count = groundSites.length + accentSites.length;
    } else {
      for (let i = 0; i < 80; i++) {
        const x = (rnd() - .5) * 34, z = (rnd() - .5) * 37 - 1;
        const central = Math.hypot(x, z) < 5.3;
        const onNorth = Math.abs(x) < 1.8 && z > 0 && z < 10;
        const onSouth = Math.abs(x) < 1.6 && z < 0 && z > -12;
        const onBranches = z < -1 && z > -8 && Math.abs(Math.abs(x) + z - 1.5) < 1.5;
        if (central || onNorth || onSouth || onBranches) continue;
        mound(forest, x, z, .5 + rnd() * .85, i % 3 === 0);
        if (i % 3 === 0) { mushroom(forest, x + .38, z + .2, .42 + rnd() * .5); if (i % 2 === 0) mushroom(forest, x + .65, z + .35, .3 + rnd() * .3); }
      }
      for (const [x, z, s] of [[-4, 2, .8], [4, 3, .7], [-3, -5, .7], [3, -8, .9], [-10, -2, .8], [10, -10, .7], [-1, 9, .8], [1, 9, .55]]) {
        mushroom(forest, x, z, s); mushroom(forest, x + .35, z + .12, s * .6);
      }
    }
    for (let i = 0; i < 23; i++) {
      const x = (rnd() - .5) * 32, z = (rnd() - .5) * 36 - 1, s = .15 + rnd() * .22;
      ball(forest, m.stone, [x, .06, z], [s, .11, s * .75]);
    }

    // Tile the supplied forest around all sides of the playable clearing.
    // Clones share buffers and materials, so only one GLB is decoded.
    const forestDetail = { ring: [], mushrooms: [], fern: fernDetail, hangingEggs: [] };
    const importedForest = window.PojianForestScene?.create(THREE);
    if (importedForest) {
      for (let i = 0; i < 12; i++) {
        const angle = i / 12 * Math.PI * 2;
        const tile = i === 0 ? importedForest.root : importedForest.root.clone(true);
        tile.position.set(Math.sin(angle) * 24, -2.16, Math.cos(angle) * 24 - 1);
        tile.rotation.y = angle;
        tile.scale.setScalar(18);
        forest.add(tile);
        forestDetail.ring.push(tile);
      }
      const mushroomSites = importedFern ? [
        [-5.1, 3.4, 3.6], [5.1, 3.0, 3.4], [4.6, -10.0, 3.2],
        [-10.2, -5.4, 2.9], [-6.1, -7.8, 2.8], [-1.8, -12.8, 2.9],
        [1.9, -12.6, 2.8], [6.1, -7.9, 2.8], [10.1, -6.1, 3.0],
      ] : [[-5.1, 3.4, 3.6], [5.1, 3.0, 3.4], [4.6, -10.0, 3.2]];
      for (const [x, z, scale] of mushroomSites) {
        const cluster = importedForest.makeMushroomCluster();
        cluster.position.set(x, .025, z);
        cluster.scale.setScalar(scale);
        forest.add(cluster);
        forestDetail.mushrooms.push(cluster);
      }
    }

    const huts = [
      { id: 'north', name: '北侧树洞', shape: 'tree', x: -8, z: -7, doorZ: -5.55, color: '#8c8b74', open: true, personTags: [], contentTags: [], dataUrl: null },
      { id: 'stream', name: '溪畔倒木', shape: 'log', x: 0, z: -12, doorZ: -10.55, color: '#b08b6d', open: true, personTags: [], contentTags: [], dataUrl: null },
      { id: 'hill', name: '苔坡树桩', shape: 'stump', x: 8, z: -7, doorZ: -5.55, color: '#77929a', open: false, personTags: [], contentTags: [], dataUrl: null },
    ];
    const config = window.PojianCocoons;
    for (const hut of huts) {
      const defined = config?.rooms?.find(room => room.id === hut.id);
      if (!defined) continue;
      hut.name = defined.name;
      hut.color = defined.accent;
      hut.open = defined.entrance === 'open';
      hut.themeId = defined.themeId;
      hut.themeTitle = defined.themeTitle;
      hut.personTags = defined.personTags;
      hut.contentTags = defined.contentTags;
      hut.dataUrl = defined.dataUrl;
      hut.sound = defined.sound;
    }
    const importedEgg = window.PojianEggScene?.create(THREE);
    function createCocoon(parent, hut, isOwn = false) {
      const group = new THREE.Group(); group.position.set(hut.x, 0, hut.z); if (isOwn) group.rotation.y = Math.PI; parent.add(group);
      if (hut.shape === 'tree') {
        mesh(group, new THREE.CylinderGeometry(.85, 1.12, 4.3, 11), m.bark, [0, 2.15, -.88]);
        tube(group, [[-.4, 2.8, -.85], [-1.4, 3.65, -.6], [-1.75, 4.65, -.3]], .15, m.bark, 28);
        ball(group, m.leaf, [-1.4, 4.47, -.6], [1.15, .65, .88]);
      } else if (hut.shape === 'log') {
        const log = mesh(group, new THREE.CylinderGeometry(.86, .86, 3.7, 13), m.bark, [0, .95, -1.04]); log.rotation.z = Math.PI / 2;
        for (let i = 0; i < 3; i++) ring(group, [1.9, .95, -1.04], [.35 + i * .19, .35 + i * .19], .018, m.cutWood);
        if (!importedFern) mound(group, -1.1, -1.0, .8);
      } else {
        mesh(group, new THREE.CylinderGeometry(1.18, 1.4, 2.3, 13), m.bark, [0, 1.15, -.8]);
        mesh(group, new THREE.CylinderGeometry(1.2, 1.2, .09, 18), m.cutWood, [0, 2.34, -.8]);
        if (!importedFern) mound(group, 1.1, -.8, .7);
      }
      if (importedEgg) {
        const shell = importedEgg.clone();
        shell.position.set(0, .10, -.45);
        shell.scale.set(2.6, 3.1, 2.2);
        shell.name = 'supplied-fuzzy-egg-shell';
        group.add(shell);
        hut.shell = shell;
      } else {
        // Keep an operable room if the optional local model is unavailable.
        ball(group, m.wool, [0, 1.73, -.26], [1.16, 1.51, .83]);
        for (let j = 0; j < 24; j++) {
          const a = j / 24 * Math.PI * 2, pts = [];
          for (let k = 1; k < 30; k++) {
            const t = k / 30 * Math.PI, r = Math.sin(t), twist = a + Math.sin(t * 3 + j) * .04;
            const px = Math.cos(twist) * 1.17 * r, py = 1.73 + Math.cos(t) * 1.5, pz = -.26 + Math.sin(twist) * .85 * r;
            if (pz > .38 && Math.abs(px) < .61 && py > .4 && py < 2.42) continue;
            pts.push([px, py, pz]);
          }
          if (pts.length > 2) tube(group, pts, .011 + j % 4 * .0015, m.thread, 32);
        }
      }
      const door = new THREE.Group(); group.add(door); door.userData.opening = false; door.userData.progress = 0;
      if (!importedEgg) {
        ball(group, m.dark, [0, 1.3, .55], [.55, .91, .055]);
        ball(group, m.amber, [0, 1.3, .603], [.40, .72, .015]);
        ring(group, [0, 1.3, .67], [.61, .98], .115, m.woolLight);
        const leafMat = felt(isOwn ? '#d0c2a4' : '#e1cdb0');
        for (const side of [-1, 1]) {
          const pivot = new THREE.Group(); pivot.position.set(side * .55, 1.32, .73); door.add(pivot);
          ball(pivot, leafMat, [-side * .27, 0, 0], [.33, .85, .07]);
          for (let k = 0; k < 4; k++) tube(pivot, [[-side * .48, -.61 + k * .38, .065], [-side * .25, -.58 + k * .38, .092], [-side * .03, -.62 + k * .38, .068]], .009, m.thread, 10);
        }
      }
      const glow = new THREE.PointLight('#ffbd7a', importedEgg ? 1.1 : 2.2, 4); glow.position.set(0, 1.4, .78); group.add(glow);
      if (!importedFern) {
        mound(group, -1.05, .72, .74, true); mound(group, 1.08, .52, .68);
        mushroom(group, -1.45, .84, .74); mushroom(group, 1.32, .61, .55);
      }
      hut.sign = sign(group, isOwn ? '我的茧房' : hut.name, isOwn ? '回到起点' : hut.themeTitle + ' · 示例', [0, importedEgg ? 3.25 : 2.95, .88], 2.1);
      hut.door = door; hut.group = group; hut.doorTarget = new THREE.Vector3(hut.x, 0, hut.doorZ);
      return hut;
    }
    huts.forEach(h => createCocoon(forest, h));
    function updateDoorSign(hut) {
      hut.sign.material.map = labelTexture(hut.name, hut.open ? hut.themeTitle + ' · 可进入' : '暂时关门');
      hut.sign.material.needsUpdate = true;
    }
    huts.forEach(updateDoorSign);
    const own = createCocoon(forest, { x: 0, z: 9.3, doorZ: 7.75, shape: 'tree', name: '我的茧房' }, true);
    const ownDoorTarget = new THREE.Vector3(0, 0, 7.75);

    if (importedEgg) {
      // Unlabelled eggs hang from rear branches as distant, non-interactive homes.
      for (const [x, z, height, side, turn] of [
        [-14, -13, 4.2, 1.2, -.25], [-6, -16, 4.5, 1.1, .12],
        [5, -15, 3.8, -1.1, -.12], [13, -12, 4.2, -1.2, .28],
      ]) {
        const shell = importedEgg.clone();
        shell.name = 'background-hanging-cocoon';
        shell.position.set(x + side, height * .55, z + .15);
        shell.rotation.y = turn;
        shell.scale.set(1.35, 1.48, 1.27);
        forest.add(shell);
        tube(forest, [[x + side * .7, height * .97, z + .1], [x + side * .9, height * .89, z + .15], [x + side, height * .55 + 1.43, z + .15]], .022, m.thread, 12);
        forestDetail.hangingEggs.push(shell);
      }
    }

    const interior = new THREE.Group(); scene.add(interior);
    const domeTex = felt('#e8d5bd', .07);
    const dome = mesh(interior, new THREE.SphereGeometry(4.78, 64, 36, 0, Math.PI * 2, 0, Math.PI / 2), domeTex, [0, 0, 0], [1, .86, 1]);
    dome.material.side = THREE.BackSide;
    const roomFloor = mesh(interior, new THREE.CircleGeometry(4.76, 64), m.mossDark, [0, -.005, 0]); roomFloor.rotation.x = -Math.PI / 2;
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
    panelMount.position.set(-2.65, 0, -.55);
    panelMount.rotation.y = Math.PI / 2;
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
      const g = themeGroups.nature;
      const x = side * 2.45;
      tube(g, [[x, .05, -.5], [x + side * .1, .68, -.67], [x + side * .2, 1.38, -.8]], .065, m.bark, 20);
      for (let j = 0; j < 5; j++) {
        const a = j * .83;
        const leaf = ball(g, j % 2 ? leafPale : leafGreen, [x + side * (.25 + j * .055), .52 + j * .22, -.65 + Math.sin(a) * .35], [.14, .29, .075]);
        leaf.rotation.z = side * (.5 + j * .08);
      }
      mesh(g, new THREE.CylinderGeometry(.55, .63, .16, 16), m.cutWood, [x, .22, -2.0]);
      ball(g, m.mossLight, [x, .36, -2.0], [.39, .13, .31]);
      mushroom(g, x + side * .35, -1.9, .55);
    }
    sign(themeGroups.nature, '叶脉标本', '示例主题', [-2.42, 1.62, -2.8], 1.35);
    // Journey: felt map fragments, a compass, and a small travelling case.
    const journey = themeGroups.journey;
    const map = mesh(journey, new THREE.PlaneGeometry(1.38, 1.1), new THREE.MeshBasicMaterial({ map: labelTexture('远行地图', '示例主题'), side: THREE.DoubleSide }), [2.48, 1.65, -2.55]);
    map.rotation.y = -.35;
    mesh(journey, new THREE.BoxGeometry(1.15, .72, .5), felt('#9e735c'), [-2.4, .42, -1.7]);
    tube(journey, [[-2.7, .8, -1.7], [-2.7, 1.03, -1.7], [-2.12, 1.03, -1.7], [-2.12, .8, -1.7]], .055, copper, 18);
    const compass = mesh(journey, new THREE.CylinderGeometry(.47, .47, .08, 32), gold, [2.35, .12, -1.08]);
    compass.rotation.y = .6;
    for (let j = 0; j < 4; j++) {
      const a = j * Math.PI / 2;
      tube(journey, [[2.35, .18, -1.08], [2.35 + Math.sin(a) * .31, .19, -1.08 + Math.cos(a) * .31]], .018, m.barkDark, 8);
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
    for (let j = 0; j < 7; j++) {
      mesh(music, new THREE.BoxGeometry(.3, .16 + j % 3 * .12, .54), j % 2 ? lilac : gold, [2.1 + (j % 3) * .36, .2, -1.9 + Math.floor(j / 3) * .58]);
    }
    ball(music, lilac, [-2.47, .44, -1.64], [.7, .16, .63]);
    ring(music, [-2.47, .58, -1.64], [.45, .45], .045, gold);
    sign(music, '声音收藏', '示例主题', [-2.42, 1.68, -2.75], 1.35);
    const panelMaps = { home: informationTexture('我的信息视角') };
    for (const room of config?.rooms || []) panelMaps[room.themeId] = informationTexture(room.themeTitle);
    function setTheme(themeId) {
      Object.entries(themeGroups).forEach(([name, group]) => { group.visible = name === themeId; });
      panel.material.map = panelMaps[themeId] || panelMaps.home;
      panel.material.needsUpdate = true;
    }
    // The exit remains on the back wall, unobstructed by the side-mounted panel.
    ball(interior, m.dark, [0, 1.12, -4.48], [.68, 1.08, .06]);
    ring(interior, [0, 1.12, -4.39], [.76, 1.14], .13, m.woolLight);
    sign(interior, '树洞出口', '靠近后按 E', [0, 2.82, -4.30], 1.8);
    for (let i = 0; i < 28; i++) { const a = rnd() * Math.PI * 2, r = 1.3 + rnd() * 2.9; ball(interior, m.amber, [Math.cos(a) * r, .14 + rnd() * .3, Math.sin(a) * r], [.018, .018, .018]); }
    const player = new THREE.Group(); scene.add(player);
    const avatar = new THREE.Group(); player.add(avatar);
    const hedgehog = window.PojianHedgehog.create(THREE); hedgehog.rotation.y = Math.PI; avatar.add(hedgehog);
    const marker = mesh(player, new THREE.CircleGeometry(.66, 28), new THREE.MeshBasicMaterial({ color: '#274836', transparent: true, opacity: .14, depthWrite: false }), [0, .023, 0]); marker.rotation.x = -Math.PI / 2;
    const panelApproach = new THREE.Vector3(-1.5, 0, -.55);
    return { forest, forestDetail, interior, huts, own, ownDoorTarget, roomAccent, roomLight, player, avatar, panel, panelMount, panelApproach, setTheme, themeGroups, updateDoorSign, forestObstacles };
  }
  window.PojianStage4Art = { build };
})();
