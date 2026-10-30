import {query,fileUrl,previewUrl} from '../api.js?v=20261030-1';
import {escape,icon} from './common.js?v=20261030-1';
import {motion,screens} from '../design/runtime.js?v=20261030-1';
const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const searchIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>';
export function mountPublicHeader(){
 const header=document.querySelector('.header'),root=document.querySelector('#public-search');
 if(!header||!root)return ()=>{};
 root.innerHTML=`<button type="button" class="search-toggle" aria-label="Buscar capacitaciones y eventos" aria-expanded="false" aria-controls="public-search-panel">${searchIcon}</button><div class="public-search-panel" id="public-search-panel"><form role="search" aria-label="Capacitaciones y eventos"><label class="public-search-field">${searchIcon}<span class="sr-only">Buscar capacitaciones y eventos</span><input type="search" id="public-search-input" placeholder="Buscar capacitaciones y eventos" autocomplete="off" aria-controls="public-search-results" aria-expanded="false"></label></form><div class="public-search-results" id="public-search-results" hidden><p class="search-status" role="status" aria-live="polite"></p><div class="search-matches"></div></div></div>`;
 const input=root.querySelector('input'),toggle=root.querySelector('.search-toggle'),results=root.querySelector('.public-search-results'),status=root.querySelector('.search-status'),matches=root.querySelector('.search-matches');
 const listeners=new AbortController(),on=(node,type,handler,options={})=>node.addEventListener(type,handler,{...options,signal:listeners.signal});
 let timer,sequence=0,cache=null,pending=null,loadedAt=0,disposed=false,logoAnimation=null,restoringFocus=false;
 function close(returnFocus=false){clearTimeout(timer);sequence++;results.hidden=true;input.setAttribute('aria-expanded','false');root.classList.remove('is-open');toggle.setAttribute('aria-expanded','false');if(returnFocus){restoringFocus=true;if(window.matchMedia?.(`(max-width: ${screens.wide}px)`).matches)toggle.focus();else input.focus();restoringFocus=false;}}
 function silence(){results.hidden=true;input.setAttribute('aria-expanded','false');status.textContent='';matches.replaceChildren();}
 function announce(text){status.classList.remove('sr-only');results.hidden=false;input.setAttribute('aria-expanded','true');status.textContent=text;matches.replaceChildren();}
 async function load(){
  if(cache&&Date.now()-loadedAt<30000)return cache;
  if(!pending)pending=Promise.all([query('content','list'),query('admin','events.public')]).then(([courses,events])=>{
   cache=[{label:'Capacitaciones',route:'curso',items:courses},{label:'Eventos',route:'eventos',items:events}];loadedAt=Date.now();return cache;
  }).finally(()=>{pending=null;});
  return pending;
 }
 async function search(){
  const term=normalize(input.value),ticket=++sequence;
  if(term.length<2){silence();return;}
  announce('Buscando…');
  try{
   const groups=await load();if(disposed||ticket!==sequence)return;
   const words=term.split(/\s+/),filtered=groups.map(group=>({...group,items:group.items.filter(item=>{const text=normalize(`${item.title} ${item.category??''} ${item.description??''}`);return words.every(word=>text.includes(word));})}));
   const count=filtered.reduce((n,group)=>n+group.items.length,0);
   status.classList.toggle('sr-only',count>0);
   status.textContent=count?`${count} ${count===1?'resultado':'resultados'}`:'No encontramos coincidencias. Prueba otro título o categoría.';
   matches.innerHTML=filtered.filter(group=>group.items.length).map(group=>`<section class="search-group" data-kind="${group.route}" aria-label="${group.label}"><div class="search-group-heading"><h2>${group.label}</h2><span>${group.items.length}</span></div>${group.items.map(item=>{
    const source=group.route==='curso'?(item.custom_cover_id?fileUrl(item.custom_cover_id):item.cover_status==='ready'&&item.cover_file_id?previewUrl(item.cover_file_id,item.cover_version):''):item.images?.[0]?.id?fileUrl(item.images[0].id):'';
    return `<a href="#${group.route}/${Number(item.id)}"><span class="search-result-media" aria-hidden="true">${icon(group.route==='curso'?'book':'calendar')}${source?`<img class="search-thumbnail" src="${escape(source)}" alt="" loading="lazy">`:''}</span><span class="search-result-copy"><strong>${escape(item.title)}</strong><small>${escape(item.category??'')}</small></span><span class="search-result-next" aria-hidden="true">${icon('next')}</span></a>`;
   }).join('')}</section>`).join('');
  }catch{if(ticket===sequence&&!disposed){announce('No se pudo cargar la búsqueda.');matches.innerHTML='<button class="button white small" type="button" data-search-retry>Reintentar</button>';}}
 }
 on(input,'input',()=>{clearTimeout(timer);sequence++;if(normalize(input.value).length<2){silence();return;}announce('Buscando…');timer=setTimeout(search,motion.fast);});
 on(input,'focus',()=>{if(restoringFocus||!results.hidden)return;search();});
 on(root.querySelector('form'),'submit',event=>{event.preventDefault();clearTimeout(timer);search();});
 on(toggle,'click',()=>{if(root.classList.contains('is-open'))close();else{root.classList.add('is-open');toggle.setAttribute('aria-expanded','true');input.focus();}});
 on(root,'click',event=>{if(event.target.closest('[data-search-retry]'))search();if(event.target.closest('.search-matches a'))close();});
 on(root,'keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();close(true);return;}
  if(!['ArrowDown','ArrowUp'].includes(event.key)||results.hidden)return;
  const links=[...matches.querySelectorAll('a')];if(!links.length)return;event.preventDefault();const index=links.indexOf(document.activeElement);
  if(event.key==='ArrowUp'&&index===0){input.focus();return;}
  links[event.key==='ArrowDown'?(index+1)%links.length:index<0?links.length-1:Math.max(0,index-1)].focus();
 });
 on(root,'error',event=>{if(event.target.matches?.('.search-thumbnail'))event.target.hidden=true;},{capture:true});
 on(root,'focusout',event=>{if(!root.contains(event.relatedTarget))close();});
 on(document,'pointerdown',event=>{if(!root.contains(event.target))close();});
 on(window,'hashchange',()=>close());
 on(window,'academia-activity-updated',()=>{cache=null;loadedAt=0;close();});
 on(window,'academia-session-expired',()=>{cache=null;close();});
 const syncScroll=()=>header.classList.toggle('header-is-scrolled',window.scrollY>24);
 on(window,'scroll',syncScroll,{passive:true});syncScroll();
 const brand=header.querySelector('.brand');
 on(brand,'click',()=>{if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||!brand.animate)return;logoAnimation?.cancel();logoAnimation=brand.animate([{transform:'scale(1) rotate(0deg)'},{transform:'scale(1.045) rotate(-2deg)',offset:.35},{transform:'scale(1) rotate(0deg)'}],{duration:motion.normal*2,easing:'ease-out'});});
 return ()=>{disposed=true;close();logoAnimation?.cancel();listeners.abort();header.classList.remove('header-is-scrolled');root.replaceChildren();};
}
