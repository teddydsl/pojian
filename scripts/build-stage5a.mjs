import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'reviews/snapshots');
const hash=data=>createHash('sha256').update(data).digest('hex');
const read=path=>readFileSync(resolve(root,path));
const modelInput='public/assets/models/glowing-wool-cave-game.glb',modelOutput='public/assets/models/interior-door.embedded.js',door=read(modelInput);
writeFileSync(resolve(root,modelOutput),'/* Existing supplied GLB; no generation or texture changes. */\nwindow.PojianWorldModels["glowing-wool-cave-game"] = '+JSON.stringify({byteLength:door.length,sha256:hash(door),base64:door.toString('base64')})+';\n');
const sources=['reviews/snapshots/stage-4-1a-r2.assets.js',modelOutput,'public/data/interior-stage5a.js','src/world/interior-refresh.js','public/data/ui-stage5a.js','src/systems/save.js','src/systems/weather.js','src/ui/stage5a-ui.js'];
mkdirSync(out,{recursive:true});
const configContext={window:{}};vm.runInNewContext(read('public/data/ui-stage5a.js').toString(),configContext);
const icons=Object.values(configContext.window.PojianUIConfig.icons),iconInputs=[],iconOutputs=[];
for(const name of icons){
  const input='public/assets/icons/'+name,output='reviews/snapshots/stage-5a-1-icons/'+name;
  mkdirSync(resolve(root,output,'..'),{recursive:true});copyFileSync(resolve(root,input),resolve(root,output));
  iconInputs.push(input);iconOutputs.push(output);
}
// Keep 4.1A frozen; apply the supplied door and sign removal only to the current review.
writeFileSync(resolve(out,'stage-5a-1.assets.js'),sources.map(path=>`\n/* ${path} */\n${read(path)}`).join('\n')+'\nwindow.PojianUIConfig.iconRoot="./snapshots/stage-5a-1-icons/";\n');
writeFileSync(resolve(out,'stage-5a-1.js'),read('src/stage5a.js'));
writeFileSync(resolve(out,'stage-5a-1.manifest.json'),JSON.stringify({stage:'5A.1-interior-r1',artBaseline:'4.1A-r2 + supplied wool exit',sources:[...sources,modelInput,'src/stage5a.js','reviews/stage-5a-1.html',...iconInputs].map(path=>({path,sha256:hash(read(path))})),outputs:['reviews/snapshots/stage-5a-1.assets.js','reviews/snapshots/stage-5a-1.js',...iconOutputs].map(path=>({path,sha256:hash(read(path))}))},null,2)+'\n');
console.log('Built 5A.1 interior revision; historical 4.1A, root entry and online site unchanged.');
