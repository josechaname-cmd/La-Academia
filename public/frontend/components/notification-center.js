import {escape,date,icon} from './common.js?v=20261029-10';
import {query,invalidateNavigationCache} from '../api.js?v=20261029-10';
export const bellIcon=icon('bell');
import {activityReadState} from './activity-read-state.js?v=20261029-10';
export function activityItemsHtml(items){
  return items.length?items.map(item=>`<a class="notification-item unread" href="${escape(item.href)}" data-open-activity="${item.id}"><span class="notice-icon">${bellIcon}</span><div><strong>${escape(item.title)}</strong><p>${escape(item.body)}</p><small>${date(item.created_at)}</small></div><span class="unread-dot" aria-hidden="true"></span></a>`).join(''):'<div class="notification-empty">Estás al día.<small>No tienes notificaciones pendientes.</small></div>';
}
export function notificationCenter(feed,userId){
  let notices=feed.items||[],unavailable=!!feed.unavailable;
  const read=activityReadState(userId);
  return {html:`<div class="notification-center"><button class="notification-toggle" aria-label="Notificaciones" aria-expanded="false" aria-controls="notification-popover">${bellIcon}<span class="notification-count" hidden></span></button><section id="notification-popover" class="notification-popover" aria-label="Notificaciones" hidden><div class="notification-heading"><div><span class="eyebrow">LA ACADEMIA</span><h2>Notificaciones</h2></div></div><div class="notification-items"></div><p class="notification-sync" role="status">Actualización automática activa</p></section></div>`,mount(navigation){
    const host=navigation.querySelector('.notification-center'),toggle=host.querySelector('.notification-toggle'),popover=host.querySelector('.notification-popover'),sync=host.querySelector('.notification-sync'),controller=new AbortController();
    let timer=null,inFlight=false,disposed=false,failures=0,rendered='';
    const on=(target,event,handler)=>target.addEventListener(event,handler,{signal:controller.signal});
    const close=()=>{popover.hidden=true;toggle.setAttribute('aria-expanded','false');};
    function render(){
      const unread=read.pending(notices),signature=JSON.stringify(unread);
      if(signature!==rendered){host.querySelector('.notification-items').innerHTML=unavailable&&!notices.length?'<div class="notification-empty">Notificaciones no disponibles.<small>Abre este panel para reintentar.</small></div>':activityItemsHtml(unread);rendered=signature;}
      const badge=host.querySelector('.notification-count');
      badge.textContent=unread.length>99?'99+':unread.length;badge.hidden=!unread.length;
      toggle.setAttribute('aria-label',`Notificaciones${unread.length?`, ${unread.length} sin leer`:''}`);
    }
    function schedule(){clearTimeout(timer);if(!disposed&&!document.hidden)timer=setTimeout(()=>update(true),Math.min(120000,30000*2**failures));}
    async function update(background=false){
      if(inFlight||disposed||document.hidden)return;
      inFlight=true;clearTimeout(timer);
      try{
        const latest=await query('admin','notifications.list',{background:background?'1':'0'});
        if(disposed)return;
        notices=latest.items||[];if(unavailable)rendered='';unavailable=false;failures=0;render();sync.classList.remove('error-state');sync.textContent='Actualizado '+new Intl.DateTimeFormat('es-PE',{hour:'2-digit',minute:'2-digit'}).format(new Date());
      }catch(error){
        if(disposed)return;
        if(error.status===401){disposed=true;close();window.dispatchEvent(new Event('academia-session-expired'));return;}
        failures=Math.min(failures+1,2);sync.classList.add('error-state');sync.textContent='No se pudo actualizar. Reintentaremos automáticamente.';
      }finally{inFlight=false;schedule();}
    }
    on(toggle,'click',()=>{popover.hidden=!popover.hidden;toggle.setAttribute('aria-expanded',String(!popover.hidden));if(!popover.hidden)update();});
    on(host,'click',event=>{
      const link=event.target.closest('[data-open-activity]');if(!link)return;
      const item=notices.find(item=>String(item.id)===link.dataset.openActivity);if(!item)return;
      if(!read.mark(item))sync.textContent='Lecturas guardadas solo durante esta visita.';
      render();close();invalidateNavigationCache();
      if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
      event.preventDefault();window.dispatchEvent(new CustomEvent('academia-open-activity',{detail:{href:item.href}}));
    });
    on(document,'click',event=>{if(!host.contains(event.target))close();});
    on(document,'keydown',event=>{if(event.key==='Escape'&&!popover.hidden){close();toggle.focus();}});
    on(document,'visibilitychange',()=>{if(document.hidden)clearTimeout(timer);else update(true);});
    on(window,'storage',event=>{if(event.key===read.key){read.restore(event.newValue);render();}});
    if(unavailable){sync.classList.add('error-state');sync.textContent='No se pudo cargar. Reintentaremos automáticamente.';}
    render();schedule();
    return ()=>{disposed=true;clearTimeout(timer);controller.abort();};
  }};
}
