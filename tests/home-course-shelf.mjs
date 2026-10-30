import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<body><main class="home-learning"></main></body>',{url:'http://localhost/la-academia/',pretendToBeVisual:true});
for(const key of ['window','document','Event'])globalThis[key]=dom.window[key];
const queries=new Map();
window.matchMedia=query=>{
 if(!queries.has(query)){
  const media=new window.EventTarget();media.matches=false;queries.set(query,media);
 }
 return queries.get(query);
};
const courses=Array.from({length:25},(_,i)=>({id:i+1,title:`Curso ${i+1}`,category:'Prueba',custom_cover_id:i+100,view_count:0}));
const calls=[];
globalThis.fetch=async url=>{const path=new URL(url).pathname.split('/api/v1/')[1];calls.push(path);assert(['courses','slider'].includes(path));return {ok:true,json:async()=>({data:path==='courses'?courses:[]})};};
const {homeCourseShelf}=await import('../public/frontend/components/home-course-shelf.js');
const {portalPage}=await import('../public/frontend/pages/portal.js');
const portal=await portalPage();assert.equal(new JSDOM(portal.html).window.document.querySelectorAll('.course-card').length,25,'Home includes every course, without the former six-card cutoff');
const root=document.querySelector('main');
const component=homeCourseShelf(courses);root.innerHTML=component.html;
const track=root.querySelector('.home-course-track'),status=root.querySelector('[data-shelf-status]');
Object.defineProperty(track,'clientWidth',{value:900});let lastBehavior='';
track.scrollTo=function({left,behavior}){this.scrollLeft=left;lastBehavior=behavior;this.dispatchEvent(new Event('scroll'));};
let cleanup=component.mount(root);
const groups=()=>[...track.children].map(page=>page.querySelectorAll('.course-card').length);
assert.deepEqual(groups(),[9,9,7],'Desktop: three columns by at most three rows');
assert.equal(status.textContent,'1–9 de 25');assert(root.querySelector('[data-shelf-prev]').disabled);
root.querySelector('[data-shelf-next]').click();assert.equal(track.scrollLeft,900);assert.equal(status.textContent,'10–18 de 25');assert.equal(lastBehavior,'smooth');
track.dispatchEvent(new window.KeyboardEvent('keydown',{key:'End',bubbles:true,cancelable:true}));assert.equal(status.textContent,'19–25 de 25');assert(root.querySelector('[data-shelf-next]').disabled);
track.scrollLeft=0;track.dispatchEvent(new Event('scroll'));assert.equal(status.textContent,'1–9 de 25','Touch/trackpad scroll updates the controls');
const focusLink=track.querySelector('a[href="#curso/20"]');focusLink.focus();assert.equal(status.textContent,'19–25 de 25','Keyboard focus brings an off-screen card into view');
const wide=queries.get('(max-width: 1000px)'),mobile=queries.get('(max-width: 680px)');
wide.matches=true;wide.dispatchEvent(new Event('change'));
assert.deepEqual(groups(),[6,6,6,6,1],'Medium: two columns by at most three rows');assert.equal(document.activeElement.getAttribute('href'),'#curso/20');assert.equal(status.textContent,'19–24 de 25');
mobile.matches=true;mobile.dispatchEvent(new Event('change'));
assert.deepEqual(groups(),[3,3,3,3,3,3,3,3,1],'Mobile: one column by at most three rows');assert.equal(document.activeElement.getAttribute('href'),'#curso/20');assert.equal(status.textContent,'19–21 de 25');
queries.get('(prefers-reduced-motion: reduce)').matches=true;
root.querySelector('[data-shelf-next]').click();assert.equal(lastBehavior,'instant','Reduced motion bypasses animated scrolling');
const beforeKey=track.scrollLeft;document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.equal(track.scrollLeft,beforeKey,'Arrow handling does not intercept a focused course link');
assert.deepEqual(calls,['courses','slider'],'Paging, resizing and covers never record views or refetch the catalog');
cleanup();const oldContent=track.innerHTML;mobile.matches=false;mobile.dispatchEvent(new Event('change'));assert.equal(track.innerHTML,oldContent,'No resize work after unmount');
for(const records of [[],courses.slice(0,2)]){
 const shelf=homeCourseShelf(records);root.innerHTML=shelf.html;cleanup=shelf.mount(root);
 assert(root.querySelector('.home-course-navigation').hidden);assert.equal(root.querySelector('.home-course-track').tabIndex,-1);assert.equal(root.querySelectorAll('.course-card').length,records.length);
 if(!records.length)assert.match(root.textContent,/Todavía no hay capacitaciones/);
 cleanup();
}
dom.window.close();console.log('OK Inicio: todas las tarjetas, máximo tres filas, navegación lateral, teclado, deslizamiento, adaptación, foco conservado, movimiento reducido y limpieza.');
