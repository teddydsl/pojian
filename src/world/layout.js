/* Spatial contract for the current game. Values in local are authored once. */
(() => {
  const worldScale = 1.2, roomScale = 1.2;
  const point = (p, scale) => p.map(v => v * scale);
  const local = {
    paths: [
      {id:'home',points:[[0,7.75],[-.2,5.3],[.1,2.4],[0,0]],width:1.8},
      {id:'north',points:[[0,0],[-3.1,-1.4],[-5.6,-4.2],[-8,-5.55]],width:1.65},
      {id:'stream',points:[[0,0],[.45,-3.7],[-.25,-7.3],[0,-10.55]],width:1.65},
      {id:'hill',points:[[0,0],[3.1,-1.6],[5.6,-3.9],[8,-5.55]],width:1.65},
    ],
    distantPaths:[
      {id:'west-horizon',points:[[-5.6,-4.2],[-11,-4.8],[-17,-9],[-24,-14],[-31,-19]],width:1.3,fade:true},
      {id:'north-horizon',points:[[0,-7.3],[-2.8,-11],[-3,-18],[-4,-25],[-7,-32]],width:1.3,fade:true},
      {id:'east-horizon',points:[[5.6,-3.9],[11,-3],[18,-6],[25,-10],[32,-15]],width:1.3,fade:true},
      {id:'south-horizon',points:[[0,4.2],[-3.2,8],[-6,14],[-10,22],[-15,29]],width:1.3,fade:true},
    ],
    boundary:{count:14,radius:33,modelScale:19.5,y:-2.34},
    owners:{home:'阿吉',north:'苔苔',stream:'栗子',hill:'铃子'},
    cocoonVisual:{shellPosition:[0,.1,-.45],shellScale:[2.6,3.1,2.2],treeOffset:[-1.65,0,-3.6],logOffset:[2.5,0,-3.4]},
    huts: [
      {id:'north',x:-8,z:-7,doorZ:-5.55,shape:'tree'},
      {id:'stream',x:0,z:-12,doorZ:-10.55,shape:'log'},
      {id:'hill',x:8,z:-7,doorZ:-5.55,shape:'tree'},
    ],
    home: {id:'home',x:0,z:9.3,doorZ:7.75,shape:'tree'},
    trees: [
      [-14,-13,5.3],[-11,-12,4.9],[-13,-4,5.7],[-12,4,5.0],[-8,8,5.4],[-4,12,5.1],
      [5,11,5.7],[11,9,5.3],[14,4,5.1],[12,-3,5.5],[13,-12,5.3],[5,-15,5.1],[-6,-16,5.5],[-16,8,5.7],[16,-6,5.3],
    ].map(([x,z,height],i)=>({id:`tree-${i}`,x,z,height,turn:i*.83,radius:.52})),
    hanging: [
      {treeId:'tree-0',offset:[-1.15,2.5,.2]}, {treeId:'tree-12',offset:[1.1,2.8,.15]},
      {treeId:'tree-11',offset:[-1.1,2.5,.2]}, {treeId:'tree-10',offset:[-1.15,2.6,.2]},
    ],
    room: {
      radius:4.78, heightRatio:.86, floorRadius:4.76, walkRadius:4.32,
      spawn:[0,0,1.65], exitVisual:[0,1.12,-4.48], exitApproachOffset:[0,-1.12,.68],
      panelMount:[-2.65,0,-.55], panelYaw:Math.PI/2, panelDistance:1.15,
      furniture:{nature:[[-2.45,-2,.63],[2.45,-2,.63]],journey:[[-2.4,-1.7,.78],[2.35,-1.08,.55]],music:[[-2.47,-1.64,.77],[2.46,-1.55,.68]]},
    },
    forestSpawn:[0,0,4.2], bounds:{minX:-15,maxX:15,minZ:-16,maxZ:11.2},
  };
  const room = local.room;
  const world = {
    spawn:point(local.forestSpawn,worldScale),
    bounds:Object.fromEntries(Object.entries(local.bounds).map(([key,value])=>[key,value*worldScale])),
    huts:local.huts.map(h=>({...h,x:h.x*worldScale,z:h.z*worldScale,doorZ:h.doorZ*worldScale,doorTarget:point([h.x,0,h.doorZ],worldScale),returnPosition:point([h.x,0,h.doorZ+2.1],worldScale)})),
    ownDoorTarget:point([0,0,local.home.doorZ],worldScale),
  };
  const indoor = {
    radius:room.radius*roomScale, height:room.radius*room.heightRatio*roomScale,
    walkRadius:room.walkRadius*roomScale, spawn:point(room.spawn,roomScale),
    exit:point(room.exitVisual.map((v,i)=>v+room.exitApproachOffset[i]),roomScale),
    panelApproach:point([room.panelMount[0]+Math.sin(room.panelYaw)*room.panelDistance,0,room.panelMount[2]+Math.cos(room.panelYaw)*room.panelDistance],roomScale),
    furniture:Object.fromEntries(Object.entries(room.furniture).map(([key,items])=>[key,items.map(([x,z,radius])=>({x:x*roomScale,z:z*roomScale,radius:radius*roomScale}))])),
  };
  function distanceToSegment(x,z,a,b) {
    const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));
    return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);
  }
  function clearForDecoration(x,z,padding=.4) {
    if(Math.hypot(x,z)<1.8+padding)return false;
    if([...local.huts,local.home].some(h=>Math.hypot(x-h.x,z-h.z)<2.2+padding))return false;
    return ![...local.paths,...local.distantPaths].some(path=>path.points.slice(1).some((b,i)=>distanceToSegment(x,z,path.points[i],b)<path.width/2+padding));
  }
  window.PojianLayout = {
    version:1, worldScale, roomScale, avatarScale:.8, avatarHeight:1.76, local,world,indoor,clearForDecoration,
    reach:{hut:2.8,home:2.4,panel:1.3,exit:1.75},
    camera:{forest:{distance:10.2,height:7.56,focusHeight:.95},room:{radius:3.4,height:3.2,minHorizontal:1.65,focusHeight:1.05}},
  };
})();
