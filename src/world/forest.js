/* Detailed forest composition. All navigation coordinates come from layout. */
(() => {
  function build(THREE,scene,layout,h) {
    const {mesh,m,tube,curvedPath,rnd,importedFern}=h;
    const forest=new THREE.Group();forest.name='detailed-felt-forest';scene.add(forest);
    const detail={trees:[],ring:[],boundary:[],paths:[],logs:[],shrubs:[],mushrooms:[],hangingEggs:[],fern:{}};
    const obstacles=[];
    const sources={tree:window.PojianModels.get(THREE,'stylized-tree-game'),log:window.PojianModels.get(THREE,'log-game'),shrub:window.PojianModels.get(THREE,'mossy-shrub-cluster-game')};
    const importedEgg=window.PojianEggScene.create(THREE);
    const mushroomSource=window.PojianForestScene.create(THREE);
    if(!importedEgg||!importedFern||!mushroomSource)throw new Error('Detailed forest assets are required');
    function prop(parent,kind,x,z,size,turn=0) {
      const source=sources[kind],g=new THREE.Group(),item=source.clone();
      source.geometry.computeBoundingBox();const box=source.geometry.boundingBox;
      const span=kind==='tree'?box.max.y-box.min.y:Math.max(box.max.x-box.min.x,box.max.z-box.min.z);
      const scale=size/span;item.scale.setScalar(scale);item.position.set(0,-box.min.y*scale,0);
      g.name=`asset-${kind}`;g.position.set(x,0,z);g.rotation.y=turn;g.add(item);parent.add(g);return g;
    }
    const floor=mesh(forest,new THREE.PlaneGeometry(160,160),m.moss,[0,-.055,-1]);floor.rotation.x=-Math.PI/2;
    floor.name='continuous-moss-floor';m.moss.map.repeat.set(4,4);
    layout.local.paths.forEach((path,i)=>detail.paths.push(curvedPath(forest,path.points,path.width,{layer:i})));
    layout.local.distantPaths.forEach((path,i)=>detail.paths.push(curvedPath(forest,path.points,path.width,{fade:true,layer:i+4})));
    const treeGroups=new Map();
    for(const spec of layout.local.trees) {
      const group=prop(forest,'tree',spec.x,spec.z,spec.height,spec.turn);
      treeGroups.set(spec.id,group);detail.trees.push(group);
      obstacles.push({x:spec.x,z:spec.z,radius:spec.radius+.28,id:spec.id});
    }
    // A complete ring of textured trees replaces the pale low-detail dioramas.
    for(let i=0;i<28;i++) {
      const angle=i/28*Math.PI*2,radius=23.8+(i%3)*.7;
      detail.ring.push(prop(forest,'tree',Math.sin(angle)*radius,Math.cos(angle)*radius-1,7.1+rnd()*1.2,angle+.25));
    }
    // Restore the original diorama only at the outer boundary, behind the
    // detailed trees. Its ground rim stays buried and its silhouette fades in fog.
    const boundary=layout.local.boundary;
    for(let i=0;i<boundary.count;i++) {
      const angle=i/boundary.count*Math.PI*2,tile=mushroomSource.root.clone(true);
      tile.name='outer-forest-boundary';tile.position.set(Math.sin(angle)*boundary.radius,boundary.y,Math.cos(angle)*boundary.radius-1);
      tile.scale.setScalar(boundary.modelScale);tile.rotation.y=angle;
      forest.add(tile);detail.boundary.push(tile);
    }
    function addMushrooms(x,z,scale=3) {
      const group=mushroomSource.makeMushroomCluster();group.position.set(x,.02,z);group.scale.setScalar(scale);forest.add(group);detail.mushrooms.push(group);
    }
    const groundSites=[];
    for(let iz=0;iz<7;iz++)for(let ix=0;ix<8;ix++) {
      const x=-17+ix*4.7+(rnd()-.5)*1.5,z=-18+iz*4.8+(rnd()-.5)*1.5;
      if(!layout.clearForDecoration(x,z,.8))continue;
      const shrub=prop(forest,'shrub',x,z,1.25+rnd()*.85,rnd()*Math.PI*2);detail.shrubs.push(shrub);
      if((ix+iz)%4===0&&layout.clearForDecoration(x+1.6,z+1.1,1.15)) {
        const log=prop(forest,'log',x+1.6,z+1.1,2.25+rnd()*.65,rnd()*Math.PI);
        detail.logs.push(log);obstacles.push({x:log.position.x,z:log.position.z,radius:.95,id:`log-${ix}-${iz}`});
        addMushrooms(x+.7,z+1.45,2.8);
      }
      // Small neighboring plants form patches rather than a regular garden grid.
      for(let j=0;j<3;j++) {
        const fx=x+(rnd()-.5)*3.2,fz=z+(rnd()-.5)*2.8;
        if(layout.clearForDecoration(fx,fz,.25))groundSites.push([fx,fz,.55+rnd()*.7,rnd()*6.28]);
      }
    }
    for(let attempt=0;attempt<800&&groundSites.length<175;attempt++) {
      const x=(rnd()-.5)*36,z=(rnd()-.5)*35-1;
      if(layout.clearForDecoration(x,z,.3))groundSites.push([x,z,.6+rnd()*.75,rnd()*6.28]);
    }
    const accentSites=[[-4.9,2.8,1.45],[4.7,2.5,1.4],[-6.2,-4.6,1.35],[-9.8,-6.7,1.25],[-2.1,-10.2,1.45],[2,-10,1.35],[6.2,-4.8,1.3],[9.9,-7.1,1.3],[-2,7.8,1.3],[2.1,8.5,1.4],[-12.1,-2.1,1.35],[11.8,-11.1,1.4]].map(p=>[...p,rnd()*6.28]);
    function plants(source,sites,name) {
      const batch=new THREE.InstancedMesh(source.geometry,source.material,sites.length),dummy=new THREE.Object3D();batch.name=name;
      sites.forEach(([x,z,scale,turn],i)=>{dummy.position.set(x,.015,z);dummy.rotation.set(0,turn,0);dummy.scale.setScalar(scale);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix)});
      batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();forest.add(batch);return batch;
    }
    detail.fern.ground=plants(importedFern.ground,groundSites,'fern-ground-cover');
    detail.fern.accents=plants(importedFern.accent,accentSites,'fern-path-accents');
    detail.fern.count=groundSites.length+accentSites.length;
    for(const [x,z,scale] of [[-5.1,3.4,3.6],[5.1,3,3.4],[4.6,-10,3.2],[-10.2,-5.4,2.9],[-6.1,-7.8,2.8],[-1.8,-12.8,2.9],[1.9,-12.6,2.8],[6.1,-7.9,2.8],[10.1,-6.1,3]])addMushrooms(x,z,scale);
    const config=window.PojianCocoons;
    function localBox(object) {
      object.updateMatrix();const box=new THREE.Box3();
      if(object.geometry){object.geometry.computeBoundingBox();box.copy(object.geometry.boundingBox)}
      for(const child of object.children)box.union(localBox(child));
      return box.applyMatrix4(object.matrix);
    }
    function createCocoon(spec,isOwn=false) {
      const data=config.rooms.find(room=>room.id===spec.id)||{};
      const ownerName=layout.local.owners[spec.id];
      const hut={...spec,...data,ownerName,name:ownerName+'的家',color:data.accent,open:isOwn||data.entrance==='open'};
      const group=new THREE.Group();group.name=`cocoon-${spec.id}`;group.position.set(spec.x,0,spec.z);if(isOwn)group.rotation.y=Math.PI;forest.add(group);
      const visual=layout.local.cocoonVisual,supportOffset=spec.shape==='log'?visual.logOffset:visual.treeOffset;
      const support=prop(group,spec.shape==='log'?'log':'tree',supportOffset[0],supportOffset[2],spec.shape==='log'?3.8:6.15,spec.shape==='log'?Math.PI/2:0);
      support.name='detailed-cocoon-support';
      const shell=importedEgg.clone();shell.position.set(...visual.shellPosition);shell.scale.set(...visual.shellScale);shell.name='supplied-fuzzy-egg-shell';group.add(shell);
      const supportBox=localBox(support),shellBox=localBox(shell);
      if(supportBox.max.z>shellBox.min.z-.35)support.position.z-=supportBox.max.z-shellBox.min.z+.35;
      const sign=isOwn?-1:1;
      obstacles.push({x:spec.x+sign*support.position.x,z:spec.z+sign*support.position.z,radius:spec.shape==='log'?2.15:.88,id:`support-${spec.id}`});
      const door=new THREE.Group();door.userData={opening:false,progress:0};group.add(door);
      const light=new THREE.PointLight('#ffbd7a',1.1,4);light.position.set(0,1.4,.78);group.add(light);
      const worldSpec=isOwn?null:layout.world.huts.find(room=>room.id===spec.id);
      Object.assign(hut,{shell,door,group,support,x:spec.x*layout.worldScale,z:spec.z*layout.worldScale,doorZ:spec.doorZ*layout.worldScale,
        doorTarget:new THREE.Vector3(...(isOwn?layout.world.ownDoorTarget:worldSpec.doorTarget)),returnPosition:worldSpec?.returnPosition});
      return hut;
    }
    const huts=layout.local.huts.map(spec=>createCocoon(spec));const own=createCocoon(layout.local.home,true);
    function updateDoorSign(hut){hut.entranceLabel=hut.open?'欢迎来坐':'今日歇息'}
    for(const hanging of layout.local.hanging) {
      const tree=treeGroups.get(hanging.treeId),spec=layout.local.trees.find(t=>t.id===hanging.treeId);
      const shell=importedEgg.clone();shell.name='background-hanging-cocoon';shell.position.set(...hanging.offset);shell.scale.set(1.35,1.48,1.27);
      // Query the actual tree slice occupied by the cocoon. Place it in front of
      // every trunk/branch in that slice instead of pushing it into the tree.
      const treeMesh=tree.children[0],positions=treeMesh.geometry.getAttribute('position'),band=new THREE.Box3();
      treeMesh.updateMatrix();
      const vertex=new THREE.Vector3(),low=shell.position.y-.1,high=low+1.7;
      for(let i=0;i<positions.count;i++){vertex.fromBufferAttribute(positions,i).applyMatrix4(treeMesh.matrix);if(vertex.y>=low&&vertex.y<=high)band.expandByPoint(vertex)}
      shell.position.z=Math.max(shell.position.z,(band.isEmpty()?0:band.max.z)+.85+.32);
      shell.userData={treeBandFront:band.max.z,clearance:.32};
      shell.rotation.y=Math.atan2(-spec.x,-spec.z)-spec.turn;tree.add(shell);detail.hangingEggs.push(shell);
      const {x,y,z}=shell.position;
      tube(tree,[[x*.55,Math.max(y+1.65,spec.height*.8),band.max.z],[x,y+1.43,z]],.022,m.thread,12);
    }
    const scale=layout.worldScale;
    const forestObstacles=obstacles.map(o=>({...o,x:o.x*scale,z:o.z*scale,radius:o.radius*scale}));
    const forestColliders=[...huts.map(hut=>({x:hut.x,z:hut.z,radius:1.65*scale})),{x:own.x,z:own.z,radius:1.65*scale},...forestObstacles];
    return {forest,forestDetail:detail,huts,own,ownDoorTarget:new THREE.Vector3(...layout.world.ownDoorTarget),forestObstacles,forestColliders,updateDoorSign};
  }
  window.PojianForest={build};
})();
