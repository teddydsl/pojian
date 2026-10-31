/* Only the data pendant keeps its pointer action; videos use the nearby E action. */
(() => {
  'use strict';
  window.PojianMediaInteraction={create({THREE,renderer,camera,pendants,blocked,dragging,onActivate}){
    const canvas=renderer.domElement,ray=new THREE.Raycaster(),point=new THREE.Vector2();
    const targets=pendants.map(p=>p.mesh),lookup=new Map(pendants.map(p=>[p.mesh,p]));
    let start=null;
    function pick(x,y){
      const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return null;
      point.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);
      camera.updateMatrixWorld(true);ray.setFromCamera(point,camera);
      const hit=ray.intersectObjects(targets,false)[0];if(!hit)return null;
      const local=hit.object.worldToLocal(hit.point.clone());
      if(local.y>window.PojianMediaConfig.bodyTop||local.z<-.01)return null;
      const selected=lookup.get(hit.object);
      return selected.kind==='data'?selected:null;
    }
    canvas.addEventListener('pointerdown',event=>{start=event.button===0?{x:event.clientX,y:event.clientY}:null;});
    canvas.addEventListener('pointercancel',()=>{start=null;canvas.style.cursor='';});
    canvas.addEventListener('pointermove',event=>{
      if(blocked()||dragging()){canvas.style.cursor='';return;}
      canvas.style.cursor=pick(event.clientX,event.clientY)?'pointer':'';
    });
    canvas.addEventListener('click',event=>{
      const moved=start&&Math.hypot(event.clientX-start.x,event.clientY-start.y)>5;start=null;
      if(event.button!==0||moved||blocked())return;
      const selected=pick(event.clientX,event.clientY);if(selected)onActivate(selected);
    });
    return {pick,clear(){start=null;canvas.style.cursor='';}};
  }};
})();
