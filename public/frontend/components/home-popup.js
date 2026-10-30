import {fileUrl} from '../api.js?v=20261030-5';
import {escape,icon} from './ui.js?v=20261030-5';
import {isExternalLink} from './public-link.js?v=20261030-5';
const isHome=()=>['','#inicio'].includes(window.location.hash);
export const isExternalPopupLink=isExternalLink;
export function popupContent(item,source,{interactive=true}={}){
  const title=String(item.title||'').trim(),href=String(item.link_url||''),external=isExternalPopupLink(href),safe=external||/^#(?:curso|eventos)\/[1-9][0-9]*$/.test(href);
  const format=['landscape','square'].includes(item.image_format)?item.image_format:'original',focus=['top','bottom','left','right'].includes(item.image_focus)?item.image_focus:'center';
  const image=`<img data-format="${format}" data-focus="${focus}" class="home-popup-image" src="${escape(source)}" alt="${escape(title||'Anuncio de La Academia')}">`;
  const media=href&&safe&&interactive?`<a class="home-popup-image-link" href="${escape(href)}" aria-label="${escape(item.link_label||title||'Abrir anuncio')}${external?' (abre en otra pestaña)':''}" ${external?'target="_blank" rel="noopener noreferrer"':''}>${image}</a>`:image;
  return `${media}${title?`<div class="home-popup-content"><h2 ${interactive?'id="home-popup-title"':''}>${escape(title)}</h2></div>`:''}`;
}
export function showHomePopup(item,{preview=false,imageSrc=''}={}){
  const source=preview&&imageSrc.startsWith('blob:')?imageSrc:item?.image_id?fileUrl(item.image_id):'';
  if(!source||(!preview&&(!Number(item.active)||!isHome())))return ()=>{};
  if(document.querySelector('dialog[open]'))return ()=>{};
  const trigger=document.activeElement,dialog=document.createElement('dialog');dialog.className='home-popup';const title=String(item.title||'').trim();if(title)dialog.setAttribute('aria-labelledby','home-popup-title');else dialog.setAttribute('aria-label','Anuncio de La Academia');
  dialog.dataset.size=item.display_size==='compact'?'compact':'standard';
  dialog.innerHTML=`<button class="button white home-popup-close" type="button" aria-label="${preview?'Volver a editar':'Cerrar anuncio'}">${icon('close')}</button>${popupContent(item,source)}`;
  let disposed=false;
  function dispose(){if(disposed)return;disposed=true;window.removeEventListener('hashchange',leave);dialog.remove();document.body.classList.remove('home-popup-open');if(trigger?.isConnected)trigger.focus({preventScroll:true});}
  function leave(){if(!preview&&!isHome())dialog.close();}
  dialog.querySelector('button').addEventListener('click',()=>dialog.close());
  dialog.querySelector('a')?.addEventListener('click',event=>{if(preview){event.preventDefault();return;}dialog.close();});
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
  dialog.addEventListener('close',dispose,{once:true});
  dialog.querySelector('img').addEventListener('error',()=>dialog.close(),{once:true});
  document.body.append(dialog);dialog.showModal();document.body.classList.add('home-popup-open');dialog.querySelector('button').focus();window.addEventListener('hashchange',leave);
  return dispose;
}
