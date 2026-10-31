(() => {
  function create(THREE,layout) {
    let lastForward=new THREE.Vector3(0,0,-1);
    function basis(camera) {
      const forward=camera.getWorldDirection(new THREE.Vector3()).setY(0);
      if(forward.lengthSq()<1e-8)forward.copy(lastForward);else{forward.normalize();lastForward.copy(forward)}
      const right=new THREE.Vector3(-forward.z,0,forward.x);
      return {forward,right};
    }
    function constrain(position,mode,obstacles=[]) {
      const next=position.clone();
      function bounds() {
        if(mode==='forest') {
          const b=layout.world.bounds;
          next.x=THREE.MathUtils.clamp(next.x,b.minX,b.maxX);next.z=THREE.MathUtils.clamp(next.z,b.minZ,b.maxZ);
        } else {
          const r=Math.hypot(next.x,next.z),limit=layout.indoor.walkRadius;
          if(r>limit){next.x*=limit/r;next.z*=limit/r}
        }
      }
      for(let pass=0;pass<3;pass++) {
        bounds();
        for(const object of obstacles) {
          const dx=next.x-object.x,dz=next.z-object.z,d=Math.hypot(dx,dz);
          if(d<object.radius) {
            const length=Math.max(d,.0001);
            next.x=object.x+(d>.0001?dx/length:1)*object.radius;
            next.z=object.z+(d>.0001?dz/length:0)*object.radius;
          }
        }
      }
      bounds();return next;
    }
    function step(position,camera,forwardAmount,rightAmount,dt,mode,obstacles) {
      const axes=basis(camera);
      const direction=axes.forward.multiplyScalar(forwardAmount).addScaledVector(axes.right,rightAmount);
      if(direction.lengthSq()<1e-8)return {position:position.clone(),direction};
      direction.normalize();
      const speed=mode==='forest'?4.2:3.1;
      return {position:constrain(position.clone().addScaledVector(direction,speed*dt),mode,obstacles),direction};
    }
    return {basis,step,constrain};
  }
  window.PojianMovement={create};
})();
