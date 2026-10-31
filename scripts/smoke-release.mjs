import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {boot} from './runtime-harness.mjs';
const root=resolve(import.meta.dirname,'..'),read=p=>readFileSync(resolve(root,p));
const manifest=JSON.parse(read('public/release-manifest.json'));
for(const file of manifest.files){assert.equal(read(file.path).length,file.bytes);assert.equal(createHash('sha256').update(read(file.path)).digest('hex'),file.sha256,file.path);}
const metrics=JSON.parse(read('docs/reports/runtime-after.json')),baseline=JSON.parse(read('docs/reports/runtime-before.json'));
assert.equal(metrics.indoor.estimatedTriangles,baseline.indoor.estimatedTriangles,'Keep accepted interior geometry');
metrics.forestViews.forEach((view,i)=>{assert.equal(view.estimatedTriangles,baseline.forestViews[i].estimatedTriangles);assert.equal(view.estimatedCalls,baseline.forestViews[i].estimatedCalls);});
for(const page of ['index.html','reviews/stage-5a.html']){
  const previousSave={version:3,explored:['moss','chestnut','hill'],story:{wander:true,mapOpened:true,homeFound:true,homeEntered:true,infoOpened:true,videoOpened:true,ownLocked:true,ownUnlocked:true,neighborUnlocked:true},doorOpen:true};
  const game=boot(page,{'pojian.save':JSON.stringify(previousSave)}),{w,doc,art,find,tap,tick,drain}=game;
  const saved=()=>JSON.parse(game.storage.get('pojian.save'));
  assert.ok(art&&find('#failure').hidden);assert.deepEqual(game.errors,[]);
  assert.equal(doc.querySelector('meta[name="pojian-release"]').content,manifest.releaseId);
  assert.equal(art.interiorRevision.removedSigns,5);
  assert.equal(saved().version,4);assert.deepEqual(saved().explored,[]);assert.ok(Object.values(saved().story).every(done=>!done));
  assert.equal(find('#explored-count').textContent,'0 / 2');assert.equal(find('.explored-chip.seen'),null);
  assert.equal(find('.brand').textContent,'针毡茧林·林间小路');assert.equal(find('.location'),null);
  assert.ok(art.forest.visible);assert.ok(!art.interior.visible);assert.equal(find('#intro-overlay').hidden,false);
  for(const img of doc.querySelectorAll('img')){const path=new URL(img.src).pathname.replace(/^\/pojian\//,'');assert.ok(existsSync(resolve(root,path)),path);assert.ok(path.endsWith('.webp'));}
  find('#intro-skip').click();assert.equal(find('#intro-overlay').hidden,true);
  game.key('w');tick(220);game.key('w','keyup');assert.ok(saved().story.wander,'Walking should finish first task');
  find('#map-button').click();assert.equal(find('#map-panel').hidden,false);assert.ok(saved().story.mapOpened);
  find('[data-map-house="home"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));assert.ok(saved().story.homeFound);tap('Escape');
  art.player.position.copy(art.ownDoorTarget);tap('e');drain();assert.ok(art.interior.visible);assert.ok(saved().story.homeEntered);
  art.player.position.copy(art.panelApproach);tap('e');assert.equal(find('#room-info-panel'),null);assert.ok(game.opened.at(-1).endsWith('/pojian/reviews/demo-data-stage4.html?room=home'));assert.ok(saved().story.infoOpened);
  art.player.position.copy(art.pendants.find(p=>p.kind==='video').approachTarget);tap('e');assert.equal(find('#media-viewer').hidden,false);assert.ok(saved().story.videoOpened);
  find('#media-viewer-close').click();assert.equal(find('#media-viewer').hidden,true);
  find('#door-lock-button').click();assert.equal(saved().doorOpen,false);assert.ok(saved().story.ownLocked);
  find('#door-lock-button').click();assert.equal(saved().doorOpen,true);assert.ok(saved().story.ownUnlocked);
  art.player.position.copy(art.exitTarget);tap('e');drain();assert.ok(art.forest.visible);
  const hill=art.huts.find(h=>h.id==='hill');assert.equal(hill.open,false);
  art.player.position.copy(hill.doorTarget);tick();tap('e');assert.equal(hill.open,false);assert.ok(art.forest.visible);assert.ok(find('#interaction-prompt').textContent.includes('已上锁'));
  for(const hut of art.huts.filter(h=>h.id!=='hill')){art.player.position.copy(hut.doorTarget);tap('e');drain();assert.ok(art.interior.visible);art.player.position.copy(art.exitTarget);tap('e');drain();}
  assert.equal(saved().explored.length,2);assert.equal(find('#explored-count').textContent,'2 / 2');assert.ok(find('#checklist li:last-child').classList.contains('done'));
  find('#settings-button').click();find('#task-toggle').click();tap('Escape');assert.equal(find('#task-panel').hidden,true);
  find('#reset-button').click();assert.ok(art.forest.visible);assert.equal(saved().explored.length,2);
  assert.deepEqual(game.errors,[]);
  const persisted=saved();
  game.close();
  const resumed=boot(page,{'pojian.save':JSON.stringify(persisted)});
  assert.equal(resumed.find('#explored-count').textContent,'2 / 2');assert.equal(resumed.find('.explored-chip.seen')!==null,true);
  assert.deepEqual(resumed.errors,[]);resumed.close();
}
assert.ok(existsSync(resolve(root,'.nojekyll')));
console.log('Release OK: migrated 0/2 start, direct profile, forest title, locked neighbor, two visits, media, save and both pages.');
