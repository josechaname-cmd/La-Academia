import {activityReadState} from '../public/frontend/components/activity-read-state.js';
import {overviewPage} from '../public/frontend/pages/admin-home.js';
import {coursesPage} from '../public/frontend/pages/admin-courses.js';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {adminShell,setCourseMenuExpanded,setEventMenuExpanded,setUserMenuExpanded} from '../public/frontend/components/admin-shell.js';
import {adminLayout} from '../public/frontend/components/admin-layout.js';
import {reportsPage} from '../public/frontend/pages/admin-reports.js';
import {notificationCenter,activityItemsHtml} from '../public/frontend/components/notification-center.js';
const shell=adminShell({id:1,name:'Prueba',role:'admin'},'capacitaciones/resultados','Contenido');
assert(shell.includes('href="#admin/capacitaciones/resultados" class="sidebar-child selected"'));
assert(!shell.includes('Avisos')&&!shell.includes('#admin/resultados'));
assert(shell.includes('href="#admin"')&&shell.includes('Inicio'),'Inicio is retained');
assert(shell.includes('aria-expanded="true"'),'Results opens its submenu');
assert(adminShell({name:'Prueba',role:'admin'},'', '').includes('id="course-submenu" hidden'),'Submenu starts collapsed on Inicio');
const button={setAttribute(key,value){this[key]=value;}},submenu={hidden:true};
const menuRoot={querySelector(selector){return selector==='[data-course-menu]'?button:submenu;}};
setCourseMenuExpanded(menuRoot,true);assert.equal(submenu.hidden,false);assert.equal(button['aria-expanded'],'true');
setCourseMenuExpanded(menuRoot,false);assert.equal(submenu.hidden,true);assert.equal(button['aria-expanded'],'false');
assert(shell.indexOf('href="#admin/capacitaciones"')<shell.indexOf('href="#admin/capacitaciones/resultados"'));
const realFetch=globalThis.fetch,requests=[];
globalThis.fetch=async url=>{
 requests.push(url.href);
 const data=url.pathname.endsWith('/summary')?{courses:3,published:2,evaluations:7}:url.pathname.endsWith('/exams')?[{id:42,title:'Examen de prueba',version:3,state:'closed',course_status:'published',opens_at:'2026-10-01 09:00:00',closes_at:'2026-10-02 09:00:00'}]:[];
 return {ok:true,json:async()=>({data})};
};
try{
 const page=await reportsPage('42');
 assert(requests.some(url=>url.endsWith('/admin/reports/results?exam_id=42')),'Deep links load the selected exam directly');
 assert(page.html.includes('<option value="42" selected>Examen de prueba · v3 · Finalizado'));
 assert(page.html.includes('Exportar Excel'),'Selected results retain Excel export');
 await assert.rejects(reportsPage('invalid'),'Invalid route IDs are rejected');
 const home=await overviewPage();assert(home.html.includes('Inicio')&&home.html.includes('home-metrics')&&home.html.includes('dashboard-chart-switcher')&&home.html.includes('data-dashboard-chart="views"')&&home.html.includes('data-dashboard-chart="scores"')&&home.html.includes('data-dashboard-chart="participation"'),'Inicio provides the metrics and three guided chart views');
 const courses=await coursesPage();assert(courses.html.includes('href="#admin/capacitaciones/resultados"'),'Courses provides a direct results shortcut');
 const html=notificationCenter({items:[],revision:'0'},1).html;
 assert(html.includes('Notificaciones')&&!html.includes('Marcar como leída')&&!html.includes('Ver detalle'),'No extra read/detail controls');
}finally{globalThis.fetch=realFetch;}
console.log('OK activity UI: nested navigation, retired manual notices, direct exam selection, export and invalid IDs.');

