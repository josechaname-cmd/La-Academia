import {query} from '../api.js?v=20261030-9';
import {escape,icon} from './common.js?v=20261030-9';
import {courseCover,mountCourseCovers} from './course-cover.js?v=20261030-9';
import {publishedTime} from './course-cards.js?v=20261030-9';
import {viewCountLabel} from './content-views.js?v=20261030-9';

export function relatedCourses(course){
 return {html:`<aside class="course-related" aria-labelledby="related-courses-title"><div class="course-related-heading"><h2 id="related-courses-title">Sigue aprendiendo</h2><a href="#capacitaciones">Ver todas ${icon('next')}</a></div><div class="course-related-list" data-related-courses aria-busy="true"><p class="course-related-note" role="status">Cargando capacitaciones…</p></div></aside>`,mount(root){
  const host=root.querySelector('.course-related'),list=host.querySelector('[data-related-courses]'),layout=host.closest('.course-detail-grid');
  let disposed=false,loading=false,cleanupCovers=()=>{};
  async function load(){
   if(disposed||loading)return;loading=true;list.setAttribute('aria-busy','true');
   list.innerHTML='<p class="course-related-note" role="status">Cargando capacitaciones…</p>';
   try{
    const rows=await query('content','list');if(disposed||!host.isConnected)return;
    if(!Array.isArray(rows))throw new Error('Invalid course list');
    const category=String(course.category??'').trim().toLocaleLowerCase('es');
    const sameCategory=item=>String(item.category??'').trim().toLocaleLowerCase('es')===category;
    const items=rows.filter(item=>Number(item.id)>0&&Number(item.id)!==Number(course.id)&&(!item.status||item.status==='published')&&(!course.site_id||Number(item.site_id)===Number(course.site_id)))
     .sort((a,b)=>Number(sameCategory(b))-Number(sameCategory(a))).slice(0,4);
    cleanupCovers();host.hidden=!items.length;layout?.classList.toggle('course-detail-grid--single',!items.length);
    list.innerHTML=items.map(item=>`<article class="related-course"><a href="#curso/${Number(item.id)}" aria-label="Ver ${escape(item.title)}"><div class="related-course-cover">${courseCover(item)}</div><div class="related-course-copy"><span class="related-course-category">${escape(item.category)}</span><h3>${escape(item.title)}</h3><p>${escape(item.description)}</p><div class="related-course-meta">${publishedTime(item.published_at??item.created_at)}<span class="course-view-count" role="img" aria-label="${viewCountLabel(item.view_count)}" title="${viewCountLabel(item.view_count)}">${icon('eye')}<span aria-hidden="true">${viewCountLabel(item.view_count,{compact:true})}</span></span></div></div></a></article>`).join('');
    cleanupCovers=mountCourseCovers(list);
   }catch{
    if(!disposed&&host.isConnected)list.innerHTML=`<div class="course-related-note"><p role="status">No se pudieron cargar las otras capacitaciones.</p><button class="button white" type="button" data-related-retry>${icon('refresh')} Reintentar</button></div>`;
   }finally{loading=false;if(!disposed)list.setAttribute('aria-busy','false');}
  }
  const retry=event=>{if(event.target.closest('[data-related-retry]'))void load();};
  list.addEventListener('click',retry);void load();
  return ()=>{disposed=true;cleanupCovers();list.removeEventListener('click',retry);};
 }};
}
