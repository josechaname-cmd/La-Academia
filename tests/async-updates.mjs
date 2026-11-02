import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {sitesPage,usersPage} from '../public/frontend/pages/admin-access.js';
import {eventsPage} from '../public/frontend/pages/admin-events.js';
import {listRefresh} from '../public/frontend/components/list-refresh.js';

const dom=new JSDOM('<body><main tabindex="-1"></main><dialog id="dialog"><div id="dialog-body"></div></dialog><div id="toast" hidden></div></body>',{url:'http://localhost/la-academia/#admin',pretendToBeVisual:true});
for(const key of ['window','document','location','history','FormData','Event','CustomEvent','AbortController'])globalThis[key]=dom.window[key];
window.matchMedia=()=>({matches:true});window.HTMLElement.prototype.scrollIntoView=function(){};
window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};window.HTMLDialogElement.prototype.close=function(){if(this.open){this.open=false;this.dispatchEvent(new Event('close'));}};
let scrolls=0;window.scrollTo=()=>scrolls++;
const root=document.querySelector('main'),flush=async()=>{for(let i=0;i<20;i++)await new Promise(resolve=>setImmediate(resolve));};
let sites=Array.from({length:25},(_,i)=>({id:i+1,name:`Sede ${String(i+1).padStart(2,'0')}`,address:'Lima',active:1,users:0,employees:0}));
let users=Array.from({length:43},(_,i)=>({id:i+1,name:`Persona ${String(i+1).padStart(2,'0')}`,email:`user${i+1}@example.invalid`,role:'superadmin',dni:null,job_title:'Prueba',active:1,site_id:null}));
let events=Array.from({length:13},(_,i)=>({id:i+1,title:`Encuentro ${i+1}`,category:'Seguridad',location:'Lima',starts_at:'2026-11-01 12:00:00',description:'Descripción del evento de prueba',active:1,image_id:1,images:[1,2,3].map(id=>({id,name:`Foto ${id}`}))}));
const calls=[];let failNextSites=false;
globalThis.fetch=async(url,options={})=>{
 const path=new URL(url).pathname.split('/api/v1/')[1],method=options.method||'GET',body=options.body?JSON.parse(options.body):null;calls.push({path,method,body});
 let data;
 if(path==='session')data={csrf:'synthetic',user:users[0]};
 else if(path.startsWith('categories'))data=['Seguridad'];
 else if(path==='admin/personnel')data=[];
 else if(method==='GET'){
  if(path==='admin/sites'&&failNextSites){failNextSites=false;return {ok:false,status:503,json:async()=>({error:{message:'Consulta temporalmente no disponible'}})};}
  data=path==='admin/sites'?sites:path==='admin/users'?users:path==='admin/events'?events:undefined;
 }else{
  const [,kind,id]=path.split('/');let rows=kind==='sites'?sites:kind==='users'?users:kind==='events'?events:null;assert(rows,path);
  if(method==='DELETE')rows.splice(rows.findIndex(row=>String(row.id)===id),1);
  else if(id)Object.assign(rows.find(row=>String(row.id)===id),body);
  else rows.push({...body,id:Math.max(0,...rows.map(row=>row.id))+1});
  data=method==='DELETE'?{deleted:true}:{id:id?Number(id):rows.at(-1).id};
 }
 assert.notEqual(data,undefined,path);return {ok:true,json:async()=>({data:structuredClone(data)})};
};
let reroutes=0,dispose=()=>{};
function mount(page){dispose();root.innerHTML=page.html;dispose=page.mount(root)||(()=>{});}
const input=(control,value)=>{control.value=value;control.dispatchEvent(new Event('input',{bubbles:true}));};
const submit=async form=>{const event=new Event('submit',{bubbles:true,cancelable:true});assert.equal(form.dispatchEvent(event),false,'Native form navigation is prevented');await flush();};
const writes=()=>calls.filter(call=>call.method!=='GET').length;

