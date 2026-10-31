import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {boot} from './runtime-harness.mjs';
const root=resolve(import.meta.dirname,'..'),read=p=>readFileSync(resolve(root,p));
const manifest=JSON.parse(read('public/release-manifest.json'));
for(const file of manifest.files){assert.equal(read(file.path).length,file.bytes);assert.equal(createHash('sha256').update(read(file.path)).digest('hex'),file.sha256,file.path);}
const metrics=JSON.parse(read('docs/reports/runtime-after.json')),baseline=JSON.parse(read('docs/reports/runtime-before.json'));
assert.equal(metrics.indoor.estimatedTriangles,baseline.indoor.estimatedTriangles,'Keep the accepted interior detail');
metrics.forestViews.forEach((view,i)=>{assert.equal(view.estimatedTriangles,baseline.forestViews[i].estimatedTriangles,'Preserve approved forest geometry');assert.equal(view.estimatedCalls,baseline.forestViews[i].estimatedCalls);assert.ok(view.estimatedCalls<=150);assert.ok(view.estimatedTriangles<2500000);});
assert.ok(metrics.forestIdle.domMutations<baseline.forestIdle.domMutations*.05,'Idle HUD must avoid redundant DOM writes');
assert.ok(metrics.indoor.idle.domMutations<baseline.indoor.idle.domMutations*.05);
for(const page of ['index.html','reviews/stage-5a.html']){
  const game=boot(page),{w,doc,art,find,tap,tick,drain}=game;
  assert.ok(art&&find('#failure').hidden);assert.deepEqual(game.errors,[]);
  assert.equal(doc.querySelector('meta[name="pojian-release"]').content,manifest.releaseId);
  assert.equal(art.interiorRevision.removedSigns,5);assert.equal(art.interiorExit.userData.model,'glowing-wool-cave-game');
  for(const img of doc.querySelectorAll('img')){
    const path=new URL(img.src).pathname.replace(/^\/pojian\//,'');assert.ok(existsSync(resolve(root,path)),path);assert.ok(path.endsWith('.webp'));
  }
  function move(){const p=art.player.position.clone();game.key('w');tick(2);game.key('w','keyup');assert.ok(p.distanceTo(art.player.position)>.001);}
  function openPanelData(id){art.player.position.copy(art.panelApproach);tap('e');assert.ok(game.opened.at(-1).endsWith('/pojian/reviews/demo-data-stage4.html?room='+id));assert.ok(art.player.visible);move();}
  openPanelData('home');
  art.player.position.copy(art.exitTarget);tap('e');drain();assert.ok(art.forest.visible);
  for(const hut of art.huts){
    art.player.position.copy(hut.doorTarget);tap('e');drain();assert.ok(art.interior.visible);openPanelData(hut.id);
    art.player.position.copy(art.exitTarget);tap('e');drain();assert.ok(art.forest.visible);
  }
  find('#map-button').click();assert.equal(find('#map-panel').hidden,false);tap('Escape');move();
  find('#data-button').click();doc.querySelector('[data-page="history"]').click();doc.querySelector('[data-room-id="hill"]').click();assert.ok(game.opened.at(-1).endsWith('room=hill'));assert.ok(art.forest.visible);move();
  w.open=()=>null;art.player.position.copy(art.ownDoorTarget);tap('e');drain();art.player.position.copy(art.panelApproach);tap('e');assert.equal(find('#link-fallback').hidden,false);tap('Escape');move();
  find('#settings-button').click();find('#task-toggle').click();tap('Escape');assert.equal(find('#task-panel').hidden,true);
  assert.equal(JSON.parse(game.storage.get('pojian.save')).explored.length,3);
  game.reconfigure({url:'file:///workspace/pojian/'+page});
  w.open=()=>({opener:w,location:{replace:url=>game.opened.push(url)}});
  art.player.position.copy(art.panelApproach);tap('e');assert.equal(game.opened.at(-1),'file:///workspace/pojian/reviews/demo-data-stage4.html?room=home');
  for(const value of [w.PojianBasePath,w.PojianReleaseBase])assert.ok(!value.startsWith('/'));
  game.close();
}
assert.ok(existsSync(resolve(root,'.nojekyll')));
console.log('Release OK: root + independent review, model/sign revision, three visits, link targets/fallback, map/settings/save, pixel-exact icon paths, frozen hashes and geometry/DOM performance budgets.');
