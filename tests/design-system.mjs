import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import {JSDOM} from 'jsdom';
import {busy,modal,confirmAction,toast,enhanceUI,icon,breadcrumbs,pagination} from '../public/frontend/components/ui.js';
const root=path.resolve(import.meta.dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const tokens=JSON.parse(read('public/frontend/design/tokens.json'));
const sheets=['design-system','styles','learning'].map(name=>postcss.parse(read(`public/assets/${name}.css`)));
const defined=new Set();sheets.forEach(css=>css.walkDecls(d=>{if(d.prop.startsWith('--'))defined.add(d.prop);}));
let rules=0;
for(const css of sheets){
 css.walkRules(rule=>{
  if(rule.parent.type==='atrule'&&/keyframes$/.test(rule.parent.name))return;
  for(const selector of rule.selectors){assert(selector.trim()&&selector!==':where(.academy-ui)','No empty root selector');assert(selector.startsWith(':where(.academy-ui) ')||selector.startsWith('.academy-ui'),'Every selector is scoped');}
  rules++;
 });
 css.walkDecls(d=>{for(const [,name]of d.value.matchAll(/var\((--[\w-]+)/g))assert(defined.has(name),`Undefined token: ${name}`);});
 css.walkAtRules('media',r=>{assert(!r.params.includes('--screen-'),'Compiled breakpoint');});
}
function luminance(hex){const c=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
function contrast(a,b){const x=luminance(tokens.color[a]),y=luminance(tokens.color[b]);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
for(const [a,b]of [['brand','on-brand'],['muted','surface'],['ink','canvas'],...['success','error','warning','info'].map(c=>[c,`${c}-bg`])])assert(contrast(a,b)>=4.5,`${a}/${b} contrast`);
assert(contrast('control-border','surface')>=3,'Control boundary contrast');
for(const name of ['components.css','navigation.css','carousel.css','home-popup.css','layouts/base.css','layouts/learning.css','pages/admin-dashboard.css']){
 const css=postcss.parse(read(`public/frontend/design/${name}`));css.walkDecls(d=>assert(!/#[\da-f]{3,8}\b/i.test(d.value),`Literal palette in ${name}`));
}
const dom=new JSDOM(`<!doctype html><html class="academy-ui"><body><button id="trigger">Open</button><dialog id="dialog"><button class="close">Close</button><div id="dialog-body"></div></dialog><form><button id="save">${icon('check')} Save</button></form><div id="toast" hidden></div><div class="table-scroll"><table><thead><tr><th>Name</th></tr></thead></table></div></body></html>`,{url:'http://localhost/la-academia/'});
for(const key of ['window','document','CustomEvent','Event'])globalThis[key]=dom.window[key];
dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
dom.window.HTMLDialogElement.prototype.close=function(){if(this.open){this.open=false;this.dispatchEvent(new Event('close'));}};
try{
 const button=document.querySelector('#save'),original=button.firstChild;
 let calls=0,release;const wait=new Promise(resolve=>release=resolve);
 const pending=busy(button,async()=>{calls++;await wait;});assert(button.disabled);assert.equal(button.getAttribute('aria-busy'),'true');await busy(button,()=>calls++);assert.equal(calls,1);release();await pending;
 assert.equal(button.firstChild,original);assert(!button.disabled);assert(!button.hasAttribute('aria-busy'));
 let validation;button.closest('form').addEventListener('api-validation',event=>validation=event.detail);
 await busy(button,()=>{throw Object.assign(Error('Error de prueba'),{fields:{title:'Required'}});});assert.equal(validation.title,'Required');assert.equal(document.querySelector('#toast').getAttribute('role'),'alert');assert(!button.disabled);
 toast('Guardado');assert.equal(document.querySelector('#toast').getAttribute('aria-live'),'polite');
 const trigger=document.querySelector('#trigger');trigger.focus();modal('<h2>Editar</h2><label>Nombre<input name="name"></label>');assert.equal(document.activeElement.name,'name');assert.equal(document.querySelector('#dialog').getAttribute('aria-labelledby'),'form-dialog-title');document.querySelector('#dialog').close();assert.equal(document.activeElement,trigger);
 let action=confirmAction('<Delete?>',{label:'Eliminar'});assert.equal(document.activeElement.dataset.cancel,'');assert.equal(document.querySelector('#confirm-description').textContent,'<Delete?>');document.querySelector('[data-cancel]').click();assert.equal(await action,false);assert.equal(document.activeElement,trigger);
 action=confirmAction('Delete');document.querySelector('[data-confirm]').click();assert.equal(await action,true);assert(!document.querySelector('.ui-confirm'));
 action=confirmAction('Delete');document.querySelector('.ui-confirm').close();assert.equal(await action,false);
 enhanceUI(document.body);assert.equal(document.querySelector('.table-scroll').tabIndex,0);assert.equal(document.querySelector('th').scope,'col');
 assert(breadcrumbs([{label:'<safe>',href:'#a'},{label:'Current'}]).includes('&lt;safe&gt;'));assert(pagination().includes('id="catalog-next"'));
}finally{clearTimeout(toast.timer);dom.window.close();}
console.log(`OK design: ${rules} scoped rules, resolved tokens, semantic contrast, accessible forms/tables/dialogs, destructive confirmation, busy/error recovery and SVG preservation.`);
