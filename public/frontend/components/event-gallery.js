import {recordContentView} from './content-views.js?v=20261030-9';
import {previousIcon,nextIcon,closeIcon} from './gallery-icons.js?v=20261030-9';
import {escape,date,icon} from './common.js?v=20261030-9';
import {fileUrl} from '../api.js?v=20261030-9';
function swipe(target,move,signal){let start=null;
 target.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')start={x:event.clientX,y:event.clientY};},{signal});
 target.addEventListener('pointerup',event=>{if(!start)return;const dx=event.clientX-start.x,dy=event.clientY-start.y;start=null;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5)move(dx<0?1:-1);},{signal});
 target.addEventListener('pointercancel',()=>start=null,{signal});
}
export function showEventGallery(event,initial=0,{admin=false}={}){
 document.querySelector('#event-lightbox')?.close();
 const images=event.images||[],trigger=document.activeElement,dialog=document.createElement('dialog'),controller=new AbortController();
 const detailHash=`#${admin?'admin/':''}eventos/${event.id}`,returnHash=location.hash===detailHash?`#${admin?'admin/':''}eventos`:location.hash;
 history.replaceState(null,'',detailHash);dialog.id='event-lightbox';dialog.className='event-publication-viewer';dialog.setAttribute('aria-labelledby','gallery-title');
 dialog.innerHTML=`<header class="publication-header"><div><h2 id="gallery-title">${escape(event.title)}</h2><div class="publication-meta">${event.category?`<span>${escape(event.category)}</span>`:''}<time datetime="${escape(event.starts_at.replace(' ','T')+'-05:00')}">${date(event.starts_at)} · ${escape(event.starts_at.slice(11,16))}</time></div></div><button type="button" class="publication-close" aria-label="Cerrar galería" title="Cerrar galería">${closeIcon}</button></header><div class="publication-layout"><div class="publication-visual"><div class="publication-stage" aria-busy="false">${images.length?`<div class="publication-image-state"><p data-gallery-message role="status">Cargando foto…</p><button type="button" class="button white" data-gallery-retry hidden>${icon('refresh')} Reintentar</button></div>`:`<div class="event-placeholder">${icon('image')}<p>Galería no disponible.</p></div>`}<button type="button" class="post-arrow previous" data-gallery-prev aria-label="Foto anterior" title="Foto anterior" ${images.length<2?'hidden':''}>${previousIcon}</button><button type="button" class="post-arrow next" data-gallery-next aria-label="Foto siguiente" title="Foto siguiente" ${images.length<2?'hidden':''}>${nextIcon}</button></div>${images.length>1?`<nav class="publication-thumbnails" aria-label="Fotos del evento">${images.map((image,index)=>`<button type="button" data-gallery-index="${index}" aria-label="Ver foto ${index+1}"><img src="${fileUrl(image.id)}" alt="" loading="lazy"></button>`).join('')}</nav>`:''}<p class="sr-only" data-gallery-status aria-live="polite" aria-atomic="true"></p></div><section class="publication-copy" aria-label="Información del evento"><h3>Acerca del evento</h3><p class="post-location">${escape(event.location)}</p><p class="publication-description">${escape(event.description)}</p></section></div>`;
 let selected=Math.max(0,Math.min(Number.isFinite(Number(initial))?Math.trunc(Number(initial)):0,images.length-1)),disposed=false,releasePhoto=()=>{};
 const stage=dialog.querySelector('.publication-stage'),state=dialog.querySelector('.publication-image-state'),retry=dialog.querySelector('[data-gallery-retry]');
 function render(){
  if(disposed||!images.length)return;releasePhoto();
  const photo=document.createElement('img');photo.id='gallery-photo';photo.alt=`${event.title} · Foto ${selected+1}`;photo.decoding='async';
  stage.setAttribute('aria-busy','true');state.hidden=false;retry.hidden=true;state.querySelector('[data-gallery-message]').textContent='Cargando foto…';
  const active=()=>!disposed&&stage.querySelector('#gallery-photo')===photo;
  const loaded=()=>{if(!active())return;releasePhoto();stage.setAttribute('aria-busy','false');state.hidden=true;photo.classList.add('is-ready');};
  const failed=()=>{if(!active())return;releasePhoto();stage.setAttribute('aria-busy','false');state.querySelector('[data-gallery-message]').textContent='No se pudo cargar la foto.';retry.hidden=false;};
  releasePhoto=()=>{photo.removeEventListener('load',loaded);photo.removeEventListener('error',failed);};
  photo.addEventListener('load',loaded,{once:true});photo.addEventListener('error',failed,{once:true});
  const previous=stage.querySelector('#gallery-photo');if(previous)previous.replaceWith(photo);else stage.prepend(photo);
  photo.src=fileUrl(images[selected].id);if(photo.complete&&photo.naturalWidth)loaded();
  dialog.querySelector('[data-gallery-status]').textContent=`Foto ${selected+1} de ${images.length}`;
  dialog.querySelectorAll('[data-gallery-index]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.galleryIndex)===selected)));
  dialog.querySelector('[data-gallery-index][aria-pressed="true"]')?.scrollIntoView?.({block:'nearest',inline:'nearest',behavior:'instant'});
 }
 const move=step=>{if(images.length<2)return;selected=(selected+step+images.length)%images.length;render();};
 dialog.querySelector('.publication-close').addEventListener('click',()=>dialog.close());
 dialog.querySelector('[data-gallery-prev]').addEventListener('click',()=>move(-1));dialog.querySelector('[data-gallery-next]').addEventListener('click',()=>move(1));
 retry?.addEventListener('click',render);
 dialog.querySelectorAll('[data-gallery-index]').forEach(button=>button.addEventListener('click',()=>{selected=Number(button.dataset.galleryIndex);render();}));
 dialog.addEventListener('keydown',key=>{
  if(!images.length||!['ArrowLeft','ArrowRight','Home','End'].includes(key.key))return;key.preventDefault();
  if(key.key==='Home'||key.key==='End'){selected=key.key==='Home'?0:images.length-1;render();}else move(key.key==='ArrowLeft'?-1:1);
 });
 dialog.addEventListener('click',click=>{if(click.target!==dialog)return;const rect=dialog.getBoundingClientRect();if(click.clientX<rect.left||click.clientX>rect.right||click.clientY<rect.top||click.clientY>rect.bottom)dialog.close();});
 swipe(stage,move,controller.signal);
 dialog.addEventListener('close',()=>{disposed=true;releasePhoto();controller.abort();dialog.remove();document.body.classList.remove('event-viewer-open');if(location.hash===detailHash)history.replaceState(null,'',returnHash||'#eventos');if(trigger?.isConnected)trigger.focus({preventScroll:true});},{once:true});
 document.body.append(dialog);document.body.classList.add('event-viewer-open');dialog.showModal();render();dialog.querySelector('.publication-close').focus();if(!admin)recordContentView('event',event.id);
 return dialog;
}
export function mountEventGallery(root,events,{admin=false}={}){
 let suppressClickUntil=0,openedDialog=null;
 const controller=new AbortController(),grid=root.querySelector('.event-grid');if(!grid)return ()=>{};
 const itemFor=element=>events.find(item=>String(item.id)===element.closest('[data-event-post]')?.dataset.eventPost);
 function select(post,item,index){const images=item.images||[];if(!images.length)return;const current=(index+images.length)%images.length,media=post.querySelector('.post-media');media.dataset.photoIndex=String(current);const img=media.querySelector('img');img.src=fileUrl(images[current].id);img.alt=`${item.title} · Imagen ${current+1}`;post.querySelectorAll('[data-post-index]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.postIndex)===current)));}
 grid.addEventListener('click',event=>{
  const button=event.target.closest('[data-open-gallery],[data-post-step],[data-post-index]');if(!button)return;
  if(button.tagName==='A'&&(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0))return;
  if(Date.now()<suppressClickUntil){event.preventDefault();return;}
  const item=itemFor(button);if(!item)return;const post=button.closest('[data-event-post]'),index=Number(post.querySelector('.post-media').dataset.photoIndex);
  if(button.hasAttribute('data-open-gallery')){event.preventDefault();openedDialog=showEventGallery(item,button.hasAttribute('data-gallery-start')?Number(button.dataset.galleryStart):index,{admin});}
  else select(post,item,button.hasAttribute('data-post-index')?Number(button.dataset.postIndex):index+Number(button.dataset.postStep));
 },{signal:controller.signal});
 let start=null;
 grid.addEventListener('pointerdown',event=>{const post=event.target.closest('[data-event-post]');if(admin&&event.pointerType==='touch'&&event.target.closest('.post-media')&&post)start={x:event.clientX,y:event.clientY,post};},{signal:controller.signal});
 grid.addEventListener('pointerup',event=>{if(!start)return;const {x,y,post}=start;start=null;const dx=event.clientX-x,dy=event.clientY-y;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5){suppressClickUntil=Date.now()+400;const item=itemFor(post);if(item)select(post,item,Number(post.querySelector('.post-media').dataset.photoIndex)+(dx<0?1:-1));}},{signal:controller.signal});
 grid.addEventListener('pointercancel',()=>start=null,{signal:controller.signal});
 return ()=>{controller.abort();openedDialog?.close();};
}