mount(await sitesPage(()=>reroutes++));
const siteSearch=root.querySelector('[data-table-search]'),table=root.querySelector('table');input(siteSearch,'Sede');root.querySelector('[data-page-next]').click();
root.querySelector('[data-edit-site="21"]').click();let form=document.querySelector('#site-form');input(form.elements.address,'Dirección actualizada');let before=writes();await submit(form);
assert.equal(writes(),before+1);assert.equal(reroutes,0);assert.equal(root.querySelector('table'),table);assert.equal(root.querySelector('[data-table-search]'),siteSearch);assert.equal(siteSearch.value,'Sede');assert.match(root.querySelector('[data-page-label]').textContent,/2 de 2/);assert.match(root.querySelector('[data-edit-site="21"]').closest('tr').textContent,/Dirección actualizada/);
root.querySelector('[data-edit-site="21"]').click();form=document.querySelector('#site-form');assert.equal(form.elements.address.value,'Dirección actualizada','Edit handlers read refreshed data');input(form.elements.address,'Guardado con consulta pendiente');failNextSites=true;before=writes();await submit(form);
const warning=root.querySelector('[data-list-refresh]');assert.equal(warning.hidden,false);assert.match(warning.textContent,/El cambio se guardó/);assert.equal(document.querySelector('#dialog').open,false);
warning.querySelector('button').click();await flush();assert.equal(writes(),before+1,'Retry performs no additional write');assert.equal(warning.hidden,true);assert.match(table.textContent,/Guardado con consulta pendiente/);

mount(await usersPage(()=>reroutes++,users[0]));const userSearch=root.querySelector('[data-table-search]');input(userSearch,'Persona');root.querySelector('[data-page-next]').click();root.querySelector('[data-page-next]').click();
root.querySelector('[data-edit-user="41"]').click();form=document.querySelector('#user-form');input(form.elements.name,'Persona corregida 41');await submit(form);
assert.equal(root.querySelector('[data-table-search]'),userSearch);assert.equal(userSearch.value,'Persona');assert.match(root.querySelector('[data-page-label]').textContent,/3 de 3/);assert.match(root.querySelector('[data-edit-user="41"]').closest('tr').textContent,/Persona corregida 41/);
root.querySelector('[data-edit-user="41"]').click();assert.equal(document.querySelector('#user-form').elements.name.value,'Persona corregida 41');document.querySelector('#dialog').close();

mount(await eventsPage(()=>reroutes++));const eventSearch=root.querySelector('#event-search'),grid=root.querySelector('#admin-events');input(eventSearch,'Encuentro');root.querySelector('[data-page-next]').click();root.querySelector('[data-page-next]').click();
root.querySelector('[data-edit-event="13"]').click();form=document.querySelector('#event-form');input(form.elements.title,'Encuentro actualizado 13');await submit(form);
assert.equal(root.querySelector('#event-search'),eventSearch);assert.equal(root.querySelector('#admin-events'),grid);assert.match(root.querySelector('[data-page-label]').textContent,/3 de 3/);assert.match(grid.textContent,/Encuentro actualizado 13/);
root.querySelector('[data-delete-event="13"]').click();await flush();document.querySelector('.ui-confirm [data-confirm]').click();await flush();assert.match(root.querySelector('[data-page-label]').textContent,/2 de 2/,'Deleting the final item clamps the current page');assert.equal(eventSearch.value,'Encuentro');assert.equal(reroutes,0);assert.equal(scrolls,0,'List saves never reset the viewport');dispose();

// A slow read belonging to an old screen cannot alter the new screen.
root.innerHTML='<h1>Pantalla anterior</h1>';let finish,applied=0;
const update=listRefresh(root,()=>new Promise(resolve=>finish=resolve),()=>applied++);const pending=update.refresh();update.dispose();root.innerHTML='<h1>Nueva pantalla</h1>';finish([]);await pending;assert.equal(applied,0);assert.match(root.textContent,/Nueva pantalla/);

// Overlapping refreshes only apply the latest response.
const finishers=[];const overlap=listRefresh(root,()=>new Promise(resolve=>finishers.push(resolve)),data=>root.querySelector('h1').textContent=data);
const first=overlap.refresh(),second=overlap.refresh();finishers[1]('Más reciente');await second;finishers[0]('Antiguo');await first;assert.equal(root.querySelector('h1').textContent,'Más reciente');overlap.dispose();
dom.window.close();console.log('OK actualizaciones asíncronas: guardar/editar/eliminar sin navegación nativa, filtros y página conservados, reintento de consulta sin duplicar, respuestas tardías y fuera de orden.');
