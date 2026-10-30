import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<body><main></main><div id="toast" hidden></div></body>',{url:'http://localhost/la-academia/#curso/42'});
for(const key of ['window','document','location','FormData','Event','CustomEvent','AbortController'])globalThis[key]=dom.window[key];
window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new Event('close'));};
let pauses=0,loads=0;window.HTMLMediaElement.prototype.pause=function(){pauses++;};window.HTMLMediaElement.prototype.load=function(){loads++;};window.HTMLElement.prototype.scrollIntoView=function(){};
const limits={document_max_bytes:50*1024*1024,video_max_bytes:500*1024*1024,video_enabled:true};
const materials=[{id:11,original_name:'Video <seguro>.mp4',extension:'mp4',size:1024*1024,duration_seconds:125,video_width:1920,video_height:1080},{id:12,original_name:'Segundo.webm',extension:'webm',size:3000,duration_seconds:12},{id:13,original_name:'Consulta.pdf',extension:'pdf',size:1000}];
const course={id:42,title:'Capacitación con video',category:'Prueba',description:'Contenido de prueba para capacitación.',creator_name:'Autor',exam_required:0,status:'published',materials,view_count:0,custom_cover_id:88};
let views=0,failView=false;const calls=[];
globalThis.fetch=async(url,options={})=>{
 const path=new URL(url).pathname.split('/api/v1/')[1],data=options.body instanceof FormData?Object.fromEntries(options.body):options.body?JSON.parse(options.body):null;calls.push({path,data,method:options.method});
 let result;if(path==='session')result={user:null,csrf:'synthetic'};
 else if(path==='courses/42'||path==='admin/courses/42')result=structuredClone(course);
 else if(path==='admin/materials/options')result=limits;
 else if(path.startsWith('categories'))result=['Prueba'];
 else if(path==='courses/42/view'){if(failView){failView=false;throw Error('temporary');}assert(materials.some(file=>file.id===data.file_id));result={recorded:views++===0,view_count:1};}
 else if(path==='admin/courses/42/files')result={id:14,extension:'mp4',duration_seconds:30};
 else throw Error(path);
 return {ok:true,json:async()=>({data:result})};
};
const {coursePage}=await import('../public/frontend/pages/course.js');
const {courseEditor}=await import('../public/frontend/pages/admin-courses.js');
const {materialUploadFields,mountMaterialUpload}=await import('../public/frontend/components/material-upload.js');
const {upload}=await import('../public/frontend/api.js?v=20261030-4');
const root=document.querySelector('main'),flush=async()=>{for(let i=0;i<100;i++)await Promise.resolve();};
let page=await coursePage(42);root.innerHTML=page.html;let cleanup=page.mount(root);const first=root.querySelector('video');
assert.match(first.poster,/files\/88$/,'The player uses the image chosen by the author');
assert.equal(root.querySelector('.course-detail-cover img').src,first.poster,'Detail and video player share the chosen cover');
assert(first.controls&&first.playsInline);assert.equal(first.preload,'metadata');assert(!first.autoplay);assert(root.querySelector('[data-expand-material]').hidden);assert.match(root.querySelector('.material-video-info').textContent,/2:05/);assert.equal(root.querySelector('seguro'),null);
for(const type of ['loadstart','loadedmetadata','canplay','play','seeking','seeked'])first.dispatchEvent(new Event(type));root.querySelector('#material-download').click();await flush();assert.equal(views,0,'Preload, attempted play, seeking and video download do not register playback');
first.dispatchEvent(new Event('error'));assert(!root.querySelector('.material-video-error').hidden);root.querySelector('[data-retry-video]').click();assert(root.querySelector('.material-video-error').hidden);assert.equal(views,0);
failView=true;first.dispatchEvent(new Event('playing'));await flush();assert.equal(views,0);first.dispatchEvent(new Event('playing'));first.dispatchEvent(new Event('playing'));await flush();assert.equal(views,1,'Retry a failed view once without overlapping requests');assert.equal(root.querySelector('[data-course-view-count]').textContent,'1 vista');
first.dispatchEvent(new Event('pause'));first.dispatchEvent(new Event('playing'));root.querySelector('[data-material="12"]').click();assert(pauses>0&&loads>0);root.querySelector('video').dispatchEvent(new Event('playing'));await flush();assert.equal(views,1,'Multiple videos and replay share one course view');
root.querySelector('[data-material="13"]').click();assert(!root.querySelector('video'));root.querySelector('iframe').dispatchEvent(new Event('load'));await flush();assert.equal(views,1,'Video and PDF share the same view');assert(!root.querySelector('[data-expand-material]').hidden);cleanup();
page=await coursePage(42);root.innerHTML=page.html;cleanup=page.mount(root);const stale=root.querySelector('video');root.querySelector('[data-material="12"]').click();stale.dispatchEvent(new Event('playing'));await flush();assert.equal(views,1,'A detached video cannot report a view');const active=root.querySelector('video');cleanup();active.dispatchEvent(new Event('playing'));await flush();assert.equal(views,1,'Unmount stops playback and late view events');
const createURL=URL.createObjectURL,revokeURL=URL.revokeObjectURL;const revoked=[];URL.createObjectURL=()=> 'blob:video-preview';URL.revokeObjectURL=url=>revoked.push(url);
root.innerHTML=`<form>${materialUploadFields(limits)}</form>`;const form=root.querySelector('form'),input=form.elements.file;input.required=false;const widget=mountMaterialUpload(form,limits);
function choose(name,size){const file=new window.File(['video'],name,{type:'video/mp4'});Object.defineProperty(file,'size',{value:size});Object.defineProperty(input,'files',{configurable:true,value:[file]});input.dispatchEvent(new Event('change',{bubbles:true}));return file;}
choose('Grande.mp4',500*1024*1024);assert(widget.check());assert(root.querySelector('video'));assert.equal(views,1);choose('Exceso.mp4',500*1024*1024+1);assert(!widget.check());assert.match(input.validationMessage,/500 MB/);choose('Documento.pdf',51*1024*1024);assert(!widget.check());assert.match(input.validationMessage,/50 MB/);choose('Archivo.exe',1);assert(!widget.check());choose('Vacío.mp4',0);assert(!widget.check());
const file=choose('válido.mp4',100);widget.start();assert(input.disabled);widget.progress(100);assert.match(root.querySelector('[data-upload-progress]').textContent,/Validando/);widget.finish();assert(!input.disabled);widget.dispose();assert(revoked.includes('blob:video-preview'));
page=await courseEditor(42,async()=>{});root.innerHTML=page.html;cleanup=page.mount(root);assert.equal(root.querySelector('#cover-file').options.length,1,'Only the PDF is offered as a generated cover');assert.equal(root.querySelectorAll('.admin-video-preview').length,2);assert.match(root.querySelector('.admin-video-preview video').poster,/files\/88$/);assert.match(root.querySelector('.files-list').textContent,/2:05/);assert.equal(root.querySelectorAll('[data-retry-preview]').length,0);cleanup();
course.custom_cover_id=null;course.materials=materials.slice(0,2);
page=await courseEditor(42,async()=>{});root.innerHTML=page.html;cleanup=page.mount(root);assert(!root.querySelector('video').hasAttribute('poster'),'No image is extracted from the video');assert(root.querySelector('.document-cover-choice').hidden,'No empty document selector for video-only courses');assert.match(root.querySelector('.cover-choice-status').textContent,/imagen de portada elegida/);assert(root.querySelector('#custom-cover-form input[type=file]'));cleanup();
class FakeXHR extends window.EventTarget{
 constructor(){super();this.upload=new window.EventTarget();}
 open(method,url){this.method=method;this.url=url;}
 setRequestHeader(key,value){this.headers??={};this.headers[key]=value;}
 send(body){assert.equal(this.headers['X-CSRF-Token'],'synthetic');assert(!this.headers['Content-Type']);assert(body instanceof FormData);queueMicrotask(()=>{this.upload.dispatchEvent(new window.ProgressEvent('progress',{lengthComputable:true,loaded:5,total:10}));this.status=201;this.responseText=JSON.stringify({data:{id:99}});this.dispatchEvent(new Event('load'));});}
}
globalThis.XMLHttpRequest=FakeXHR;const progress=[];assert.equal((await upload('content','upload',file,{course_id:42},{onProgress:value=>progress.push(value)})).id,99);assert.deepEqual(progress,[50]);delete globalThis.XMLHttpRequest;
URL.createObjectURL=createURL;URL.revokeObjectURL=revokeURL;dom.window.close();
console.log('OK video frontend: manual playback, no preload/download/seek views, shared deduplication, retry/cleanup, metadata, 500 MB boundary, preview, cover filtering and upload progress.');
