/* Publish only the user-accepted 5A.1 + interior revision; 5A.2 is deferred. */
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
const assets=read('reviews/snapshots/stage-5a-1.assets.js').toString()+'\n/* Pixel-exact release icon derivatives; both root and review entries provide this base. */\nwindow.PojianUIConfig.iconRoot=window.PojianReleaseBase+"icons/";\nObject.keys(window.PojianUIConfig.icons).forEach(function(k){window.PojianUIConfig.icons[k]=window.PojianUIConfig.icons[k].replace(/\\.png$/,".webp");});\n';
const runtime=read('src/stage5a.js');
const digest=createHash('sha256').update(assets).update(runtime);for(const icon of derivatives)digest.update(read(icon.source));
const releaseId='5a3-'+digest.digest('hex').slice(0,12),directory='public/releases/'+releaseId;
mkdirSync(resolve(root,directory),{recursive:true});
writeFileSync(resolve(root,directory,'assets.js'),assets);writeFileSync(resolve(root,directory,'runtime.js'),runtime);
for(const {name,source} of derivatives){const out=resolve(root,directory,'icons',name);mkdirSync(dirname(out),{recursive:true});copyFileSync(resolve(root,source),out);}
const template=read('reviews/stage-5a-1.html').toString();
function page(prefix,dataBase){
  return template.replace('<title>茧林探索 · 破茧（5A.1 室内修订）</title>','<title>破茧 · 针毡茧林探索</title>\n  <meta name="pojian-release" content="'+releaseId+'">')
    .replace('茧林探索 · 5A.1','针毡茧林探索')
    .replace('href="../public/assets/icons/forest.svg"','href="'+prefix+'public/assets/icons/forest.svg"')
    .replace('  <script src="./snapshots/stage-5a-1.assets.js"></script>','  <script>window.PojianBasePath='+JSON.stringify(dataBase)+';window.PojianReleaseBase='+JSON.stringify(prefix+directory+'/')+';</script>\n  <script src="'+prefix+directory+'/assets.js"></script>')
    .replace('src="./snapshots/stage-5a-1.js"','src="'+prefix+directory+'/runtime.js"');
}
writeFileSync(resolve(root,'index.html'),page('./','./reviews/'));
writeFileSync(resolve(root,'reviews/stage-5a.html'),page('../','./'));
const files=['index.html','reviews/stage-5a.html',directory+'/assets.js',directory+'/runtime.js',...derivatives.map(x=>directory+'/icons/'+x.name)];
const manifest={stage:'5A.3',releaseId,acceptedStage:'5A.1-interior-r1',deferred:'5A.2 gameplay/rewards/collectibles',files:files.map(path=>{const b=read(path);return{path,bytes:b.length,gzipBytes:gzipSync(b).length,sha256:hash(b)}})};
writeFileSync(resolve(root,'public/release-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Built '+releaseId+' for index.html and reviews/stage-5a.html; gameplay matches accepted 5A.1.');
