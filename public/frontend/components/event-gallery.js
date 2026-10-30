import {recordContentView} from './content-views.js?v=20261030-8';
import {previousIcon,nextIcon,closeIcon} from './gallery-icons.js?v=20261030-8';
import {escape,date} from './common.js?v=20261030-8';
import {fileUrl} from '../api.js?v=20261030-8';
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
 dialog.innerHTML=`<button type="button" class="publication-close" aria-label="Cerrar publicación">${closeIcon}</button><div class="publication-layout"><div class="publication-visual"><div class="publication-stage">${images.length?'<img id="gallery-photo" alt="">':'<div class="event-placeholder">La Academia</div>'}${images.length?`<span class="publication-counter" aria-live="polite"><span data-gallery-current>1</span> / ${images.length}</span>`:''}<button type="button" class="post-arrow previous" data-gallery-prev aria-label="Imagen anterior" ${images.length<2?'hidden':''}>${previousIcon}</button><button type="button" class="post-arrow next" data-gallery-next aria-label="Imagen siguiente" ${images.length<2?'hidden':''}>${nextIcon}</button></div>${images.length>1?`<nav class="publication-thumbnails" aria-label="Imágenes del evento">${images.map((image,index)=>`<button type="button" data-gallery-index="${index}" aria-label="Ver imagen ${index+1}"><img src="${fileUrl(image.id)}" alt="" loading="lazy"></button>`).join('')}</nav>`:''}</div><section class="publication-copy"><span class="eyebrow">${escape([event.category,'LA ACADEMIA'].filter(Boolean).join(' · '))}</span><h2 id="gallery-title">${escape(event.title)}</h2><p class="post-location">${date(event.starts_at)} · ${escape(event.starts_at.slice(11,16))}<br>${escape(event.location)}</p><p class="publication-description">${escape(event.description)}</p>${images.length>1?'<p class="publication-help">Selecciona una miniatura o usa las flechas para recorrer la galería.</p>':''}</section></div>`;
 let selected=Math.max(0,Math.min(initial,images.length-1));
 function render(){if(!images.length)return;const photo=images[selected];dialog.querySelector('#gallery-photo').src=fileUrl(photo.id);dialog.querySelector('#gallery-photo').alt=`${event.title} · Imagen ${selected+1}`;dialog.querySelector('[data-gallery-current]').textContent=String(selected+1);dialog.querySelectorAll('[data-gallery-index]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.galleryIndex)===selected)));}
 const move=step=>{if(images.length<2)return;selected=(selected+step+images.length)%images.length;render();};
 dialog.querySelector('.publication-close').addEventListener('click',()=>dialog.close());
 dialog.querySelector('[data-gallery-prev]').addEventListener('click',()=>move(-1));dialog.querySelector('[data-gallery-next]').addEventListener('click',()=>move(1));
 dialog.querySelectorAll('[data-gallery-index]').forEach(button=>button.addEventListener('click',()=>{selected=Number(button.dataset.galleryIndex);render();}));
 dialog.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();move(event.key==='ArrowLeft'?-1:1);}});
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();});
 swipe(dialog.querySelector('.publication-stage'),move,controller.signal);
 dialog.addEventListener('close',()=>{controller.abort();dialog.remove();document.body.classList.remove('event-viewer-open');if(location.hash===detailHash)history.replaceState(null,'',returnHash||'#eventos');if(trigger?.isConnected)trigger.focus({preventScroll:true});},{once:true});
 document.body.append(dialog);document.body.classList.add('event-viewer-open');render();dialog.showModal();dialog.querySelector('.publication-close').focus();if(!admin)recordContentView('event',event.id);
}
export function mountEventGallery(root,events,{admin=false}={}){
 let suppressClickUntil=0;
 const controller=new AbortController(),grid=root.querySelector('.event-grid');if(!grid)return ()=>{};
 const itemFor=element=>events.find(item=>String(item.id)===element.closest('[data-event-post]')?.dataset.eventPost);
 function select(post,item,index){const images=item.images||[];if(!images.length)return;const current=(index+images.length)%images.length,media=post.querySelector('.post-media');media.dataset.photoIndex=String(current);const img=media.querySelector('img');img.src=fileUrl(images[current].id);img.alt=`${item.title} · Imagen ${current+1}`;post.querySelectorAll('[data-post-index]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.postIndex)===current)));}
 grid.addEventListener('click',event=>{
  const button=event.target.closest('[data-open-gallery],[data-post-step],[data-post-index]');if(!button)return;
  if(Date.now()<suppressClickUntil){event.preventDefault();return;}
  const item=itemFor(button);if(!item)return;const post=button.closest('[data-event-post]'),index=Number(post.querySelector('.post-media').dataset.photoIndex);
  if(button.hasAttribute('data-open-gallery'))showEventGallery(item,index,{admin});
  else select(post,item,button.hasAttribute('data-post-index')?Number(button.dataset.postIndex):index+Number(button.dataset.postStep));
 },{signal:controller.signal});
 let start=null;
 grid.addEventListener('pointerdown',event=>{const post=event.target.closest('[data-event-post]');if(event.pointerType==='touch'&&event.target.closest('.post-media')&&post)start={x:event.clientX,y:event.clientY,post};},{signal:controller.signal});
 grid.addEventListener('pointerup',event=>{if(!start)return;const {x,y,post}=start;start=null;const dx=event.clientX-x,dy=event.clientY-y;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5){suppressClickUntil=Date.now()+400;const item=itemFor(post);if(item)select(post,item,Number(post.querySelector('.post-media').dataset.photoIndex)+(dx<0?1:-1));}},{signal:controller.signal});
 grid.addEventListener('pointercancel',()=>start=null,{signal:controller.signal});
 return ()=>controller.abort();
}
