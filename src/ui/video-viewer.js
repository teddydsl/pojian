/* In-page video playback. Source is assigned only after the nearby E action. */
(() => {
  'use strict';
  window.PojianVideoViewer={create({document:doc,config,resolveSource,onOpen,onClose}){
    const root=doc.querySelector('#media-viewer'),video=doc.querySelector('#media-viewer-video');
    const title=doc.querySelector('#media-viewer-title'),status=doc.querySelector('#media-viewer-status'),closeButton=doc.querySelector('#media-viewer-close');
    let generation=0,previousFocus=null;
    function isOpen(){return !root.hidden;}
    function close(){
      if(!isOpen())return;
      generation++;video.pause();video.removeAttribute('src');video.load();root.hidden=true;
      onClose();if(previousFocus?.isConnected)previousFocus.focus();previousFocus=null;
    }
    function open(id){
      const item=config.videos.find(v=>v.id===id);if(!item||isOpen())return false;
      const source=resolveSource(item);if(!source)return false;
      const ticket=++generation;previousFocus=doc.activeElement;
      title.textContent=item.label;status.textContent='按 Esc 或关闭按钮返回茧房。';
      video.src=source;root.hidden=false;onOpen();closeButton.focus();
      // Called synchronously from the E/click gesture; controls remain available
      // if the browser refuses autoplay or playback cannot start yet.
      try{
        const attempt=video.play();
        attempt?.catch(()=>{if(ticket===generation&&isOpen())status.textContent='点击视频内的播放按钮开始观看；按 Esc 返回茧房。';});
      }catch{status.textContent='点击视频内的播放按钮开始观看；按 Esc 返回茧房。';}
      return true;
    }
    closeButton.addEventListener('click',close);
    root.addEventListener('click',event=>{if(event.target===root)close();});
    video.addEventListener('error',()=>{if(isOpen())status.textContent='视频暂时未能加载。可关闭后重新按 E 打开，或检查视频文件是否完整。';});
    doc.addEventListener('keydown',event=>{
      if(!isOpen()||event.key!=='Tab')return;
      const first=closeButton,last=video;
      if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first.focus();}
      else if(!root.contains(doc.activeElement)){event.preventDefault();first.focus();}
    });
    return {open,close,isOpen};
  }};
})();
