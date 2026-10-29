import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const dom=new JSDOM('<body><main></main><dialog id="dialog"><div id="dialog-body"></div></dialog><div id="toast" hidden></div></body>',{url:'http://localhost/la-academia/#admin/colaboradores'});
for(const key of ['window','document','location','FormData','Event','CustomEvent','AbortController'])globalThis[key]=dom.window[key];
window.HTMLElement.prototype.scrollIntoView=function(){};
window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
window.HTMLDialogElement.prototype.close=function(){if(this.open){this.removeAttribute('open');this.dispatchEvent(new Event('close'));}};
const sites=[{id:1,name:'Breña',active:1},{id:2,name:'Callao',active:1}];
let people=[{dni:'00123456',name:'José <Especial>',job_title:'Supervisor',site_id:1,site_name:'Breña',active:1,revision:'a'.repeat(64)},{dni:'00123457',name:'Persona Inactiva',job_title:'Operaciones',site_id:2,site_name:'Callao',active:0,revision:'b'.repeat(64)}];
const calls=[];let failNext=false,previewResolve=null,delayPreview=false;
const preview={total:2,created:1,updated:1,sites:2,site_totals:[{name:'Breña',total:1},{name:'Callao',total:1}],defaulted:1,reactivated:1,linked_accounts:1,transfer_count:1,transfers:[{dni:'00123456',name:'José <Especial>',from_site_id:1,to_site:'Callao'}],sample:[{dni:'00123456',name:'José <Especial>',site_name:'Callao',action:'Actualizar',uses_default:false}],preview_token:'c'.repeat(64)};
globalThis.fetch=async(url,options={})=>{
  const path=new URL(url).pathname.split('/api/v1/')[1],data=options.body instanceof FormData?Object.fromEntries(options.body):options.body?JSON.parse(options.body):null;
  calls.push({path,data,method:options.method});
  let result;
  if(path==='session')result={user:{id:1,role:'superadmin'},csrf:'test-csrf'};
  else if(options.method==='GET'&&path==='admin/personnel')result=structuredClone(people);
  else if(path==='admin/sites')result=structuredClone(sites);
  else{
    assert.equal(options.headers['X-CSRF-Token'],'test-csrf');
    if(failNext){failNext=false;return {ok:false,status:409,json:async()=>({error:{message:'Conflicto: actualiza el directorio.'}})};}
    if(path==='admin/personnel'){people.push({...data,site_name:sites.find(site=>site.id===Number(data.site_id)).name,revision:'d'.repeat(64)});result={dni:data.dni};}
    else if(path==='admin/personnel/update'){const person=people.find(person=>person.dni===data.dni);assert.equal(data.revision,person.revision);Object.assign(person,data,{revision:'e'.repeat(64),site_name:sites.find(site=>site.id===Number(data.site_id)).name});result={dni:data.dni};}
    else if(path==='admin/personnel/delete'){const person=people.find(person=>person.dni===data.dni);assert.equal(data.revision,person.revision);person.active=0;person.revision='f'.repeat(64);result={dni:data.dni,active:0};}
    else if(path==='admin/personnel/preview'){assert(options.body instanceof FormData);if(delayPreview)await new Promise(resolve=>previewResolve=resolve);result=preview;}
    else if(path==='admin/personnel/import'){assert.equal(data.preview_token,preview.preview_token);assert.equal(data.file.name,'personal.csv');result=preview;}
    else throw Error(path);
  }
  return {ok:true,json:async()=>({data:result})};
};
const flush=async()=>{for(let i=0;i<90;i++)await Promise.resolve();};
const {personnelPage}=await import('../public/frontend/pages/admin-personnel.js');
const page=await personnelPage(),root=document.querySelector('main');root.innerHTML=page.html;const cleanup=page.mount(root);
const search=root.querySelector('#personnel-search'),filter=root.querySelector('#personnel-filter');
const change=(control,value,type='input')=>{control.value=value;control.dispatchEvent(new Event(type,{bubbles:true}));};
const submit=form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
const writes=()=>calls.filter(call=>call.method==='POST'&&!call.path.endsWith('/preview'));
const decide=async(accept=true)=>{assert(document.querySelector('.ui-confirm'),'Every write requires confirmation');document.querySelector(`.ui-confirm [data-${accept?'confirm':'cancel'}]`).click();await flush();};
assert.equal(root.querySelector('.personnel-bulk>summary').textContent,'Carga masiva');
assert.equal(root.querySelector('#personnel-import').elements.site_id.value,'','No automatic Breña selection');
assert(root.querySelector('#personnel-search-results').hidden);
change(search,'jose');assert.match(root.querySelector('[data-person-rows]').textContent,/José <Especial>/);assert.equal(root.querySelector('especial'),null,'Names escaped');
for(const button of root.querySelectorAll('.personnel-row-actions button')){assert(button.querySelector('svg'));assert.equal(button.textContent.trim(),'');assert(button.getAttribute('aria-label'));assert.equal(button.title,button.getAttribute('aria-label'));}
root.querySelector('[data-edit-person="00123456"]').click();let form=document.querySelector('#personnel-form');assert(form.elements.dni.readOnly);assert.equal(form.elements.site_id.value,'1');
change(form.elements.name,'José Actualizado');change(form.elements.site_id,'2','change');submit(form);await flush();
assert.equal(writes().length,0);assert.match(document.querySelector('.ui-confirm').textContent,/00123456.*Supervisor.*Callao/);await decide(false);assert.equal(writes().length,0);assert.equal(form.elements.name.value,'José Actualizado');submit(form);await flush();await decide();
assert.equal(people[0].site_id,'2');assert.equal(search.value,'jose');assert.match(root.querySelector('[data-person-rows]').textContent,/Callao/);assert.equal(writes().at(-1).path,'admin/personnel/update');assert(!document.querySelector('#dialog').open);
change(search,'00998877');assert.match(root.querySelector('[data-person-count]').textContent,/No se encontraron/);root.querySelector('#new-person').click();form=document.querySelector('#personnel-form');assert.equal(form.elements.dni.value,'00998877');
let before=writes().length;submit(form);await flush();assert.equal(writes().length,before,'Empty required fields prevent create');
change(form.elements.name,'Nueva Persona');change(form.elements.job_title,'Operaciones');change(form.elements.site_id,'1','change');submit(form);submit(form);await flush();assert.equal(writes().length,before);await decide(false);assert.equal(writes().length,before);submit(form);submit(form);await flush();await decide();assert.equal(writes().length,before+1,'Double submit is blocked');assert.equal(people.length,3);assert.equal(search.value,'00998877');
root.querySelector('[data-edit-person="00998877"]').click();form=document.querySelector('#personnel-form');assert(form.querySelector('[data-remove-person] svg'),'Delete available inside editor');change(form.elements.name,'Cambio Rechazado');failNext=true;submit(form);await flush();await decide();assert(document.querySelector('#dialog').open);assert.match(form.querySelector('[data-action-error]').textContent,/Conflicto/);assert.equal(form.elements.name.value,'Cambio Rechazado');form.querySelector('[data-cancel-person]').click();
let remove=root.querySelector('[data-remove-person="00998877"]');before=writes().length;remove.click();await flush();document.querySelector('.ui-confirm [data-cancel]').click();await flush();assert.equal(writes().length,before,'Cancel never deletes');
remove.click();await flush();await decide();assert.equal(people[2].active,0);assert.equal(root.querySelector('[data-remove-person="00998877"]'),null);assert.match(root.querySelector('[data-edit-person="00998877"]').getAttribute('aria-label'),/reactivar/);
root.querySelector('[data-edit-person="00998877"]').click();form=document.querySelector('#personnel-form');change(form.elements.active,'1','change');submit(form);await flush();await decide();assert.equal(people[2].active,'1');
root.querySelector('[data-site-workers="2"]').click();let localSearch=document.querySelector('#personnel-site-search');change(localSearch,'inactiva');document.querySelector('#dialog [data-edit-person="00123457"]').click();form=document.querySelector('#personnel-form');change(form.elements.active,'1','change');submit(form);await flush();await decide();assert.equal(document.querySelector('#personnel-site-search').value,'inactiva','Directory retains local search after edit');assert.equal(document.querySelectorAll('#dialog [data-person-rows] tr').length,1);document.querySelector('#personnel-site-add').click();assert.equal(document.querySelector('#personnel-form').elements.site_id.value,'2','New worker uses explicit directory site');document.querySelector('[data-cancel-person]').click();document.querySelector('#dialog').close();
const importForm=root.querySelector('#personnel-import'),file=new window.File(['DNI,NOMBRE COMPLETO,CARGO,SEDE'],'personal.csv',{type:'text/csv'});
Object.defineProperty(importForm.elements.file,'files',{value:[file]});Object.defineProperty(importForm.elements.file,'value',{get:()=> 'C:/fakepath/personal.csv'});importForm.elements.file.required=false;
before=writes().length;submit(importForm);await flush();assert.equal(writes().length,before,'Preview never imports');assert.match(root.querySelector('#personnel-import-result').textContent,/Breña → Callao/);assert.match(root.querySelector('#personnel-import-result').textContent,/reactivarán 1/);assert.equal(root.querySelector('especial'),null);
change(importForm.elements.site_id,'2','change');assert.equal(root.querySelector('#personnel-import-confirm'),null,'Changing default invalidates preview');
delayPreview=true;submit(importForm);await flush();change(importForm.elements.site_id,'1','change');previewResolve();await flush();assert.equal(root.querySelector('#personnel-import-confirm'),null,'Late preview cannot restore stale confirmation');delayPreview=false;
submit(importForm);await flush();root.querySelector('#personnel-import-cancel').click();assert.equal(root.querySelector('#personnel-import-confirm'),null);assert.equal(writes().length,before);
submit(importForm);await flush();root.querySelector('#personnel-import-confirm').click();await flush();assert.equal(writes().length,before);assert.match(document.querySelector('.ui-confirm').textContent,/1 accesos de capacitador/);await decide(false);assert.equal(writes().length,before);root.querySelector('#personnel-import-confirm').click();await flush();await decide();assert.equal(writes().at(-1).path,'admin/personnel/import');assert.match(root.querySelector('#personnel-import-result').textContent,/Carga completada/);
change(search,'');change(filter,'2','change');assert.equal(root.querySelectorAll('[data-person-rows] tr').length,2);assert.equal(filter.value,'2');
const readsBefore=calls.filter(call=>call.path==='admin/personnel'&&call.method==='GET').length;root.querySelector('#personnel-refresh').click();await flush();assert.equal(calls.filter(call=>call.path==='admin/personnel'&&call.method==='GET').length,readsBefore+1);assert.equal(filter.value,'2','Refreshing preserves site filter');
change(filter,'','change');change(search,'00998877');root.querySelector('[data-edit-person="00998877"]').click();document.querySelector('#personnel-form [data-remove-person]').click();await flush();await decide();assert(!document.querySelector('#dialog').open,'Deleting from editor closes editor');assert.equal(people[2].active,0);
cleanup();const {toast}=await import('../public/frontend/components/ui.js?v=20261029-10');clearTimeout(toast.timer);dom.window.close();
console.log('OK colaboradores: búsqueda global y por sede, alta, edición, baja, reactivación, errores, concurrencia UI y revisión masiva separada.');
