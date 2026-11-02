import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {field} from '../public/frontend/components/common.js';
import {attachValidation} from '../public/frontend/components/form-validation.js';
import {busy,toast} from '../public/frontend/components/ui.js?v=20261030-9';
import {materialViewer} from '../public/frontend/components/material-viewer.js';
import {authPage} from '../public/frontend/pages/auth.js';

const dom=new JSDOM('<body><main></main><div id="toast" hidden></div></body>',{url:'http://localhost/la-academia/#admin',pretendToBeVisual:true});
for(const key of ['window','document','location','history','FormData','Event','CustomEvent','KeyboardEvent'])globalThis[key]=dom.window[key];
window.matchMedia=()=>({matches:true});
window.HTMLElement.prototype.scrollIntoView=function(options){assert.equal(options.behavior,'instant');};
window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new Event('close'));};
const root=document.querySelector('main'),flush=async()=>{for(let i=0;i<60;i++)await Promise.resolve();};
root.innerHTML=`<form id="validation">${field('Correo','email','','type="email" required')}${field('DNI','dni','','pattern="[0-9]{8}"')}${field('Cantidad','amount','1','type="number" min="2"')}${field('Contraseña','password','','type="password" required minlength="12"')}<label><input type="radio" name="choice" value="a">A</label><label><input type="radio" name="choice" value="b" required>B</label></form><button id="external-save" form="validation">Guardar</button>`;
const form=root.querySelector('form'),validate=attachValidation(form);
form.elements.email.value='invalid';form.elements.dni.value='123';
assert.equal(validate(),false);
assert.match(form.textContent,/correo válido/);assert.match(form.textContent,/8 dígitos/);assert.match(form.textContent,/mínimo es 2/);
assert.equal(form.elements.choice[0].getAttribute('aria-invalid'),'true','A required group is validated even when required is on its second radio');
form.elements.email.value='valid@example.invalid';form.elements.dni.value='12345678';form.elements.amount.value='2';form.elements.password.value='Valid password 123';form.elements.choice[1].checked=true;
assert.equal(validate(),true);
const toggle=form.querySelector('[data-password-toggle]');toggle.click();assert.equal(form.elements.password.type,'text');assert.equal(toggle.getAttribute('aria-pressed'),'true');assert.equal(form.elements.password.value,'Valid password 123');
await busy(root.querySelector('#external-save'),()=>{throw Object.assign(Error('Corrige el correo'),{fields:{email:'Este correo ya existe.'}});});
assert.equal(form.elements.email.getAttribute('aria-invalid'),'true','External submit buttons retain their form validation');
assert.match(form.textContent,/Este correo ya existe/);
form.reset();assert.equal(form.elements.email.validity.customError,false);assert.equal(form.querySelector('[data-field-error]'),null);assert(form.querySelector('.validation-summary').hidden);assert.equal(form.elements.password.type,'password');

root.innerHTML=`<form>${field('Texto','title','Bien','minlength="3" maxlength="5"')}${field('Entero','count','2','type="number" min="1" max="10" step="1"')}${field('Clave','password','Synthetic password','type="password" minlength="12"')}<input type="file" name="images" multiple accept=".png,.jpg" data-max-mb="8"><textarea name="questions.0.prompt"></textarea><input type="radio" name="correct-0" value="0"><input type="radio" name="correct-0" value="1"></form>`;
const strict=root.querySelector('form'),check=attachValidation(strict),message=(control,value,pattern)=>{control.value=value;assert.equal(check(),false);assert.match(strict.textContent,pattern);};
message(strict.elements.title,'Demasiado largo',/como máximo 5/);strict.elements.title.value='Bien';
message(strict.elements.count,'1e1',/sin decimales ni exponentes/);strict.elements.count.value='2';
message(strict.elements.password,'á'.repeat(37),/72 bytes/);strict.querySelector('[data-password-toggle]').click();assert.equal(check(),false,'Password byte limits survive visibility toggle');strict.elements.password.value='Valid password 123';
message(strict.elements.title,'Ab\u0001c',/caracteres no válidos/);strict.elements.title.value='Bien';
const files=strict.elements.images,setFiles=items=>Object.defineProperty(files,'files',{configurable:true,value:items});
setFiles([new window.File(['ok'],'first.png'),new window.File(['bad'],'second.exe')]);assert.equal(check(),false,'Every selected file is validated');
setFiles([new window.File(['ok'],'first.png'),new window.File([],'empty.png')]);assert.equal(check(),false);assert.match(strict.textContent,/está vacío/);
setFiles([{name:'first.png',size:1},{name:'large.jpg',size:8*1024*1024+1}]);assert.equal(check(),false);assert.match(strict.textContent,/máximo 8 MB/);
setFiles([new window.File(['ok'],'valid.PNG')]);assert.equal(check(),true);
strict.dispatchEvent(new CustomEvent('api-validation',{detail:{'questions.0.prompt':'Enunciado repetido.','correct-0':'Selecciona una respuesta.'}}));
assert.equal(strict.elements.namedItem('questions.0.prompt').getAttribute('aria-invalid'),'true');
strict.elements.namedItem('questions.0.prompt').dispatchEvent(new Event('input',{bubbles:true}));strict.elements.namedItem('correct-0')[1].checked=true;strict.elements.namedItem('correct-0')[1].dispatchEvent(new Event('change',{bubbles:true}));assert.equal(check(),true,'Changing another radio clears the server error for its group');
const action=document.createElement('button');strict.append(action);let finishAction,actionCalls=0;
const activeAction=busy(action,async()=>{actionCalls++;await new Promise(resolve=>finishAction=resolve);});action.disabled=false;
await busy(action,async()=>actionCalls++);assert.equal(actionCalls,1,'A UI refresh cannot re-enable duplicate work');finishAction();await activeAction;

