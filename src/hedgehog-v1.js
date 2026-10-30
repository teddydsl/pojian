/* Shared hedgehog shape selected by the user for the art gate and Stage 2. */
(() => {
  'use strict';
  function create(THREE) {
    let seed = 74193;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    function felt(color) {
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const x = c.getContext('2d'); x.fillStyle = color; x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 15000; i++) {
        const px = rnd() * 256, py = rnd() * 256;
        x.strokeStyle = rnd() > .56 ? `rgba(255,248,223,${.025 + rnd() * .12})` : `rgba(54,43,34,${.02 + rnd() * .07})`;
        x.lineWidth = .3 + rnd() * .7; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (rnd() - .5) * 3, py + 1 + rnd() * 9); x.stroke();
      }
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: .018, roughness: 1 });
    }
    const mats = {
      cream: felt('#ead9be'), belly: felt('#f4e7d2'), peach: felt('#d89a83'),
      quill: [felt('#9d7656'), felt('#ad8460'), felt('#b58b68'), felt('#7d5e49')],
      scarf: felt('#ae4035'), bag: felt('#ad4435'), bagLight: felt('#c35a45'), brown: felt('#705541'), wool: felt('#e7d5b9'),
      eye: new THREE.MeshPhysicalMaterial({ color: '#151914', roughness: .13, clearcoat: 1 }),
      blue: new THREE.MeshPhysicalMaterial({ color: '#5ca4c6', roughness: .17, metalness: .1, clearcoat: 1 }),
      goggles: new THREE.MeshStandardMaterial({ color: '#e7ddd0', roughness: .76 }),
      deep: new THREE.MeshStandardMaterial({ color: '#2a332d', roughness: 1 }),
    };
    const group = new THREE.Group(); group.position.y = .11;
    const sphere = new THREE.SphereGeometry(1, 28, 20);
    const ball = (material, at, size) => { const o = new THREE.Mesh(sphere, material); o.position.set(...at); o.scale.set(...size); group.add(o); return o; };
    const tube = (points, radius, material, segments = 24) => {
      const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
      const o = new THREE.Mesh(new THREE.TubeGeometry(curve, segments, radius, 6, false), material); group.add(o); return o;
    };
    const ring = (cx, cy, cz, rx, ry, radius, material) => {
      const points = []; for (let i = 0; i <= 72; i++) { const a = i / 72 * Math.PI * 2; points.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a), cz]); }
      return tube(points, radius, material, 72);
    };
    ball(mats.cream, [0, .91, -.08], [.58, .79, .58]);
    ball(mats.belly, [0, .88, .39], [.45, .59, .22]);
    ball(mats.quill[0], [0, 1.11, -.46], [.74, .76, .6]);
    const coneGeo = new THREE.ConeGeometry(.045, .33, 5); coneGeo.translate(0, .165, 0);
    const batches = mats.quill.map(m => { const o = new THREE.InstancedMesh(coneGeo, m, 130); o.count = 0; group.add(o); return o; });
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 430; i++) {
      const u = rnd() * 2 - 1, az = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      const nx = s * Math.cos(az), ny = u, nz = s * Math.sin(az);
      const px = nx * .72, py = 1.1 + ny * .75, pz = -.46 + nz * .59;
      if (pz > .01 && py < 1.53) continue;
      if (py < .63) continue;
      const dir = new THREE.Vector3(nx * 1.1, ny + .16, nz - .14).normalize();
      dummy.position.set(px, py, pz); dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      const len = .65 + rnd() * .65; dummy.scale.set(.75 + rnd() * .65, len, .75 + rnd() * .65); dummy.updateMatrix();
      const mesh = batches[(rnd() * batches.length) | 0]; if (mesh.count < 130) mesh.setMatrixAt(mesh.count++, dummy.matrix);
    }
    batches.forEach(m => m.instanceMatrix.needsUpdate = true);
    ball(mats.belly, [0, 1.55, .22], [.54, .49, .49]);
    ball(mats.cream, [0, 1.35, .59], [.42, .29, .31]);
    ball(mats.cream, [0, 1.36, .77], [.26, .16, .25]);
    ball(mats.eye, [0, 1.44, 1.015], [.09, .065, .09]);
    for (const side of [-1, 1]) {
      ball(mats.cream, [side * .515, 1.69, .15], [.17, .2, .12]);
      ball(mats.peach, [side * .535, 1.69, .248], [.10, .12, .025]);
      ball(mats.eye, [side * .24, 1.61, .62], [.082, .105, .055]);
      ball(mats.belly, [side * .215, 1.645, .671], [.026, .031, .018]);
      ball(mats.peach, [side * .36, 1.38, .58], [.12, .075, .025]);
      const arm = ball(mats.cream, [side * .5, .92, .43], [.19, .32, .19]); arm.rotation.z = side * .27;
      ball(mats.brown, [side * .32, .18, .08], [.2, .11, .27]);
    }
    tube([[-.09, 1.25, .88], [0, 1.22, .91], [.09, 1.25, .88]], .014, mats.brown, 14);
    const scarfLoop = []; for (let j = 0; j <= 36; j++) { const a = j / 36 * Math.PI * 2; scarfLoop.push([.48 * Math.cos(a), 1.26 + .02 * Math.sin(a * 2), .18 + .43 * Math.sin(a)]); }
    tube(scarfLoop, .085, mats.scarf, 50);
    const scarfShape = new THREE.Shape(); scarfShape.moveTo(-.35, 1.29); scarfShape.lineTo(.34, 1.29); scarfShape.lineTo(.02, .96); scarfShape.closePath();
    const scarfFront = new THREE.Mesh(new THREE.ShapeGeometry(scarfShape), new THREE.MeshStandardMaterial({ map: felt('#b44638').map, side: THREE.DoubleSide, roughness: 1 }));
    scarfFront.position.z = .68; group.add(scarfFront);
    for (const side of [-1, 1]) {
      ball(mats.blue, [side * .265, 1.958, .505], [.18, .145, .045]);
      ring(side * .265, 1.958, .548, .20, .16, .037, mats.goggles);
    }
    tube([[-.59, 1.955, .37], [-.68, 1.945, .12], [-.54, 1.92, -.25]], .038, mats.deep, 15);
    tube([[.59, 1.955, .37], [.68, 1.945, .12], [.54, 1.92, -.25]], .038, mats.deep, 15);
    ball(mats.bag, [0, .89, -1.13], [.43, .48, .21]);
    ball(mats.bagLight, [0, 1.23, -1.31], [.40, .17, .1]);
    ball(mats.bag, [0, .69, -1.35], [.29, .17, .07]);
    tube([[-.3, 1.23, -1.06], [-.49, 1.58, -.72], [-.47, 1.38, -.26]], .055, mats.brown, 20);
    tube([[.3, 1.23, -1.06], [.49, 1.58, -.72], [.47, 1.38, -.26]], .055, mats.brown, 20);
    ball(mats.wool, [0, 1.23, -1.42], [.055, .045, .022]);
    return group;
  }
  window.PojianHedgehog = { create };
})();
