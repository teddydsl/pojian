/* Versioned save contract. Prior exploration and door preferences survive narrative migration. */
(() => {
  'use strict';
  const KEY = 'pojian.save';
  const object = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  const ids = (v, allowed) => [...new Set(Array.isArray(v) ? v.filter(x => typeof x === 'string' && (!allowed || allowed.includes(x))) : [])];
  const text = (v, max = 300) => typeof v === 'string' ? v.slice(0, max) : '';
  function localDate() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  const storyKeys = ['wander','mapOpened','homeFound','homeEntered','infoOpened','videoOpened','ownLocked','ownUnlocked'];
  function clean(raw, roomIds) {
    const r = object(raw), ui = object(r.ui), collection = object(r.collections), daily = object(collection.daily);
    // The earlier walkthrough marked all three homes explored. Start this revised journey once from zero.
    const currentProgress = r.version === 4;
    const visited = currentProgress ? object(r.visited) : {};
    const story = currentProgress ? object(r.story) : {};
    const pointIds = ['mushroom-1','mushroom-2','mushroom-3','mushroom-4','pinecone-1','pinecone-2','moss-1','moss-2'];
    const messages = [], seen = new Set();
    for (const value of Array.isArray(r.messages) ? r.messages : []) {
      const m = object(value), id = text(m.id,100); if (!id || seen.has(id) || !text(m.title)) continue;
      seen.add(id); messages.push({id, icon:text(m.icon,30), title:text(m.title,100), body:text(m.body,600), at:Number.isFinite(m.at)?m.at:0, read:m.read===true});
    }
    return {
      version: 4, migration: {legacyImported:true}, explored: currentProgress ? ids(r.explored,roomIds) : [],
      visited:Object.fromEntries(roomIds.map(id=>[id,Number.isSafeInteger(visited[id])&&visited[id]>=0?visited[id]:0])),
      weather:'clear', doorOpen:r.doorOpen!==false, ui:{tasksVisible:ui.tasksVisible!==false},
      story:Object.fromEntries(storyKeys.map(key=>[key,story[key]===true])),
      quests:object(r.quests), badges:ids(r.badges), listenedRoomIds:ids(r.listenedRoomIds,roomIds), rewardedQuestIds:ids(r.rewardedQuestIds),
      collections:{lifetimePointIds:ids(collection.lifetimePointIds,pointIds),daily:{date:/^\d{4}-\d{2}-\d{2}$/.test(daily.date)?daily.date:localDate(),pointIds:ids(daily.pointIds,pointIds.slice(0,4))}},
      messages:messages.slice(-100)
    };
  }
  window.PojianSave = {key:KEY, create(win,roomIds) {
    let storageOK = true, raw = null;
    const read = key => { try { return win.localStorage.getItem(key); } catch { storageOK=false;return null; } };
    const saved = read(KEY);
    if (saved === null) {
      let explored=[];
      try { explored=JSON.parse(read('pojian.stage3.explored')||'[]'); } catch { /* Keep the independent UI preference. */ }
      raw={explored,ui:{tasksVisible:read('pojian.stage4.tasksVisible')!=='false'}};
    } else { try { raw=JSON.parse(saved); } catch { raw={}; } }
    let state=clean(raw,roomIds);
    function save() { try { win.localStorage.setItem(KEY,JSON.stringify(state));storageOK=true; } catch { storageOK=false; } }
    save();
    return {
      get state(){return state;}, get persistent(){return storageOK;}, save,
      visit(id){if(!roomIds.includes(id))return;if(!state.explored.includes(id))state.explored.push(id);state.visited[id]++;save();},
      setTasks(value){state.ui.tasksVisible=!!value;save();},
      setDoor(value){state.doorOpen=!!value;save();},
      setStory(key){if(!storyKeys.includes(key))return;state.story[key]=true;save();},
      readMessages(){state.messages.forEach(m=>m.read=true);save();},
      resetProgress(){const ui=state.ui,doorOpen=state.doorOpen;state=clean({ui,doorOpen},roomIds);save();}
    };
  }};
})();
