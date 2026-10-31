import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..');
const files=['stylized-tree-game','log-game','mossy-shrub-cluster-game'];
const registry={};
for(const name of files){const data=readFileSync(resolve(root,`public/assets/models/${name}.glb`));registry[name]={byteLength:data.length,sha256:createHash('sha256').update(data).digest('hex'),base64:data.toString('base64')};}
writeFileSync(resolve(root,'public/assets/models/world-detail.embedded.js'),'/* Local textured exterior models. */\nwindow.PojianWorldModels = '+JSON.stringify(registry)+';\n');
// Freeze the current source at this review checkpoint. Old review entries keep
// their accepted scripts; the new HTML loads only this stage's snapshot.
const sources=[
  'public/vendor/three.global.js','src/hedgehog-v1.js','public/assets/models/hedgehog-plush-single-colored.embedded.js','src/hedgehog-felt-glb.js',
  'public/assets/models/felt-forest-with-mushrooms.embedded.js','src/forest-glb.js','public/assets/models/fuzzy-egg-game.embedded.js','src/egg-glb.js',
  'public/assets/models/fern-plant-game.embedded.js','public/assets/models/fern-plant-ground.embedded.js','src/fern-glb.js',
  'public/data/cocoons-stage4.js','src/stage3-audio.js','public/assets/models/world-detail.embedded.js',
  'src/core/model-glb.js','src/world/layout.js','src/core/camera.js','src/core/movement.js','src/world/forest.js','src/world/art.js',
];
const output=resolve(root,'reviews/snapshots');mkdirSync(output,{recursive:true});
const script=sources.map(name=>`\n/* ${name} */\n${readFileSync(resolve(root,name),'utf8')}`).join('\n');
writeFileSync(resolve(output,'stage-4-1a-r2.assets.js'),script);
writeFileSync(resolve(output,'stage-4-1a-r2.js'),readFileSync(resolve(root,'src/stage4-1a.js')));
writeFileSync(resolve(output,'stage-4-1a-r2.manifest.json'),JSON.stringify({stage:'4.1A-r2',sources:[...sources,'src/stage4-1a.js'].map(path=>({path,sha256:createHash('sha256').update(readFileSync(resolve(root,path))).digest('hex')})),models:Object.fromEntries(Object.entries(registry).map(([name,{byteLength,sha256}])=>[name,{byteLength,sha256}]))},null,2)+'\n');
console.log('Built Stage 4.1A local model registry and review snapshot');
