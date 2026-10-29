import {motion} from '../design/runtime.js?v=20261029-10';
import {mountCourseCovers} from '../components/course-cover.js?v=20261029-10';
import {query} from '../api.js?v=20261029-10';
import {heading,optionList,empty,pagination} from '../components/common.js?v=20261029-10';
import {courseCards} from '../components/course-cards.js?v=20261029-10';
import {eventCards} from '../components/events.js?v=20261029-10';
import {mountEventGallery,showEventGallery} from '../components/event-gallery.js?v=20261029-10';
const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const savedCatalog={};
export async function catalogPage(events=false,selectedId=''){
  const saved=savedCatalog[events?'events':'courses']||{category:'',search:'',page:1,scroll:0};
  const [items,categories]=await Promise.all([events?query('admin','events.public'):query('content','list'),query('content','categories.list',{scope:events?'event':'course'})]);
  return {html:`<section class="container section ${events?'events-catalog':'course-catalog'}">${heading(events?'ACTIVIDADES La Academia':'APRENDER PARA CUIDARNOS',events?'Eventos':'Capacitaciones',events?'Encuentra inducciones, encuentros y actividades para el equipo.':'Elige un tema, revisa su material y completa la evaluación.')}<div class="toolbar"><label>Categoría<select id="catalog-category"><option value="">Todas las categorías</option>${optionList(categories)}</select></label><label class="search"><span class="sr-only">Buscar</span><input id="catalog-search" type="search" placeholder="${events?'Buscar un evento':'Buscar por tema o título'}"></label></div><p class="hint" id="catalog-total" aria-live="polite"></p><div class="${events?'event-grid event-feed':'course-grid'}" id="catalog-results"></div>${pagination()}</section>`,mount(root){
    const cleanupGallery=events?mountEventGallery(root,items):()=>{};let cleanupCovers=()=>{},transition=null;
    const filter=root.querySelector('#catalog-category'),search=root.querySelector('#catalog-search'),results=root.querySelector('#catalog-results');let page=saved.page;filter.value=saved.category;search.value=saved.search;
    function render(animate=false){cleanupCovers();transition?.cancel();const matching=items.filter(item=>(!filter.value||item.category===filter.value)&&normalize(`${item.title} ${item.description}`).includes(normalize(search.value)));const pages=Math.max(1,Math.ceil(matching.length/6));page=Math.min(page,pages);const visible=matching.slice((page-1)*6,page*6);results.innerHTML=visible.length?(events?eventCards(visible):courseCards(visible)):empty('No hay resultados para esta búsqueda.');const label=events?(matching.length===1?'evento':'eventos'):(matching.length===1?'capacitación':'capacitaciones');root.querySelector('#catalog-total').textContent=`${matching.length} ${label}`;root.querySelector('#catalog-page').textContent=`${page} / ${pages}`;root.querySelector('#catalog-prev').disabled=page===1;root.querySelector('#catalog-next').disabled=page===pages;root.querySelector('.catalog-pagination').hidden=pages<=1;if(!events)cleanupCovers=mountCourseCovers(root);if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches)transition=results.animate([{opacity:.5},{opacity:1}],{duration:motion.fast,easing:'ease-out'});}
    filter.addEventListener('change',()=>{page=1;render(true);});search.addEventListener('input',()=>{page=1;render(true);});root.querySelector('#catalog-prev').addEventListener('click',()=>{page--;render();results.scrollIntoView({behavior:'smooth',block:'start'});});root.querySelector('#catalog-next').addEventListener('click',()=>{page++;render();results.scrollIntoView({behavior:'smooth',block:'start'});});render();
    if(events&&selectedId){const item=items.find(item=>String(item.id)===selectedId);if(item)showEventGallery(item);else results.insertAdjacentHTML('afterbegin','<p class="notice">El evento ya no está disponible.</p>');}
    else if(saved.scroll)window.scrollTo({top:saved.scroll,behavior:'instant'});
    return ()=>{savedCatalog[events?'events':'courses']={category:filter.value,search:search.value,page,scroll:window.scrollY};transition?.cancel();cleanupGallery();cleanupCovers();};
  }};
}
