/* Project the supplied warm reference art onto the supplied GLB's real front.
   The model has no UVs. Video instances share geometry/materials; the data face
   uses the same housing with its old play-button relief flattened underneath. */
(() => {
  'use strict';
  const config=window.PojianMediaConfig,oldBuild=window.PojianCurrentArt.build;
  const previous=window.PojianLayout;
  window.PojianLayout={...previous,local:{...previous.local,room:{...previous.local.room,media:config}}};
  function create(THREE){
    const raw=window.PojianModels.get(THREE,config.model),source=raw.geometry;
    function geometry(kind){
      const g=source.clone(),positions=g.getAttribute('position'),normals=g.getAttribute('normal'),indices=g.index.array;
      const uv=new Float32Array(positions.count*2),front=[],body=[];
      const rect=kind==='video'?config.playerImageRect:config.profileImageRect;
      for(let i=0;i<positions.count;i++){
        const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
        uv[i*2]=(rect[0]+(x+.197021484375)/.39404296875*(rect[2]-rect[0]))/config.imageSize[0];
        uv[i*2+1]=1-(rect[3]-y/config.bodyTop*(rect[3]-rect[1]))/config.imageSize[1];
        if(kind==='data'&&Math.abs(x)<.17&&y>.045&&y<.69&&z>.008)positions.setZ(i,.018);
      }
      for(let i=0;i<indices.length;i+=3){
        const ids=[indices[i],indices[i+1],indices[i+2]];
        const nz=ids.reduce((s,id)=>s+normals.getZ(id),0)/3;
        const x=ids.reduce((s,id)=>s+positions.getX(id),0)/3,y=ids.reduce((s,id)=>s+positions.getY(id),0)/3,z=ids.reduce((s,id)=>s+positions.getZ(id),0)/3;
        const flatData=kind==='data'&&Math.abs(x)<.17&&y>.045&&y<.69&&z>.008;
        ((nz>.35||flatData)&&z>.006&&y<config.bodyTop?front:body).push(...ids);
      }
      g.setAttribute('uv',new THREE.BufferAttribute(uv,2));g.setIndex([...body,...front]);g.clearGroups();
      g.addGroup(0,body.length,0);g.addGroup(body.length,front.length,1);
      if(kind==='data')g.computeVertexNormals();
      g.computeBoundingBox();g.computeBoundingSphere();
      g.userData={source:config.model,face:kind,projectedFrontTriangles:front.length/3};return g;
    }
    function photo(kind){
      const asset=window.PojianPendantTextures[kind],image=new Image(),texture=new THREE.Texture();
      texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;
      image.onload=()=>{texture.image=image;texture.needsUpdate=true;};image.src='data:'+asset.mime+';base64,'+asset.base64;return texture;
    }
    const clothCanvas=document.createElement('canvas');clothCanvas.width=clothCanvas.height=256;
    const ctx=clothCanvas.getContext('2d');ctx.fillStyle='#d9bf9b';ctx.fillRect(0,0,256,256);
    let seed=7721;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<7500;i++){const x=rand()*256,y=rand()*256;ctx.strokeStyle=i%3?'rgba(255,238,204,.22)':'rgba(118,75,38,.11)';ctx.lineWidth=.35+rand()*.6;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(rand()-.5)*4,y+1+rand()*5);ctx.stroke();}
    const cloth=new THREE.CanvasTexture(clothCanvas);cloth.colorSpace=THREE.SRGBColorSpace;
    const housing=new THREE.MeshStandardMaterial({map:cloth,bumpMap:cloth,bumpScale:.0025,roughness:1,metalness:0,color:'#fff1d9',side:THREE.DoubleSide});
    const front=kind=>new THREE.MeshStandardMaterial({map:photo(kind),roughness:1,metalness:0,color:'#ffedcf',emissive:'#a56429',emissiveIntensity:.045,side:THREE.DoubleSide});
    const shared={video:{geometry:geometry('video'),materials:[housing,front('video')]},data:{geometry:geometry('data'),materials:[housing,front('data')]}};
    function instance(kind,height){
      const src=shared[kind],mesh=new THREE.Mesh(src.geometry,src.materials),group=new THREE.Group();
      mesh.name=kind+'-pendant-housing';mesh.scale.setScalar(height/config.bodyTop);group.add(mesh);group.userData.kind=kind;return {group,mesh};
    }
    return {instance,housing};
  }
  window.PojianCurrentArt={build(THREE,scene){
    const art=oldBuild(THREE,scene),factory=create(THREE),layout=window.PojianLayout;
    // Remove the old landscape card, its backing and all silk outline loops.
    art.panelMount.clear();
    const data=factory.instance('data',config.data.bodyHeight);data.group.position.y=config.data.bottom;
    data.mesh.scale.x*=config.data.widthScale;art.panelMount.add(data.group);
    const pendants=[{id:'data',kind:'data',mesh:data.mesh,group:data.group,label:'打开数据面板'}];
    function cord(parent,x,z,lowerY){
      const roof=layout.local.room.radius*layout.local.room.heightRatio*Math.sqrt(Math.max(0,1-(x*x+z*z)/layout.local.room.radius**2))-.08;
      const local=parent.worldToLocal(art.interior.localToWorld(new THREE.Vector3(x,roof,z)));
      const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,lowerY,0),local]);
      const rope=new THREE.Mesh(new THREE.TubeGeometry(curve,12,.012,5,false),factory.housing);rope.name='pendant-ceiling-cord';parent.add(rope);
    }
    for(const spec of config.videos){
      const p=factory.instance('video',spec.bodyHeight);p.group.position.set(...spec.position);p.group.rotation.y=spec.yaw;p.group.name=spec.id;art.interior.add(p.group);
      pendants.push({id:spec.id,kind:'video',mesh:p.mesh,group:p.group,label:spec.label});
    }
    art.interior.updateMatrixWorld(true);
    cord(data.group,layout.local.room.panelMount[0],layout.local.room.panelMount[2],data.mesh.scale.y*.99951171875);
    for(const p of pendants.filter(p=>p.kind==='video')){
      const pos=p.group.position;cord(p.group,pos.x,pos.z,p.mesh.scale.y*.99951171875);
    }
    art.interior.updateMatrixWorld(true);
    pendants.forEach(p=>{const position=p.group.getWorldPosition(new THREE.Vector3());p.approachTarget=new THREE.Vector3(position.x,0,position.z);});
    const blockers=pendants.map(p=>{
      const center=art.interior.worldToLocal(p.group.getWorldPosition(new THREE.Vector3()));
      const width=p.mesh.geometry.boundingBox.getSize(new THREE.Vector3()).x*p.mesh.scale.x;
      return {x:center.x*layout.roomScale,z:center.z*layout.roomScale,radius:(width*.5+.34)*layout.roomScale};
    });
    const furnitureColliders=Object.fromEntries([...Object.keys(art.furnitureColliders),'home'].map(key=>[key,[...(art.furnitureColliders[key]||[]),...blockers]]));
    return {...art,panel:data.mesh,pendants,furnitureColliders};
  }};
})();