let loginCalls=0,releaseLogin,failLogin=true,reloads=0,previewMode='fail',releasePreview;
globalThis.fetch=async(url,options={})=>{
  const path=new URL(url).pathname.split('/api/v1/')[1];
  if(path==='session'){
    if(options.method==='POST'){
      loginCalls++;await new Promise(resolve=>releaseLogin=resolve);
      if(failLogin)return {ok:false,status:401,json:async()=>({error:{message:'Datos de acceso incorrectos.'}})};
    }
    return {ok:true,json:async()=>({data:{csrf:'synthetic',user:null,setup_required:false}})};
  }
  assert.equal(path,'files/10/preview-status');
  if(previewMode==='fail')throw Error('Simulated network failure');
  if(previewMode==='delay')await new Promise(resolve=>releasePreview=resolve);
  return {ok:true,json:async()=>({data:{status:'ready',source_hash:'synthetic'}})};
};
const auth=authPage({setup_required:false},async()=>reloads++);root.innerHTML=auth.html;auth.mount(root);
const login=root.querySelector('form'),submit=()=>login.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
login.elements.email.value='admin@example.invalid';login.elements.password.value='Test password 123';
login.querySelector('[data-password-toggle]').click();assert.equal(login.elements.password.type,'text');assert.equal(loginCalls,0,'Showing a password does not submit');
submit();await flush();assert.equal(loginCalls,1);assert(login.querySelector('[type=submit]').disabled);submit();await flush();assert.equal(loginCalls,1,'Duplicate login is blocked even with the password toggle present');
releaseLogin();await flush();assert.match(root.querySelector('#auth-error').textContent,/Datos de acceso incorrectos/);assert.equal(document.activeElement.id,'auth-error');assert(!login.querySelector('[type=submit]').disabled);
failLogin=false;submit();await flush();assert.equal(root.querySelector('#auth-error').textContent,'');releaseLogin();await flush();assert.equal(reloads,1);assert.equal(login.elements.password.type,'password');assert.equal(login.elements.password.value,'');

let materialOpens=0;
const viewer=materialViewer([{id:10,extension:'pptx',original_name:'Presentación de prueba'},{id:11,extension:'pdf',original_name:'Documento de prueba'}]);root.innerHTML=viewer.html;let dispose=viewer.mount(root,{onOpen:()=>materialOpens++});await flush();
assert.equal(materialOpens,0,'Failed previews do not register an opening');
assert(root.querySelector('[data-retry-material]'),'A transient preview failure offers a retry');assert.match(root.textContent,/Revisa tu conexión/);assert(!root.textContent.includes('Apache'));
previewMode='delay';root.querySelector('[data-retry-material]').click();await flush();
const first=root.querySelector('[data-material="10"]'),second=root.querySelector('[data-material="11"]'),stage=root.querySelector('#material-stage');
first.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
assert.equal(document.activeElement,second);assert.equal(first.tabIndex,-1);assert.equal(second.tabIndex,0);assert.equal(stage.getAttribute('aria-labelledby'),second.id);assert.match(stage.querySelector('iframe').src,/files\/11/);assert.equal(stage.getAttribute('aria-busy'),'false');
releasePreview();await flush();assert.match(stage.querySelector('iframe').src,/files\/11/,'A delayed presentation response cannot replace the PDF');
const previousFrame=stage.querySelector('iframe');
previewMode='ready';second.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true,cancelable:true}));await flush();assert.equal(document.activeElement,first);assert.match(stage.querySelector('iframe').src,/files\/10\/preview/);
previousFrame.dispatchEvent(new Event('load'));assert.equal(materialOpens,0,'A superseded document does not count');stage.querySelector('iframe').dispatchEvent(new Event('load'));assert.equal(materialOpens,1,'A loaded PowerPoint preview counts');
first.dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true,cancelable:true}));assert.equal(document.activeElement,second);dispose();assert.equal(document.querySelector('.material-lightbox'),null);
const empty=materialViewer([]);root.innerHTML=empty.html;dispose=empty.mount(root);assert(root.querySelector('.material-footer').hidden);assert(root.querySelector('[data-expand-material]').hidden);dispose();
clearTimeout(toast.timer);dom.window.close();
console.log('OK frontend UX: mensajes específicos, radio requerido, reset, botón externo, contraseñas, doble ingreso, errores recuperables y visor con teclado/respuestas tardías.');
