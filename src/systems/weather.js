/* The indoor baseline belongs to the accepted art; sunny light only affects the forest. */
(() => {
  'use strict';
  window.PojianWeather = {create({THREE,scene,renderer,hemisphere,sun,scale,config}) {
    const baseline={background:scene.background.clone(),fog:scene.fog.clone(),hemi:hemisphere.intensity,sun:sun.intensity,exposure:renderer.toneMappingExposure};
    let last=null;
    return {apply(mode) {
      const exterior=mode==='forest';if(last===exterior)return;last=exterior;
      scene.background=exterior?new THREE.Color(config.background):baseline.background.clone();
      scene.fog=exterior?new THREE.Fog(config.background,config.fogNear*scale,config.fogFar*scale):baseline.fog.clone();
      hemisphere.intensity=exterior?config.hemisphere:baseline.hemi;
      sun.intensity=exterior?config.sun:baseline.sun;
      renderer.toneMappingExposure=exterior?config.exposure:baseline.exposure;
    }};
  }};
})();
