import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<body><main></main><div id="toast" hidden></div></body>',{url:'http://localhost/la-academia/#politicas'});
for(const key of ['window','document','location','FormData','Event','CustomEvent','AbortController'])globalThis[key]=dom.window[key];
window.HTMLElement.prototype.scrollIntoView=function(){};
window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new Event('close'));};
const policies=Array.from({length:8},(_,i)=>({id:i+1,title:`Política ${i+1}`,description:i===7?'Prevención especial de seguridad.':'Descripción de política institucional.',file_id:i+10,original_name:'Política.pdf',extension:'pdf',size:1024,active:1,updated_at:'2026-10-30 08:00:00'}));
policies[0].title='Política <segura>';
const requests=[];let fail=false;
globalThis.fetch=async(url,options={})=>{
 const path=new URL(url).pathname.split('/api/v1/')[1],data=options.body instanceof FormData?Object.fromEntries(options.body):options.body?JSON.parse(options.body):null;requests.push({path,method:options.method,data});
 let result;if(path==='session')result={user:{id:1,role:'capacitador'},csrf:'synthetic'};
 else if(path==='policies'||path==='admin/policies'&&options.method==='GET')result=policies;
 else if(path==='admin/materials/options')result={document_max_bytes:50*1024*1024};
 else if(path==='admin/sites')result=[{id:1,name:'Sede sintética',active:1}];
 else if(path==='policies/1'||path==='admin/policies/1'&&options.method==='GET')result=policies[0];
 else if(path==='admin/policies'||path==='admin/policies/1'){
  if(fail){fail=false;return {ok:false,status:422,json:async()=>({error:{message:'No se pudo guardar el PDF.'}})};}
  result=options.method==='DELETE'?{deleted:true}:{...policies[0],...data};
 }else throw Error(path);
 return {ok:true,json:async()=>({data:structuredClone(result)})};
};
const {policiesPage,policyPage,policyEditor}=await import('../public/frontend/pages/policies.js');
const root=document.querySelector('main'),flush=async()=>{for(let i=0;i<100;i++)await Promise.resolve();};
let page=await policiesPage();root.innerHTML=page.html;page.mount(root);
assert.equal(root.querySelectorAll('.policy-card').length,6);assert(!root.querySelector('segura'));assert(root.querySelector('a[href*="download=1"]'));
root.querySelector('[data-page-next]').click();assert.equal(root.querySelectorAll('.policy-card').length,2);
const search=root.querySelector('[data-policy-search]');search.value='prevencion';search.dispatchEvent(new Event('input'));assert.equal(root.querySelectorAll('.policy-card').length,1);assert.match(root.querySelector('.policy-card').textContent,/Política 8/);assert(!requests.some(r=>r.method==='POST'),'Browsing never registers training views');
page=await policyPage(1);root.innerHTML=page.html;let cleanup=page.mount(root);assert.match(root.querySelector('iframe').src,/files\/10/);assert.equal(root.querySelector('.viewer h2').textContent,'Documento');assert(!root.querySelector('[data-course-view-count]'));root.querySelector('iframe').dispatchEvent(new Event('load'));await flush();assert(!requests.some(r=>r.path.endsWith('/view')));cleanup();assert(!document.querySelector('.material-lightbox'));
page=await policyEditor('nueva',{role:'superadmin'});root.innerHTML=page.html;cleanup=page.mount(root);let form=root.querySelector('form');assert.equal(form.elements.site_id.value,'1');assert(form.elements.file.required);
form.elements.title.value='Política nueva';form.elements.description.value='Descripción para el documento nuevo.';
function selectFile(name,size=100){const file=new window.File(['%PDF-1.4'],name,{type:'application/pdf'});Object.defineProperty(file,'size',{value:size});Object.defineProperty(form.elements.file,'files',{configurable:true,value:[file]});Object.defineProperty(form.elements.file,'value',{configurable:true,get:()=>`C:/fakepath/${name}`});form.elements.file.required=false;form.elements.file.dispatchEvent(new Event('change',{bubbles:true}));}
selectFile('imagen.png');form.dispatchEvent(new Event('submit',{cancelable:true}));await flush();assert(!document.querySelector('.ui-confirm'));assert(form.elements.file.hasAttribute('aria-invalid'));
selectFile('grande.pdf',50*1024*1024+1);form.dispatchEvent(new Event('submit',{cancelable:true}));await flush();assert(form.elements.file.hasAttribute('aria-invalid'));
selectFile('valido.pdf');form.dispatchEvent(new Event('submit',{cancelable:true}));assert(document.querySelector('.ui-confirm'));document.querySelector('[data-cancel]').click();await flush();assert(!requests.some(r=>r.path==='admin/policies'&&r.method==='POST'));
fail=true;form.dispatchEvent(new Event('submit',{cancelable:true}));document.querySelector('[data-confirm]').click();await flush();assert(!form.elements.file.disabled);assert.equal(form.elements.file.files[0].name,'valido.pdf');
form.dispatchEvent(new Event('submit',{cancelable:true}));form.dispatchEvent(new Event('submit',{cancelable:true}));assert.equal(document.querySelectorAll('.ui-confirm').length,1);document.querySelector('[data-confirm]').click();await flush();assert.equal(location.hash,'#admin/politicas');assert.equal(requests.filter(r=>r.path==='admin/policies'&&r.method==='POST').length,2);cleanup();
page=await policyEditor(1,{role:'capacitador'});root.innerHTML=page.html;cleanup=page.mount(root);form=root.querySelector('form');assert(!form.elements.file.required);assert(form.querySelector('[type=submit]').disabled);form.elements.description.value='Descripción actualizada sin reemplazar PDF.';form.dispatchEvent(new Event('input',{bubbles:true}));assert(!form.querySelector('[type=submit]').disabled);form.dispatchEvent(new Event('submit',{cancelable:true}));document.querySelector('[data-confirm]').click();await flush();assert(!('file' in requests.at(-1).data),'Text-only edit keeps the existing PDF');
root.querySelector('[data-delete-policy]').click();document.querySelector('[data-cancel]').click();await flush();assert(!requests.some(r=>r.method==='DELETE'));
root.querySelector('[data-delete-policy]').click();document.querySelector('[data-confirm]').click();await flush();assert.equal(requests.at(-1).method,'DELETE');cleanup();
dom.window.close();console.log('OK Políticas DOM: búsqueda, paginación, escape, visor, descarga, creación, límite PDF, edición sin archivo, confirmaciones, fallos y limpieza.');
