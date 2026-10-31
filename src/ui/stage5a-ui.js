/* DOM HUD. Only plain layout/view data crosses this boundary; no Three.js access. */
(() => {
  'use strict';
  const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  window.PojianStage5UI = {mount({document:doc,config,store,houses,bounds,paths,view,onInputReset,onOpenData,onDoorChange}) {
    const $=selector=>doc.querySelector(selector), icon=(name,cls='')=>`<img class="${cls}" src="${escape(config.iconRoot+config.icons[name])}" alt="" draggable="false">`;
    let left=null,right=null,popover=null,stack=[],lastMap=0;
    const panels={map:$('#map-panel'),profile:$('#profile-panel'),history:$('#history-panel'),friends:$('#friends-panel'),settings:$('#settings-panel'),messages:$('#messages-panel'),weather:$('#weather-popover'),data:$('#data-popover')};
    const buttonIds={map:'map-button',profile:'data-button',history:'data-button',friends:'data-button',settings:'settings-button',messages:'messages-button',weather:'weather-button',data:'data-button'};
    function clearInput(){onInputReset();}
    function remember(kind,name){stack=stack.filter(x=>x.kind!==kind);stack.push({kind,name});}
    function sync() {
      for(const [name,panel] of Object.entries(panels))panel.hidden=![left,right,popover].includes(name);
      $('#task-panel').hidden=!!left||!store.state.ui.tasksVisible;
      for(const name of ['map','settings','messages','weather','data'])$('#'+buttonIds[name]).setAttribute('aria-expanded',String([left,right,popover].includes(name)||(name==='data'&&['profile','history','friends'].includes(left))));
      $('#tasks-button').setAttribute('aria-pressed',String(!left&&store.state.ui.tasksVisible));
      $('#task-toggle').setAttribute('aria-checked',String(store.state.ui.tasksVisible));
      $('#task-state').textContent=store.state.ui.tasksVisible?'显示':'隐藏';
    }
    function close(kind,focus=true){
      const name=kind==='left'?left:kind==='right'?right:popover;
      if(kind==='left')left=null;else if(kind==='right')right=null;else popover=null;
      stack=stack.filter(x=>x.kind!==kind);clearInput();sync();
      if(focus&&name)$('#'+buttonIds[name]).focus();
    }
    function show(kind,name){
      if((kind==='left'?left:kind==='right'?right:popover)===name){close(kind);return;}
      if(kind!=='popover'&&popover)close('popover',false);
      if(kind==='left')left=name;else if(kind==='right')right=name;else popover=name;
      remember(kind,name);clearInput();
      if(name==='messages')store.readMessages();
      refresh();sync();
      const heading=panels[name].querySelector('h2');if(heading)heading.focus();
      if(name==='map')updateMap(true);
    }
    for(const name of ['map','weather','data','messages','settings'])$('#'+buttonIds[name]).addEventListener('click',()=>show(name==='map'?'left':['settings','messages'].includes(name)?'right':'popover',name));
    doc.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>close(button.dataset.close)));
    doc.querySelectorAll('[data-page]').forEach(button=>button.addEventListener('click',()=>{
      close('popover',false);
      if(left!==button.dataset.page)show('left',button.dataset.page);
      else panels[left].querySelector('h2').focus();
    }));
    doc.addEventListener('pointerdown',event=>{
      if(popover&&!event.target.closest('.popover,.hud-nav'))close('popover',false);
    });
    function toggleTasks(){
      store.setTasks(!store.state.ui.tasksVisible);clearInput();sync();
    }
    $('#tasks-button').addEventListener('click',()=>{
      if(popover)close('popover',false);
      if(left){store.setTasks(true);close('left',false);sync();}
      else toggleTasks();
    });
    $('#task-toggle').addEventListener('click',toggleTasks);
    $('#own-door-toggle').addEventListener('click',()=>{store.setDoor(!store.state.doorOpen);onDoorChange(store.state.doorOpen);refresh();});
    $('#history-list').addEventListener('click',event=>{
      const button=event.target.closest('[data-room-id]');if(!button||button.disabled)return;
      const roomId=button.dataset.roomId;if(!store.state.explored.includes(roomId))return;
      closeAll();onOpenData({roomId,source:'history'});
    });
    function closeAll(){left=right=popover=null;stack=[];clearInput();sync();}
    function escapeTop(){const top=stack.at(-1);if(!top)return false;close(top.kind);return true;}
    function refresh() {
      const state=store.state;
      $('#own-door-toggle').setAttribute('aria-checked',String(state.doorOpen));
      $('#door-state').textContent=state.doorOpen?'欢迎来坐':'今日歇息';
      $('#preference-note').textContent=store.persistent?'当前是单人世界，拜访偏好会保留。关门后，你依然可以回家。':'当前浏览器无法保存偏好，本次更改仅在当前页面保留。关门后，你依然可以回家。';
      $('#profile-content').innerHTML=`${icon('profile','portrait')}<h3>${escape(config.profile.name)}</h3><p class="muted">一只正在探索茧林的刺猬</p><div class="tag-row">${config.profile.tags.map(t=>`<span>${escape(t)}</span>`).join('')}</div><p class="fine">示例喜好 · 可在后续版本自定义</p><div class="profile-stat"><b>${state.explored.length}</b><span>位邻居已拜访</span></div><div class="empty-small">${icon('badge')}<span>徽章收藏<br><small>下一阶段开放任务奖励</small></span></div>`;
      $('#history-list').innerHTML=houses.filter(h=>h.id!=='home').map(h=>{
        const seen=state.explored.includes(h.id);
        return `<article class="history-card" style="--accent:${escape(h.color)}"><div class="history-title">${icon('history')}<div><h3>${escape(h.name)}</h3><small>${escape(h.themeTitle)}</small></div><span class="visit-status">${seen?'已拜访':'未拜访'}</span></div><p>${escape(h.sound)}</p><button type="button" class="primary" data-room-id="${escape(h.id)}" ${seen?'':'disabled'}>${seen?'打开数据页 ↗':'尚未拜访'}</button></article>`;
      }).join('');
      const unread=state.messages.filter(m=>!m.read).length;
      $('#message-dot').hidden=unread===0;$('#message-dot').textContent=String(unread);
      $('#messages-button').setAttribute('aria-label',unread?`系统消息，${unread} 条未读`:'系统消息，无未读');
      $('#message-list').innerHTML=state.messages.length?state.messages.slice().reverse().map(m=>`<article class="message-card">${icon(config.icons[m.icon]?m.icon:'messages')}<div><h3>${escape(m.title)}</h3><p>${escape(m.body)}</p>${m.at?`<small>${escape(new Date(m.at).toLocaleString('zh-CN'))}</small>`:''}</div></article>`).join(''):`<div class="empty-state">${icon('messages')}<h3>风还没捎来消息</h3><p>这里会收下你的探索动态与任务奖励。</p></div>`;
      sync();
    }
    // Read actual rendered centerlines, transformed once by the runtime.
    const pad=1.7,minX=bounds.minX-pad,maxX=bounds.maxX+pad,minZ=bounds.minZ-pad,maxZ=bounds.maxZ+pad;
    const px=x=>14+(x-minX)/(maxX-minX)*292,py=z=>12+(z-minZ)/(maxZ-minZ)*250;
    $('#map-routes').innerHTML=paths.map(points=>`<polyline points="${points.map(([x,z])=>`${px(x).toFixed(2)},${py(z).toFixed(2)}`).join(' ')}"/>`).join('');
    $('#map-houses').innerHTML=houses.map(h=>`<g class="map-house" data-map-house="${escape(h.id)}" tabindex="0" role="img" aria-label="${escape(h.name)}"><title>${escape(h.name)}</title><circle cx="${px(h.x)}" cy="${py(h.z)}" r="7"/><text x="${px(h.x)}" y="${py(h.z)-12}" text-anchor="middle">${escape(h.name)}</text></g>`).join('');
    function updateMap(force=false,now=0){
      if(left!=='map'||(!force&&now-lastMap<85))return;lastMap=now;
      const v=view(),house=houses.find(h=>h.id===(v.mode==='home'?'home':v.roomId));
      const position=v.mode==='forest'?v.position:house;
      $('#map-player').setAttribute('transform',`translate(${px(position.x)} ${py(position.z)}) rotate(${-v.heading*180/Math.PI})`);
      $('#map-caption').textContent=v.mode==='forest'?'你在林间小路 · 沿小路拜访邻居':`当前在${house.name}（室内）`;
      for(const h of houses){const el=doc.querySelector(`[data-map-house="${h.id}"]`);el.classList.toggle('visited',store.state.explored.includes(h.id));el.classList.toggle('own',h.id==='home');}
    }
    $('#weather-items').innerHTML=config.weather.map((w,i)=>{
      const a=(-90+i*72)*Math.PI/180,x=50+36*Math.cos(a),y=50+36*Math.sin(a);
      return `<div class="weather-item ${i===0?'current':'future'}" style="left:${x}%;top:${y}%">${icon(w.id)}<span>${escape(w.label)}${i===0?' · 当前':''}</span></div>`;
    }).join('');
    doc.querySelectorAll('[data-icon]').forEach(el=>{el.src=config.iconRoot+config.icons[el.dataset.icon];});
    refresh();
    return {refresh,updateMap,closeAll,escapeTop,blocksScene:()=>!!(left||right||popover)};
  }};
})();