const values=new Map(),storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
const item={id:81,title:'Resultado <nuevo>',body:'Examen de prueba',href:'#admin/capacitaciones/resultados/42',created_at:'2026-10-03 10:00:00'};
const rows=activityItemsHtml([item]);assert(rows.startsWith('<a ')&&rows.includes('data-open-activity="81"'),'The entire notification is a link');
assert(rows.includes('Resultado &lt;nuevo&gt;')&&!rows.includes('<button'),'Escapes content and has no nested actions');
const read=activityReadState(1,storage);assert.equal(read.pending([item]).length,1);assert(read.mark(item));
assert.equal(read.pending([item]).length,0,'Clicked activity immediately disappears');
assert.equal(activityReadState(1,storage).pending([{...item,href:'#admin/capacitaciones',title:'Changed'}]).length,0,'A read notification stays hidden after reload or content changes');
assert.equal(activityReadState(2,storage).pending([item]).length,1,'Reading is scoped to the account');
assert.equal(read.pending([{...item,id:82}]).length,1,'A new activity remains visible');
const secondTab=activityReadState(1,storage);read.mark({...item,id:82});secondTab.restore(storage.getItem(read.key));
assert.equal(secondTab.pending([{...item,id:82}]).length,0,'Read state synchronizes across tabs');
values.set(read.key,JSON.stringify([['83','legacy-fingerprint']]));
assert.equal(activityReadState(1,storage).pending([{...item,id:83}]).length,0,'Existing read marks are preserved');
console.log('OK corrected UI: Inicio, independent submenu toggle, results shortcut, clickable rows, dismissal, reload and account isolation.');

const eventShell=adminShell({name:'Super',role:'superadmin'},'eventos/popup','');assert(eventShell.includes('id="event-submenu" >'));assert(eventShell.includes('href="#admin/eventos/popup" class="sidebar-child selected"'));assert(!shell.includes('data-event-menu'));const eb={setAttribute(k,v){this[k]=v;}},es={hidden:true};setEventMenuExpanded({querySelector:s=>s==='[data-event-menu]'?eb:es},true);assert.equal(es.hidden,false);assert.equal(eb['aria-expanded'],'true');
const userShell=adminShell({name:'Super',role:'superadmin'},'colaboradores','');assert(userShell.includes('href="#admin/usuarios"'));assert(userShell.includes('id="user-submenu" >'));assert(userShell.includes('href="#admin/colaboradores" class="sidebar-child selected"'));assert(!userShell.includes('>Capacitadores<'));const ub={setAttribute(k,v){this[k]=v;}},us={hidden:true};setUserMenuExpanded({querySelector:s=>s==='[data-user-menu]'?ub:us},true);assert.equal(us.hidden,false);assert.equal(ub['aria-expanded'],'true');
assert(eventShell.includes('M5 7h14M5 12h14M5 17h14')&&!eventShell.includes('m14.5 7-5 5 5 5'),'Sidebar uses only the hamburger icon');

const originalGlobals=Object.fromEntries(['window','document','localStorage','matchMedia'].map(key=>[key,globalThis[key]]));
const layoutDom=new JSDOM(`<!doctype html><body><header class="header"><button id="admin-menu-toggle" hidden></button></header><main id="app">${shell}</main><footer class="support-footer"></footer></body>`,{url:'http://localhost/la-academia/#admin'});
try{
  globalThis.window=layoutDom.window;globalThis.document=layoutDom.window.document;globalThis.localStorage=layoutDom.window.localStorage;
  globalThis.matchMedia=()=>({matches:false,addEventListener(){}});
  const layout=adminLayout();layout.set(true);layout.sync();
  document.querySelector('[data-sidebar-collapse]').click();
  assert(document.body.classList.contains('admin-sidebar-collapsed'),'Desktop sidebar collapses');
  assert.equal(document.querySelector('[data-sidebar-collapse]').getAttribute('aria-expanded'),'false');
  assert.equal(localStorage.getItem('la-academia.admin-sidebar-collapsed'),'true','Collapsed preference persists');
  document.querySelector('#app').innerHTML=adminShell({id:1,name:'Prueba',role:'admin'},'','Contenido');layout.sync();
  assert.equal(document.querySelector('[data-sidebar-collapse]').getAttribute('aria-expanded'),'false','State is restored after shell navigation');
  document.querySelector('[data-sidebar-collapse]').click();assert(!document.body.classList.contains('admin-sidebar-collapsed'));
}finally{
  layoutDom.window.close();for(const [key,value] of Object.entries(originalGlobals)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
}
console.log('OK sidebar: desktop collapse, accessible state, persistence and route restoration.');
