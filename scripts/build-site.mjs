/* Publish the accepted art with the current narrative and media runtime. */
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import vm from 'node:vm';
const root=resolve(import.meta.dirname,'..'),read=p=>readFileSync(resolve(root,p)),hash=b=>createHash('sha256').update(b).digest('hex');
const accepted=JSON.parse(read('reviews/snapshots/stage-5a-1.manifest.json'));
for(const output of accepted.outputs)if(hash(read(output.path))!==output.sha256)throw Error('Accepted snapshot changed: '+output.path);
const config={window:{}};vm.runInNewContext(read('public/data/ui-stage5a.js').toString(),config);
const iconNames=Object.values(config.window.PojianUIConfig.icons).map(p=>p.replace(/\.png$/,'.webp'));
const derivatives=iconNames.map(name=>({name,source:'public/assets/icons-webp/'+name}));
const baselineAssets=read('reviews/snapshots/stage-5a-1.assets.js').toString();
const hedgehogStart=baselineAssets.indexOf('/* public/assets/models/hedgehog-plush-single-colored.embedded.js */');
const hedgehogEnd=baselineAssets.indexOf('/* src/hedgehog-felt-glb.js */',hedgehogStart);
if(hedgehogStart<0||hedgehogEnd<0)throw Error('Accepted hedgehog asset boundary is missing');
let assets=baselineAssets.slice(0,hedgehogStart)
  +'/* public/assets/models/hedgehog-plush-game.embedded.js */\n'
  +read('public/assets/models/hedgehog-plush-game.embedded.js').toString()+'\n'
  +baselineAssets.slice(hedgehogEnd)
  +'\n/* Pixel-exact release icon derivatives; both root and review entries provide this base. */\nwindow.PojianUIConfig.iconRoot=window.PojianReleaseBase+"icons/";\nObject.keys(window.PojianUIConfig.icons).forEach(function(k){window.PojianUIConfig.icons[k]=window.PojianUIConfig.icons[k].replace(/\\.png$/,".webp");});\n';
function replaceSection(start,end,path){const a=assets.indexOf(start),b=assets.indexOf(end,a+start.length);if(a<0||b<0)throw Error('Missing section '+path);assets=assets.slice(0,a)+`/* ${path} */\n`+read(path).toString()+'\n'+assets.slice(b);}
replaceSection('/* src/systems/save.js */','/* src/systems/weather.js */','src/systems/save.js');
replaceSection('/* src/ui/stage5a-ui.js */','window.PojianUIConfig.iconRoot=','src/ui/stage5a-ui.js');
for(const path of ['public/assets/models/media-pendant.embedded.js','public/data/media-stage5a.js','src/stage3-audio.js','src/world/media-pendants.js','src/systems/media-interaction.js','src/ui/video-viewer.js'])assets+=`\n/* ${path} */\n`+read(path).toString()+'\n';
const runtime=read('src/stage5a.js');
const digest=createHash('sha256').update(assets).update(runtime);
for(const path of ['reviews/stage-5a-narrative.html','src/ui/video-viewer.css','reviews/fragments/video-viewer.html'])digest.update(read(path));
for(const icon of derivatives)digest.update(read(icon.source));
const releaseId='5a3-'+digest.digest('hex').slice(0,12),directory='public/releases/'+releaseId;
mkdirSync(resolve(root,directory),{recursive:true});
writeFileSync(resolve(root,directory,'assets.js'),assets);writeFileSync(resolve(root,directory,'runtime.js'),runtime);
for(const {name,source} of derivatives){const out=resolve(root,directory,'icons',name);mkdirSync(dirname(out),{recursive:true});copyFileSync(resolve(root,source),out);}
const template=read('reviews/stage-5a-narrative.html').toString().replace('</style>',read('src/ui/video-viewer.css').toString()+'\n</style>').replace('  <div class="controls-dock"',read('reviews/fragments/video-viewer.html').toString()+'\n  <div class="controls-dock"');
function page(prefix,dataBase){
  return template.replace('<title>针毡茧林·林间小路</title>','<title>针毡茧林·林间小路</title>\n  <meta name="pojian-release" content="'+releaseId+'">')
    .replace('href="../public/assets/icons/forest.svg"','href="'+prefix+'public/assets/icons/forest.svg"')
    .replace('  <script src="./snapshots/stage-5a-1.assets.js"></script>','  <script>window.PojianBasePath='+JSON.stringify(dataBase)+';window.PojianReleaseBase='+JSON.stringify(prefix+directory+'/')+';</script>\n  <script src="'+prefix+directory+'/assets.js"></script>')
    .replace('src="./snapshots/stage-5a-1.js"','src="'+prefix+directory+'/runtime.js"');
}
writeFileSync(resolve(root,'index.html'),page('./','./reviews/'));
writeFileSync(resolve(root,'reviews/stage-5a.html'),page('../','./'));
const files=['index.html','reviews/stage-5a.html',directory+'/assets.js',directory+'/runtime.js',...derivatives.map(x=>directory+'/icons/'+x.name)];
const manifest={stage:'5A.4-narrative',releaseId,acceptedStage:'5A.1-interior-r1',deferred:'rewards/collectibles',files:files.map(path=>{const b=read(path);return{path,bytes:b.length,gzipBytes:gzipSync(b).length,sha256:hash(b)}})};
writeFileSync(resolve(root,'public/release-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Built '+releaseId+' for index.html and reviews/stage-5a.html; forest-first narrative active.');
