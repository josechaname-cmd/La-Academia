import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<body><main></main><div id="toast" hidden></div></body>',{url:'http://localhost/la-academia/#admin/eventos/slider',pretendToBeVisual:true});
for(const key of ['window','document','Event','CustomEvent','FormData','location','history','AbortController'])globalThis[key]=dom.window[key];
window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};window.HTMLDialogElement.prototype.close=function(){if(this.open){this.open=false;this.dispatchEvent(new Event('close'));}};window.HTMLElement.prototype.scrollIntoView=function(){};
window.matchMedia=()=>({matches:true,addEventListener(){}});window.HTMLElement.prototype.animate=()=>({pause(){},play(){},cancel(){}});
let items=[],writes=0,failAt=0,sequence=0,nextId=1;const revoked=[];
const originalCreate=URL.createObjectURL,originalRevoke=URL.revokeObjectURL;URL.createObjectURL=()=>`blob:slider-${++sequence}`;URL.revokeObjectURL=url=>revoked.push(url);
globalThis.fetch=async(url,options={})=>{
 const path=new URL(url).pathname.split('/api/v1/')[1];let data;
 if(path==='session')data={user:{id:1,role:'superadmin'},csrf:'test'};
 else if(options.method==='GET')data=path==='admin/slider'?structuredClone(items):path==='admin/courses'?[{id:7,title:'Curso publicado',status:'published'}]:path==='admin/events'?[{id:8,title:'Evento publicado',active:1}]:[];
 else{
  writes++;if(writes===failAt)return {ok:false,status:422,json:async()=>({error:{message:'Carga de prueba rechazada'}})};
  const payload=options.body instanceof FormData?Object.fromEntries(options.body):JSON.parse(options.body),id=Number(path.split('/')[2])||nextId++;
  if(options.method==='DELETE'){items=items.filter(item=>item.id!==id);data={deleted:true};}
  else{data={...items.find(item=>item.id===id),...payload,id,image:payload.file?`api/v1/files/${id+100}`:items.find(item=>item.id===id)?.image};items=items.filter(item=>item.id!==id);items.push(data);delete data.file;}
 }
 return {ok:true,json:async()=>({data})};
};
const {sliderPage}=await import('../public/frontend/pages/admin-slider.js');const root=document.querySelector('main'),flush=async()=>{for(let i=0;i<90;i++)await Promise.resolve();};
let page=await sliderPage();root.innerHTML=page.html;let cleanup=page.mount(root),form=root.querySelector('form');
const change=(name,value)=>{form.elements[name].value=value;form.elements[name].dispatchEvent(new Event('change',{bubbles:true}));};
const addFiles=names=>{const input=root.querySelector('#slider-files');Object.defineProperty(input,'files',{configurable:true,value:names.map(name=>new window.File(['png'],name,{type:'image/png'}))});input.dispatchEvent(new Event('change',{bubbles:true}));};
const submit=async(accept=true)=>{form.dispatchEvent(new Event('submit',{cancelable:true}));await flush();const confirm=document.querySelector(accept?'[data-confirm]':'[data-cancel]');if(confirm){confirm.click();await flush();}};
assert(form.hidden);assert(root.querySelector('#slider-save').disabled);assert(root.querySelector('#slider-files').multiple);
addFiles(['uno.png','dos.png']);assert.equal(root.querySelectorAll('[data-select-slide]').length,2);assert.equal(writes,0,'Multi-select prepares drafts without writing');assert(!form.hidden);
change('title','Título <seguro>');change('subtitle','Un texto breve sobre la imagen');change('target_kind','course');change('link_url','#curso/7');
change('font_family','georgia');change('title_color','#ffd43b');change('text_color','#e8ecff');change('title_size','52');change('text_size','22');change('text_align','center');
const caption=root.querySelector('.carousel-copy');assert.equal(caption.dataset.font,'georgia');assert.equal(caption.dataset.align,'center');assert.equal(caption.style.getPropertyValue('--slide-title-color'),'#ffd43b');assert.equal(caption.style.getPropertyValue('--slide-text-color'),'#e8ecff');assert.equal(caption.style.getPropertyValue('--slide-title-size'),'52px');assert.equal(caption.style.getPropertyValue('--slide-text-size'),'22px');
assert.equal(root.querySelector('#slider-preview h2').textContent,'Título <seguro>');assert.equal(root.querySelector('#slider-preview a'),null,'Preview never navigates');assert.equal(root.querySelector('seguro'),null);
root.querySelector('#slider-device').value='mobile';root.querySelector('#slider-device').dispatchEvent(new Event('change'));assert.equal(root.querySelector('#slider-stage').dataset.device,'mobile');
assert.equal(root.querySelector('[data-move]'),null,'Ordering no longer needs before/after buttons');
root.querySelector('[data-drag-slide]').dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));assert.equal(root.querySelectorAll('[data-select-slide]')[1].getAttribute('aria-pressed'),'true');assert.equal(document.activeElement.dataset.dragSlide,'new-1');
// Mouse and touch use pointer capture on the same vertical reorder handle.
const library=root.querySelector('#slider-list');library.setPointerCapture=()=>{};library.hasPointerCapture=()=>false;
window.HTMLElement.prototype.getBoundingClientRect=function(){if(this===library)return {top:0,bottom:150,height:150};const rows=[...library.querySelectorAll('[data-slide-row]')],i=rows.indexOf(this);return {top:i*70,bottom:(i+1)*70,height:70};};
function pointer(target,type,y,pointerType='mouse'){const event=new window.MouseEvent(type,{bubbles:true,cancelable:true,clientY:y,button:0});Object.defineProperties(event,{pointerId:{value:9},pointerType:{value:pointerType}});target.dispatchEvent(event);}
const order=()=>[...library.querySelectorAll('[data-slide-row]')].map(row=>row.dataset.slideRow);
pointer(library.querySelector('[data-drag-slide="new-1"]'),'pointerdown',100);pointer(library,'pointermove',0);assert(library.querySelector('[data-drop=before]'));pointer(library,'pointerup',0);assert.deepEqual(order(),['new-1','new-2']);
pointer(library.querySelector('[data-drag-slide="new-1"]'),'pointerdown',20,'touch');pointer(library,'pointermove',145,'touch');pointer(library,'pointercancel',145,'touch');assert.deepEqual(order(),['new-1','new-2'],'Cancelled touch gesture does not change order');assert(!library.hasAttribute('data-dragging'));
pointer(library.querySelector('[data-drag-slide="new-1"]'),'pointerdown',20,'touch');pointer(library,'pointermove',145,'touch');pointer(library,'pointerup',145,'touch');assert.deepEqual(order(),['new-2','new-1']);assert.equal(writes,0,'Reordering waits for Save');
await submit(false);assert.equal(writes,0,'Cancelling the review makes no writes');
failAt=2;await submit();assert.equal(items.length,1,'One successful upload survives a later failure');assert.match(root.querySelector('#slider-error').textContent,/reintentar los pendientes/);assert(!root.querySelector('#slider-save').disabled);
failAt=0;await submit();assert.equal(items.length,2);assert.equal(writes,3,'Retry only sends the remaining draft, no duplicate upload');assert(root.querySelector('#slider-save').disabled);assert.equal(location.hash,'#admin/eventos/slider');
const titled=items.find(item=>item.title);assert.equal(titled.link_url,'#curso/7');assert.equal(Number(titled.position),2);assert(revoked.includes('blob:slider-1')&&revoked.includes('blob:slider-2'));
assert.equal(titled.font_family,'georgia');assert.equal(titled.title_color,'#ffd43b');assert.equal(Number(titled.title_size),52);assert.equal(Number(titled.text_size),22);assert.equal(titled.text_align,'center');
root.querySelector('#slider-preview-all').click();assert(document.querySelector('dialog .hero-carousel'));assert.equal(document.querySelector('dialog .carousel-image-link'),null);document.querySelector('dialog').close();
// Editing and toggling stay in this workspace, without replacing stored files.
change('title','Título corregido');form.elements.active.checked=false;form.elements.active.dispatchEvent(new Event('change',{bubbles:true}));const image=titled.image;await submit();assert.equal(items.find(item=>item.id===titled.id).image,image);assert.equal(Number(items.find(item=>item.id===titled.id).active),0);
change('target_kind','external');change('external_url','javascript:alert(1)');const previous=writes;await submit();assert.equal(writes,previous,'Unsafe links cannot be saved');
change('external_url','https://example.org/formacion');await submit();assert.equal(items.find(item=>item.id===titled.id).link_url,'https://example.org/formacion');
const beforeInvalid=writes;change('title_size','200');root.querySelector('[data-select-slide]').click();await submit();assert.equal(writes,beforeInvalid,'Invalid size is checked even after selecting another image');assert.match(root.querySelector('#slider-error').textContent,/20 a 72/);change('title_size','52');
root.querySelector('#slider-remove').click();assert.equal(items.length,2,'Removal waits for the single save/review');await submit();assert.equal(items.length,1);
root.querySelector('#slider-remove').click();assert(form.hidden);await submit();assert.equal(items.length,0,'Saving can remove the final image');assert(root.querySelector('#slider-save').disabled);
addFiles(['pendiente.png']);cleanup();assert(revoked.includes('blob:slider-3'));
page=await sliderPage('nuevo');root.innerHTML=page.html;cleanup=page.mount(root);assert.equal(document.activeElement.id,'slider-files','Legacy new-image link opens the same workspace');cleanup();
URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke;const {toast}=await import('../public/frontend/components/ui.js?v=20261030-4');clearTimeout(toast.timer);dom.window.close();
console.log('OK slider unificado: carga múltiple, tipografía/colores/tamaños, arrastre mouse/táctil/teclado, títulos/enlaces, confirmación, guardado parcial, reintento, eliminación y limpieza.');
