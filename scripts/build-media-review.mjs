import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..'),read=p=>readFileSync(resolve(root,p)),hash=b=>createHash('sha256').update(b).digest('hex');
const modelPath='public/assets/models/video-player-pendant.glb',model=read(modelPath);
const textures={};for(const [kind,name] of [['video','pendant-player'],['data','pendant-profile']]){
  const path='public/assets/textures/'+name+'.webp',b=read(path);textures[kind]={path,mime:'image/webp',sha256:hash(b),base64:b.toString('base64')};
}
const embedded='public/assets/models/media-pendant.embedded.js';
writeFileSync(resolve(root,embedded),'/* One supplied mesh and projected reference faces. */\nwindow.PojianWorldModels["video-player-pendant"]='+JSON.stringify({base64:model.toString('base64'),byteLength:model.length,sha256:hash(model)})+';\nwindow.PojianPendantTextures='+JSON.stringify(textures)+';\n');
const release=JSON.parse(read('public/release-manifest.json'));
const sourceAssets='public/releases/'+release.releaseId+'/assets.js';
const sources=[sourceAssets,embedded,'public/data/media-stage5a.js','src/stage3-audio.js','src/world/media-pendants.js','src/systems/media-interaction.js','src/ui/video-viewer.js'];
const out='reviews/snapshots/media-pendants';mkdirSync(resolve(root,'reviews/snapshots'),{recursive:true});
writeFileSync(resolve(root,out+'.assets.js'),sources.map(p=>`\n/* ${p} */\n${read(p)}`).join('\n'));
writeFileSync(resolve(root,out+'.js'),read('src/stage5a.js'));
const assetRevision=hash(read(out+'.assets.js')).slice(0,12),runtimeRevision=hash(read(out+'.js')).slice(0,12);
const template=read('reviews/stage-5a.html').toString();
const page=template.replace('<title>破茧 · 针毡茧林探索</title>','<title>茧房悬挂播放器与资料卡 · 破茧</title>')
  .replace('<span>针毡茧林探索</span>','<span>悬挂装饰验收</span>')
  .replace('src="../'+sourceAssets+'"','src="./snapshots/media-pendants.assets.js?v='+assetRevision+'"')
  .replace('src="../public/releases/'+release.releaseId+'/runtime.js"','src="./snapshots/media-pendants.js?v='+runtimeRevision+'"')
  .replace('</style>',read('src/ui/video-viewer.css')+'\n</style>')
  .replace('  <div class="controls-dock"',read('reviews/fragments/video-viewer.html')+'\n  <div class="controls-dock"');
writeFileSync(resolve(root,'reviews/media-pendants.html'),page);
const inputs=[...sources,modelPath,'src/stage5a.js','src/ui/video-viewer.css','reviews/fragments/video-viewer.html','public/assets/textures/pendant-player.webp','public/assets/textures/pendant-profile.webp'];
const outputs=[out+'.assets.js',out+'.js','reviews/media-pendants.html'];
writeFileSync(resolve(root,out+'.manifest.json'),JSON.stringify({stage:'media-pendants-review',publishedReleaseUnchanged:release.releaseId,sources:inputs.map(path=>({path,sha256:hash(read(path))})),outputs:outputs.map(path=>({path,sha256:hash(read(path))}))},null,2)+'\n');
console.log('Built reviews/media-pendants.html; published release and accepted reviews unchanged.');
