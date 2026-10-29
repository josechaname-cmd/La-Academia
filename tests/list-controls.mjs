import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {coursesPage} from '../public/frontend/pages/admin-courses.js';
import {eventsPage} from '../public/frontend/pages/admin-events.js';
import {usersPage,sitesPage,personnelPage} from '../public/frontend/pages/admin-access.js';
import {reportsPage} from '../public/frontend/pages/admin-reports.js';

const dom=new JSDOM('<body><main></main><dialog id="dialog"><button class="close">Cerrar</button><div id="dialog-body"></div></dialog><div id="toast" hidden></div></body>',{url:'http://localhost/la-academia/#admin',pretendToBeVisual:true});
for(const key of ['window','document','location','history','FormData','Event','CustomEvent','AbortController'])globalThis[key]=dom.window[key];
globalThis.matchMedia=()=>({matches:true});
window.HTMLElement.prototype.scrollIntoView=function(){};
window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
window.HTMLDialogElement.prototype.close=function(){if(this.open){this.open=false;this.dispatchEvent(new Event('close'));}};
const courses=Array.from({length:23},(_,i)=>({id:i+1,title:`Capacitación ${i+1}`,category:'Seguridad',status:'published',material_count:1}));
const events=Array.from({length:15},(_,i)=>({id:i+1,title:`Inducción ${i+1}`,category:'Seguridad',location:'Lima',starts_at:'2026-10-29 12:00:00',description:'Evento de prueba',images:[],active:1}));
const sites=Array.from({length:25},(_,i)=>({id:i+1,name:`Sede ${i+1}`,address:'Lima',active:1,users:1,employees:1}));
const users=Array.from({length:43},(_,i)=>({id:i+1,name:`José ${i+1}`,email:`user${i+1}@example.invalid`,role:'capacitador',job_title:'Supervisor',active:1,site_id:1,site_name:'Sede 1'}));
const people=Array.from({length:105},(_,i)=>({dni:String(i+1).padStart(8,'0'),name:`José ${i+1}`,job_title:'Supervisor',active:1,site_id:1,site_name:'Sede 1',revision:'a'.repeat(64)}));
let results=Array.from({length:45},(_,i)=>({name:`José ${i+1}`,dni:String(i+1).padStart(8,'0'),job_title:'Supervisor',title:'Curso de prueba',version:1,score:12,attempts:1,submitted_at:'2026-10-29 12:00:00'}));
let calls=0;
globalThis.fetch=async(url,options={})=>{
  calls++;assert.equal(options.method,'GET','List interactions must never write data');
  const path=new URL(url).pathname.split('/api/v1/')[1];
  const data={'admin/courses':courses,'admin/events':events,'categories':['Seguridad'],'admin/users':users,'admin/sites':sites,'admin/personnel':people,'admin/reports/results':results,'admin/reports/exams':[{id:1,title:'Curso de prueba',version:1,state:'open'}]}[path];
  assert.notEqual(data,undefined,path);return {ok:true,json:async()=>({data:structuredClone(data)})};
};
const root=document.querySelector('main'),flush=async()=>{for(let i=0;i<70;i++)await Promise.resolve();};
const mount=page=>{root.innerHTML=page.html;return page.mount(root)||(()=>{});};
const input=(node,value,type='input')=>{node.value=value;node.dispatchEvent(new Event(type,{bubbles:true}));};
const next=scope=>scope.querySelector('[data-page-next]');
const visibleRows=scope=>[...scope.querySelectorAll('tbody tr')].filter(row=>!row.hidden);

let dispose=mount(await coursesPage());let before=calls;const found=[];
do{found.push(...[...root.querySelectorAll('.training-card-cover')].map(link=>link.hash));if(next(root).disabled)break;next(root).click();}while(true);
assert.equal(found.length,23);assert.equal(new Set(found).size,23,'Every course is reachable exactly once');assert.equal(calls,before);assert.equal(document.activeElement.dataset.pageLabel,'');
input(root.querySelector('#admin-search'),' capacitacion 23 ');assert.equal(root.querySelectorAll('.training-card').length,1);assert.match(root.querySelector('[data-page-label]').textContent,/1 de 1/);dispose();

dispose=mount(await eventsPage(()=>{},'15'));assert(root.querySelector('#evento-15'));assert.equal(root.querySelectorAll('.event-post').length,3);assert(document.querySelector('#event-lightbox'));document.querySelector('#event-lightbox').close();
before=calls;input(root.querySelector('#event-search'),'induccion 1');assert.equal(root.querySelectorAll('.event-post').length,6);assert.equal(calls,before);next(root).click();assert.equal(root.querySelectorAll('.event-post').length,1);dispose();

dispose=mount(await usersPage(()=>{},{id:1}));assert.equal(visibleRows(root).length,20);next(root).click();next(root).click();assert.equal(visibleRows(root).length,3);
input(root.querySelector('[data-table-search]'),' jose 43 ');assert.equal(visibleRows(root).length,1);assert.match(visibleRows(root)[0].textContent,/José 43/);dispose();
dispose=mount(await sitesPage(()=>{}));next(root).click();assert.equal(visibleRows(root).length,5);input(root.querySelector('[data-table-search]'),'inexistente');assert(!root.querySelector('[data-table-empty]').hidden);assert(root.querySelector('.table-scroll').hidden);dispose();

dispose=mount(await personnelPage());input(root.querySelector('#personnel-filter'),'1','change');const directory=root.querySelector('#personnel-search-results');before=calls;
for(let i=0;i<5;i++)next(directory).click();assert.equal(visibleRows(directory).length,5);assert.match(directory.textContent,/José 105/);assert.equal(calls,before,'Workers after the former 100-row cutoff remain reachable locally');
directory.querySelector('[data-edit-person="00000105"]').click();assert.equal(document.querySelector('#personnel-form').elements.name.value,'José 105');assert.equal(document.activeElement.name,'name','Editing focuses an editable field instead of read-only DNI');document.querySelector('#dialog').close();
input(root.querySelector('#personnel-search'),'jose 105');assert.equal(visibleRows(directory).length,1);assert.match(directory.querySelector('[data-page-label]').textContent,/1 de 1/);dispose();

dispose=mount(await reportsPage('1'));before=calls;assert.equal(visibleRows(root).length,20);next(root).click();next(root).click();assert.equal(visibleRows(root).length,5);
const exportLink=root.querySelector('#export-results').href;input(root.querySelector('#report-search'),'jose 45');assert.equal(visibleRows(root).length,1);assert.equal(root.querySelector('#export-results').href,exportLink,'Excel still exports the complete exam');assert.equal(calls,before);
input(root.querySelector('#report-search'),'');next(root).click();next(root).click();results=results.slice(0,5);window.dispatchEvent(new Event('academia-activity-updated'));await flush();assert.equal(visibleRows(root).length,5);assert.match(root.querySelector('[data-page-label]').textContent,/1 de 1/,'Refresh clamps a removed last page');dispose();
dom.window.close();
console.log('OK listados UX: 6/20 por página, últimos registros accesibles, tildes, filtros, notificación a evento fuera de la primera página, foco y exportación completa.');
