import {writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {boot} from './runtime-harness.mjs';
const game=boot(process.argv[2]||'reviews/stage-5a-1.html');
if(!game.art||!game.find('#failure').hidden||game.errors.length)throw Error('Runtime inspection failed: '+game.errors.join(';'));
const indoor={...game.stats(),idle:game.idleSample()};
game.art.player.position.copy(game.art.exitTarget);game.tap('e');game.drain();
const views=[];
for(const [label,x,z] of [['entrance',0,5.04],['north',-9.6,-4.5],['stream',0,-10.5],['hill',9.6,-4.5]]){
  game.art.player.position.set(x,0,z);game.tick(120);views.push({label,...game.stats()});
}
const forestIdle=game.idleSample();
const report={method:'Node/jsdom + actual Three.js graph; stub renderer/image decode/audio. CPU and geometric estimates only, not GPU FPS.',node:process.version,assetScriptEvaluationMs:Math.round(game.parseMs),sceneConstructionMs:Math.round(game.bootMs),indoor,forestViews:views,forestIdle};
const root=resolve(import.meta.dirname,'..');mkdirSync(resolve(root,'docs/reports'),{recursive:true});
const output=process.argv[3]||'docs/reports/runtime-before.json';writeFileSync(resolve(root,output),JSON.stringify(report,null,2)+'\n');
game.close();console.log(JSON.stringify(report,null,2));
