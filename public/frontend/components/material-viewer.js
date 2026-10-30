import {query,fileUrl,previewUrl} from '../api.js?v=20261030-8';
import {escape,errorBox,icon} from './common.js?v=20261030-8';
import {viewCountLabel} from './content-views.js?v=20261030-8';
import {isVideo,materialDuration} from './material-upload.js?v=20261030-8';
import {courseCoverUrl} from './course-cover.js?v=20261030-8';
const expandIcon='<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 9 3 3 M3 8V3h5 M15 9l6-6 M16 3h5v5 M9 15l-6 6 M3 16v5h5 M15 15l6 6 M16 21h5v-5"/></svg>';
export function materialViewer(files,{viewCount=null,customCoverId=null,title='Materiales'}={}){
 const html=`<section class="panel viewer"><div class="panel-heading viewer-heading"><h2>${escape(title)}</h2>${viewCount!==null?`<span class="course-view-count" role="status">${icon('eye')}<span data-course-view-count>${viewCountLabel(viewCount)}</span></span>`:''}</div><div class="material-toolbar"><div class="tabs" role="tablist" aria-label="Materiales">${files.map((file,index)=>`<button type="button" role="tab" id="material-tab-${file.id}" data-material="${file.id}" aria-controls="material-stage" tabindex="${index===0?0:-1}" aria-selected="${index===0}" aria-label="${escape(file.original_name)}">${escape(file.extension.toUpperCase())} · ${index+1}</button>`).join('')}</div><button type="button" class="button white material-expand" data-expand-material disabled aria-label="Preparando vista ampliada" title="Preparando vista ampliada">${expandIcon}</button></div><div id="material-stage" class="material-stage" role="tabpanel" tabindex="0"></div><div class="material-footer" ${files.length?'':'hidden'}><span id="material-name"></span><a id="material-download">Descargar original ↓</a></div></section>`;
 return {html,mount(root,{onOpen=()=>{}}={}){let generation=0,timer,disposed=false,opened=false,activeSource='',activeTitle='',selectedFile=null;const stage=root.querySelector('#material-stage'),expand=root.querySelector('[data-expand-material]');
  function notifyOpen(current=generation){if(disposed||opened||current!==generation)return;opened=true;Promise.resolve(onOpen(selectedFile)).then(result=>{if(result===null)opened=false;}).catch(()=>{opened=false;});}
  function watchFrame(frame,current){frame.addEventListener('load',()=>{if(frame.isConnected&&frame.getAttribute('src')!=='about:blank')notifyOpen(current);},{once:true});}
  root.querySelector('#material-download').addEventListener('click',()=>{if(selectedFile&&!isVideo(selectedFile))notifyOpen();});
  function releaseVideo(){for(const video of stage.querySelectorAll('video')){video.pause();video.removeAttribute('src');video.load();}}
  const dialog=document.createElement('dialog');dialog.className='material-lightbox';dialog.setAttribute('aria-labelledby','material-lightbox-title');document.body.append(dialog);
  function labelExpand(label){expand.setAttribute('aria-label',label);expand.title=label;}
  function enableExpand(source,title,extension){activeSource=source;activeTitle=title;expand.disabled=false;labelExpand(extension==='pdf'?'Ver PDF en grande':'Ver documento en grande');}
  function openLarge(){
   if(!activeSource||disposed)return;
   dialog.innerHTML=`<div class="material-lightbox-shell"><header><div><span class="eyebrow">DOCUMENTO</span><h2 id="material-lightbox-title">${escape(activeTitle)}</h2></div><button type="button" class="material-lightbox-close" aria-label="Cerrar visor ampliado">${icon('close')}</button></header><iframe title="Vista ampliada de ${escape(activeTitle)}" src="${activeSource}"></iframe></div>`;
   watchFrame(dialog.querySelector('iframe'),generation);dialog.querySelector('.material-lightbox-close').addEventListener('click',()=>dialog.close());dialog.showModal();document.body.classList.add('material-lightbox-open');dialog.querySelector('.material-lightbox-close').focus();
  }
  expand.addEventListener('click',openLarge);
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  dialog.addEventListener('close',()=>{document.body.classList.remove('material-lightbox-open');dialog.querySelector('iframe')?.setAttribute('src','about:blank');if(!disposed&&expand.isConnected)expand.focus({preventScroll:true});});
  async function select(file){
   const current=++generation;clearTimeout(timer);if(dialog.open)dialog.close();releaseVideo();selectedFile=file;activeSource='';activeTitle='';expand.disabled=true;expand.hidden=isVideo(file);labelExpand('Preparando vista ampliada');stage.dataset.media=isVideo(file)?'video':'document';
   root.querySelectorAll('[data-material]').forEach(button=>{const selected=String(button.dataset.material)===String(file.id);button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;});
   stage.setAttribute('aria-labelledby',`material-tab-${file.id}`);stage.setAttribute('aria-busy','false');
   root.querySelector('#material-name').textContent=file.original_name;root.querySelector('#material-download').href=fileUrl(file.id,true);
   if(isVideo(file)){
    stage.innerHTML=`<div class="material-video"><video controls playsinline preload="metadata" src="${fileUrl(file.id)}" aria-label="${escape(file.original_name)}"></video><div class="material-video-info"><span>${file.duration_seconds?materialDuration(file.duration_seconds)+' · ':''}${(Number(file.size)/1024/1024).toFixed(1)} MB</span><span>Reproduce el video para comenzar.</span></div><div class="material-video-error" role="alert" hidden><p>No se pudo reproducir el video. Revisa tu conexión o descarga el original.</p><button type="button" class="button white" data-retry-video>Reintentar</button></div></div>`;
    const video=stage.querySelector('video');
    const poster=courseCoverUrl({custom_cover_id:customCoverId});
    if(poster)video.poster=poster;
    video.addEventListener('playing',()=>{if(video.isConnected)notifyOpen(current);});
    video.addEventListener('error',()=>{if(!disposed&&current===generation&&video.getAttribute('src'))stage.querySelector('.material-video-error').hidden=false;});
    stage.querySelector('[data-retry-video]').addEventListener('click',()=>{if(disposed||current!==generation)return;stage.querySelector('.material-video-error').hidden=true;video.load();video.focus();});return;
   }
   if(file.extension==='pdf'){const source=`${fileUrl(file.id)}#page=1&toolbar=1`;stage.innerHTML=`<iframe title="${escape(file.original_name)}" src="${source}"></iframe>`;watchFrame(stage.querySelector('iframe'),current);enableExpand(source,file.original_name,file.extension);return;}
   stage.setAttribute('aria-busy','true');stage.innerHTML='<div class="loading" role="status">Preparando la presentación con su diseño original…</div>';
   async function ready(){try{
    const state=await query('content','preview.status',{id:file.id});if(disposed||current!==generation)return;
    if(state.status==='ready'){stage.setAttribute('aria-busy','false');const source=`${previewUrl(file.id,state.source_hash,true)}#page=1&toolbar=1`;stage.innerHTML=`<iframe title="${escape(file.original_name)}" src="${source}"></iframe>`;watchFrame(stage.querySelector('iframe'),current);enableExpand(source,file.original_name,file.extension);}
    else if(['queued','processing'].includes(state.status))timer=setTimeout(ready,5000);
    else{stage.setAttribute('aria-busy','false');labelExpand('Vista ampliada no disponible');stage.innerHTML='<p class="padded">No se pudo preparar la vista de esta presentación. Puedes descargar el archivo original.</p>';}
   }catch(error){if(!disposed&&current===generation){stage.setAttribute('aria-busy','false');labelExpand('Vista ampliada no disponible');stage.innerHTML=`<div class="padded">${errorBox(error)}<button type="button" class="button white" data-retry-material>Reintentar vista</button></div>`;stage.querySelector('[data-retry-material]').addEventListener('click',()=>{root.querySelector(`[data-material="${file.id}"]`).focus();select(file);});}}}
   ready();
  }
  root.querySelectorAll('[data-material]').forEach(button=>button.addEventListener('click',()=>select(files.find(file=>String(file.id)===button.dataset.material))));
  root.querySelector('[role=tablist]').addEventListener('keydown',event=>{
   const tabs=[...root.querySelectorAll('[data-material]')],index=tabs.indexOf(event.target);if(index<0||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
   event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
   tabs[next].focus();tabs[next].click();
  });
  if(files.length)select(files[0]);else{expand.hidden=true;stage.textContent='No hay material disponible.';}
  return ()=>{disposed=true;generation++;clearTimeout(timer);releaseVideo();if(dialog.open)dialog.close();dialog.remove();document.body.classList.remove('material-lightbox-open');};
 }};
}
