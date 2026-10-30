import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><body><main></main><div id="toast" hidden></div></body>',{url:'http://localhost/la-academia/#admin/capacitaciones/42'});
for(const key of ['window','document','location','FormData','Event','CustomEvent','AbortController','Node'])globalThis[key]=dom.window[key];
dom.window.HTMLElement.prototype.scrollIntoView=function(){};
dom.window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};dom.window.HTMLDialogElement.prototype.close=function(){if(this.open){this.removeAttribute('open');this.dispatchEvent(new Event('close'));}};
const course={id:42,title:'Curso de prevención',category:'SSOMA',description:'Material de prevención para todos.',creator_name:'Autor real',status:'draft',exam_required:1,materials:[{id:10,original_name:'Material.pdf',extension:'pdf',size:100,preview_status:'ready'},{id:11,original_name:'Otro.pdf',extension:'pdf',size:100}],cover_file_id:10,cover_status:'ready',exam:null};
const calls=[];let fail=false,failPublish=false,reloads=0;
globalThis.fetch=async(url,options={})=>{
  const path=new URL(url).pathname.split('/api/v1/')[1],body=options.body instanceof FormData?Object.fromEntries(options.body):options.body?JSON.parse(options.body):null;calls.push({path,body,method:options.method});
  let data;
  if(path==='session')data={user:{id:1},csrf:'test'};
  else if(path==='admin/materials/options')data={document_max_bytes:50*1024*1024,video_max_bytes:500*1024*1024,video_enabled:true};
 else if(path.startsWith('categories'))data=['SSOMA','Salud'];
  else if(path==='admin/courses'){assert(options.body instanceof FormData);assert.equal(body.exam_required,'0');assert.equal(body.file.name,'Material.pdf');Object.assign(course,{...body,status:'draft'});data=structuredClone({...course,file:undefined});}
  else if(path==='admin/courses/42'){
    if(options.method==='PATCH'){
      if(fail){fail=false;return {ok:false,status:503,json:async()=>({error:{message:'Fallo temporal'}})};}
      Object.assign(course,body);
    }
    data=structuredClone(course);
  }else if(path==='admin/courses/42/publish'){
    if(failPublish){failPublish=false;return {ok:false,status:503,json:async()=>({error:{message:'Publicación temporalmente no disponible'}})};}
    assert.equal(Number(course.exam_required),0,'Saved mode is authoritative before publication');assert(course.materials.length);course.status='published';data=structuredClone(course);
  }else if(path==='courses/42')data={...structuredClone(course),exam:null};
  else if(path==='courses/42/view')data={recorded:false};
  else throw Error(path);
  return {ok:true,json:async()=>({data})};
};
const {courseEditor}=await import('../public/frontend/pages/admin-courses.js');
const {coursePage}=await import('../public/frontend/pages/course.js');
const flush=async()=>{for(let i=0;i<40;i++)await Promise.resolve();};
const root=document.querySelector('main'),page=await courseEditor(42,async()=>{reloads++;});root.innerHTML=page.html;const cleanup=page.mount(root);
const form=root.querySelector('#course-form'),save=root.querySelector('#course-save');
const change=(control,value)=>{control.value=value;control.dispatchEvent(new Event('input',{bubbles:true}));};
assert(root.querySelector('.course-action-dock').contains(save));assert(root.querySelector('.course-action-dock').contains(root.querySelector('#publish')));assert.equal(form.querySelector('[type="submit"]'),null,'Primary actions are no longer scattered inside the form');
assert.equal(save.disabled,true);assert.equal(root.querySelector('#publish').disabled,true);assert.equal(root.querySelectorAll('.course-progress li').length,4);
assert.equal(root.querySelector('#save-cover').disabled,true);root.querySelector('#cover-file').value='11';root.querySelector('#cover-file').dispatchEvent(new Event('change'));assert.equal(root.querySelector('#save-cover').disabled,false);
change(form.elements.title,'Curso actualizado');assert.equal(save.disabled,false);
change(form.elements.title,course.title);assert.equal(save.disabled,true,'reverting changes disables save');
change(form.elements.title,`  ${course.title}  `);assert.equal(save.disabled,true,'normalization matches server');
form.dispatchEvent(new Event('submit',{cancelable:true}));await flush();assert.ok(!calls.some(c=>c.method==='PATCH'));
form.elements.without_exam.checked=true;form.elements.without_exam.dispatchEvent(new Event('change',{bubbles:true}));assert.equal(save.disabled,false);assert.match(root.querySelector('#course-progress').textContent,/No requerida/);assert.equal(root.querySelector('#publish').disabled,false,'pending no-exam mode can be saved and published');assert.equal(root.querySelector('#publish').textContent,'Guardar y publicar');
fail=true;form.dispatchEvent(new Event('submit',{cancelable:true}));await flush();assert.equal(save.disabled,false);assert.equal(form.elements.without_exam.checked,true);assert.equal(form.elements.title.disabled,false);
form.dispatchEvent(new Event('submit',{cancelable:true}));form.dispatchEvent(new Event('submit',{cancelable:true}));await flush();
assert.equal(calls.filter(c=>c.method==='PATCH').length,2,'one failure and one successful save; no duplicate');
assert.equal(calls.at(-1).body.exam_required,0);assert.equal(save.disabled,true);assert.equal(reloads,1);assert.equal(root.querySelector('#publish').disabled,false);
cleanup();
// Reloaded drafts with a serialized zero must also publish without creating an exam.
course.exam_required='0';let edit=await courseEditor(42,async()=>{reloads++;});root.innerHTML=edit.html;let cleanEdit=edit.mount(root);let publish=root.querySelector('#publish');assert.equal(publish.disabled,false);failPublish=true;publish.click();await flush();assert.equal(course.status,'draft');assert.equal(publish.disabled,false);publish.click();publish.click();await flush();assert.equal(course.status,'published');assert.equal(location.hash,'#admin/capacitaciones');assert(document.querySelector('#toast.toast-prominent'));assert.match(document.querySelector('#toast strong').textContent,/publicada/);assert.equal(publish.disabled,true);assert.equal(calls.filter(c=>c.path.endsWith('/publish')).length,2);cleanEdit();
// Publish saves the selected mode first; a failed save must never publish.
course.status='draft';course.exam_required=1;edit=await courseEditor(42,async()=>{});root.innerHTML=edit.html;cleanEdit=edit.mount(root);const editForm=root.querySelector('form');editForm.elements.without_exam.checked=true;editForm.dispatchEvent(new Event('change',{bubbles:true}));publish=root.querySelector('#publish');const beforePublish=calls.filter(c=>c.path.endsWith('/publish')).length;fail=true;publish.click();await flush();assert.equal(calls.filter(c=>c.path.endsWith('/publish')).length,beforePublish);assert.equal(publish.disabled,false);publish.click();await flush();assert.equal(course.status,'published');assert.deepEqual(calls.slice(-2).map(c=>c.method),['PATCH','POST']);assert.equal(calls.at(-2).body.exam_required,0);cleanEdit();
course.custom_cover_id=88;const publicCourse=await coursePage(42);root.innerHTML=publicCourse.html;const cleanPublic=publicCourse.mount(root);await flush();
assert.equal(root.querySelector('#start-evaluation'),null);assert.equal(document.querySelector('.evaluation-dialog'),null);assert.ok(root.querySelector('.learning-material-only'));
assert.match(root.querySelector('.course-detail-cover img').src,/files\/88$/);assert.equal(root.querySelector('.course-detail-copy p').textContent,course.description);
assert.equal(root.querySelector('.course-author strong').textContent,'Autor real');assert.equal(root.querySelector('.course-author small').textContent,'AUTOR');assert(root.querySelector('.course-author-face svg'),'Course detail shows a face icon beside the author name');
assert(root.querySelector('.course-detail-copy').compareDocumentPosition(root.querySelector('.course-detail-cover'))&Node.DOCUMENT_POSITION_FOLLOWING,'Title and description precede the wide cover');
assert.equal(root.querySelector('.viewer-heading h2').textContent,'Materiales');assert.equal(root.querySelector('.viewer-heading .eyebrow'),null);assert(root.querySelector('.material-toolbar [data-expand-material]'));
const expand=root.querySelector('[data-expand-material]');assert.equal(expand.disabled,false);assert.equal(expand.getAttribute('aria-label'),'Ver PDF en grande');assert.equal(expand.textContent.trim(),'');assert(expand.querySelector('svg'));expand.click();
const lightbox=document.querySelector('.material-lightbox');assert(lightbox.open);assert.match(lightbox.querySelector('iframe').src,/files\/10#page=1&toolbar=1/);lightbox.querySelector('.material-lightbox-close').click();assert(!lightbox.open);cleanPublic();assert.equal(document.querySelector('.material-lightbox'),null);
// Creating with an upload sends exam_required=0 and navigates to a publishable editor.
location.hash='admin/capacitaciones/nuevo';const create=await courseEditor('nuevo',async()=>{});root.innerHTML=create.html;const cleanCreate=create.mount(root),createForm=root.querySelector('#course-form');createForm.elements.title.value='Nueva capacitación sin examen';createForm.elements.description.value='Material para aprender sin evaluación.';createForm.elements.category.value='SSOMA';createForm.elements.without_exam.checked=true;const file=new window.File(['%PDF-1.4 test'],'Material.pdf',{type:'application/pdf'});Object.defineProperty(createForm.elements.file,'files',{value:[file]});Object.defineProperty(createForm.elements.file,'value',{get:()=> 'C:/fakepath/Material.pdf'});createForm.elements.file.required=false;createForm.dispatchEvent(new Event('change',{bubbles:true}));createForm.dispatchEvent(new Event('submit',{cancelable:true}));await flush();assert.equal(location.hash,'#admin/capacitaciones/42');assert.equal(course.exam_required,'0');cleanCreate();edit=await courseEditor(42,async()=>{});root.innerHTML=edit.html;cleanEdit=edit.mount(root);assert.equal(root.querySelector('#publish').disabled,false);root.querySelector('#publish').click();await flush();assert.equal(course.status,'published');cleanEdit();
dom.window.close();
console.log('OK capacitación DOM: guardado solo con cambios, reversión, progreso, modo sin examen, creación multipart, guardado/publicación secuenciales, error recuperable y portal solo material.');
