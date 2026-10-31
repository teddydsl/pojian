/* Solve the camera inside the actual dome; movement reads this rendered view. */
(() => {
  function create(THREE, camera, layout) {
    const wrap = value => Math.atan2(Math.sin(value),Math.cos(value));
    let angle=0,avoidSide=1,initialized=false;
    function pose(player,yaw,mode,dt=1,snap=false) {
      if(mode==='forest') {
        const cfg=layout.camera.forest;
        const target=player.clone().add(new THREE.Vector3(Math.sin(yaw)*cfg.distance,cfg.height,Math.cos(yaw)*cfg.distance));
        if(snap)camera.position.copy(target);else camera.position.lerp(target,1-Math.exp(-5.5*dt));
        camera.lookAt(player.x,cfg.focusHeight,player.z);
        initialized=false;
        return;
      }
      const cfg=layout.camera.room,pr=Math.hypot(player.x,player.z),pa=Math.atan2(player.x,player.z);
      let next=(!initialized||snap)?yaw:angle+wrap(yaw-angle)*(1-Math.exp(-9*dt));
      // Keep the orbit on one side of the avatar when desired yaw enters the
      // forbidden arc. Angular interpolation avoids cutting through the avatar.
      if(pr>1e-5) {
        const cosine=(cfg.radius*cfg.radius+pr*pr-cfg.minHorizontal*cfg.minHorizontal)/(2*cfg.radius*pr);
        if(cosine<1) {
          const limit=Math.acos(Math.max(-1,cosine))+.015;
          const delta=wrap(next-pa);
          if(Math.abs(delta)<limit) {
            const previous=wrap(angle-pa);
            if(!initialized||snap)avoidSide=Math.abs(delta)>.01?Math.sign(delta):avoidSide;
            else if(Math.abs(previous)>.015)avoidSide=Math.sign(previous);
            next=pa+avoidSide*limit;
          }
        }
      }
      angle=wrap(next);initialized=true;
      camera.position.set(Math.sin(angle)*cfg.radius,cfg.height,Math.cos(angle)*cfg.radius);
      camera.lookAt(player.x,cfg.focusHeight,player.z);
      camera.updateMatrixWorld(true);
    }
    function inside(point,margin=.18) {
      const radius=layout.indoor.radius-margin,height=layout.indoor.height-margin;
      return (point.x*point.x+point.z*point.z)/(radius*radius)+point.y*point.y/(height*height)<=1;
    }
    return {pose,inside};
  }
  window.PojianCamera={create};
})();
