import {query,previewUrl,fileUrl} from '../api.js?v=20261030-4';
import {escape,icon} from './common.js?v=20261030-4';
export function courseCoverUrl(course){
 return course.custom_cover_id?fileUrl(course.custom_cover_id):course.cover_file_id&&course.cover_status==='ready'?previewUrl(course.cover_file_id,course.cover_version):'';
}
export function courseCover(course){
 if(course.custom_cover_id)return `<div class="document-cover"><img src="${fileUrl(course.custom_cover_id)}" alt="Portada de ${escape(course.title)}" loading="lazy"></div>`;
 const id=course.cover_file_id,status=course.cover_status;
 return `<div class="document-cover" data-cover-title="${escape(course.title)}" ${id?`data-cover-file="${id}"`:''} ${['queued','processing'].includes(status)?'data-cover-pending':''}>${status==='ready'?`<img src="${courseCoverUrl(course)}" alt="Portada de ${escape(course.title)}" loading="lazy">`:`<div class="document-cover-placeholder"><span aria-hidden="true">${icon('book')}</span>${['queued','processing'].includes(status)?'<small>Preparando portada…</small>':status==='failed'?'<small>Portada no disponible</small>':''}</div>`}</div>`;
}
export function mountCourseCovers(root){
 let disposed=false,timer,round=0;
 const pending=[...root.querySelectorAll('[data-cover-pending]')];
 async function update(){
  if(disposed||!pending.length)return;
  if(!document.hidden){
   await Promise.all(pending.filter(element=>element.hasAttribute('data-cover-pending')).map(async element=>{
    try{const state=await query('content','preview.status',{id:element.dataset.coverFile});if(disposed||!element.isConnected)return;
     if(state.status==='ready'){element.innerHTML=`<img src="${previewUrl(element.dataset.coverFile,state.source_hash)}" alt="Portada de ${escape(element.dataset.coverTitle||'la capacitación')}" loading="lazy">`;element.removeAttribute('data-cover-pending');}
     else if(state.status==='failed'){element.querySelector('small').textContent='Portada no disponible';element.removeAttribute('data-cover-pending');}
    }catch{}
   }));round++;
  }
  if(!disposed&&round<60&&pending.some(element=>element.hasAttribute('data-cover-pending')))timer=setTimeout(update,5000);
 }
 if(pending.length)timer=setTimeout(update,1500);
 return ()=>{disposed=true;clearTimeout(timer);};
}
