/* Apply the approved 5A.1 interior feedback to the frozen 4.1A composition. */
(() => {
  'use strict';
  const config=window.PojianInteriorConfig, previous=window.PojianLayout;
  const spec=config.exit;
  // Visual and interaction positions share the same local door anchor. The world
  // layout, camera volume, forest, player and side-mounted data panel stay intact.
  window.PojianLayout={
    ...previous,
    local:{...previous.local,room:{...previous.local.room,exitDoor:spec}},
    indoor:{...previous.indoor,exit:spec.position.map((v,i)=>(v+spec.approachOffset[i])*previous.roomScale)},
    reach:{...previous.reach,exit:spec.reach}
  };
  const original=window.PojianCurrentArt.build;
  window.PojianCurrentArt={build(THREE,scene){
    const art=original(THREE,scene),room=art.interior;
    const retired=[];
    room.traverse(node=>{
      if(node.geometry?.type!=='PlaneGeometry')return;
      // The only retained room planes belong to the interactive data panel.
      // Retire the old nature/music/journey cards and the old exit sign itself.
      let parent=node.parent;
      while(parent&&parent!==art.panelMount)parent=parent.parent;
      if(parent!==art.panelMount)retired.push(node);
    });
    retired.forEach(node=>node.removeFromParent());
    const oldExit=previous.local.room.exitVisual;
    const oldDoor=[];
    for(const node of room.children){
      if(node.geometry?.type==='SphereGeometry'&&node.position.distanceTo(new THREE.Vector3(...oldExit))<1e-6)oldDoor.push(node);
      const points=node.geometry?.parameters?.path?.points;
      if(node.geometry?.type==='TubeGeometry'&&points?.length&&points.every(p=>Math.abs(p.z-oldExit[2]-.09)<1e-6))oldDoor.push(node);
    }
    if(oldDoor.length!==2)throw new Error('The frozen interior exit contract changed; cannot safely replace it.');
    oldDoor.forEach(node=>node.removeFromParent());

    const supplied=window.PojianModels.get(THREE,spec.model).clone();
    supplied.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(supplied),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
    supplied.position.sub(new THREE.Vector3(center.x,bounds.min.y,center.z));
    const normalized=new THREE.Group();normalized.add(supplied);normalized.scale.setScalar(spec.height/size.y);
    const exit=new THREE.Group();exit.name='interior-wool-exit';exit.position.set(...spec.position);exit.add(normalized);
    exit.userData.model=spec.model;exit.userData.approach=window.PojianLayout.indoor.exit.slice();
    room.add(exit);

    // Clear the upper arch: the original music discs hung just inside the new
    // portal's front surface. Move their existing cords and discs forward together.
    const hanging=[];
    for(const node of art.themeGroups.music.children){
      const points=node.geometry?.parameters?.path?.points;
      if((node.geometry?.type==='CylinderGeometry'&&node.position.y>2)||
         (node.geometry?.type==='TubeGeometry'&&points?.every(p=>p.y>2))) {
        node.position.z+=config.musicHangingOffsetZ;hanging.push(node);
      }
    }
    room.updateMatrixWorld(true);
    return {...art,interiorExit:exit,interiorRevision:{removedSigns:retired.length,removedExitParts:oldDoor.length,hanging}};
  }};
})();
