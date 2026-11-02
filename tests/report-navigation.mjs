import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><body><main></main></body>',{url:'http://localhost/la-academia/#admin/capacitaciones/resultados/1'});
for(const key of ['window','document','location','history','Event'])globalThis[key]=dom.window[key];
let reduced=false,animations=0,resolveOld=null,delay=false,fail=false;
globalThis.matchMedia=()=>({matches:reduced});
dom.window.HTMLElement.prototype.animate=function(){animations++;return {cancel(){}};};
const exams=[1,2,3].map(id=>({id,course_id:id===3?12:11,title:`Examen ${id}`,version:1,state:'open',opens_at:'2026-10-01 00:00:00',closes_at:null}));
const participant=id=>({name:`Participante ${id}`,dni:'12345678',job_title:'Supervisor de prueba',title:`Examen ${id}`,version:1,score:20,attempts:1,submitted_at:'2026-10-23 09:00:00'});
globalThis.fetch=async url=>{
  const u=new URL(url),path=u.pathname.split('/api/v1/')[1],id=u.searchParams.get('exam_id');
  if(path==='admin/reports/exams')return {ok:true,json:async()=>({data:exams})};
  if(u.searchParams.has('course_id')){assert.equal(u.searchParams.get('course_id'),'11');assert.equal(id,null);return {ok:true,json:async()=>({data:[participant(1),participant(2)]})};}
  if(delay&&id==='2')await new Promise(resolve=>resolveOld=resolve);
  if(fail){fail=false;return {ok:false,status:503,json:async()=>({error:{message:'Fallo temporal del reporte'}})};}
  return {ok:true,json:async()=>({data:[participant(id)]})};
};
const {reportsPage}=await import('../public/frontend/pages/admin-reports.js');
const flush=async()=>{for(let i=0;i<40;i++)await Promise.resolve();};
const page=await reportsPage('1'),root=document.querySelector('main');root.innerHTML=page.html;const cleanup=page.mount(root);
const selected=root.querySelector('#report-exam'),table=root.querySelector('#report-table'),exportButton=root.querySelector('#export-results');
const choose=id=>{selected.value=id;selected.dispatchEvent(new Event('change'));};
assert.match(table.textContent,/Participante 1/);assert.match(exportButton.href,/exams\/1\/export/);
delay=true;choose('2');await flush();assert.equal(location.hash,'#admin/capacitaciones/resultados/2');assert.equal(exportButton.getAttribute('aria-disabled'),'true');assert.equal(table.inert,true);assert.equal(root.querySelector('#report-loading').hidden,false);
choose('3');await flush();assert.match(table.textContent,/Participante 3/);assert.match(exportButton.href,/exams\/3\/export/);assert.equal(root.querySelector('#report-exam'),selected,'selector is not remounted');
resolveOld();await flush();assert.match(table.textContent,/Participante 3/,'stale response cannot overwrite newest exam');assert.equal(table.getAttribute('aria-busy'),'false');assert.equal(table.inert,false);assert.ok(animations>0);
const before=animations;reduced=true;delay=false;choose('1');await flush();assert.equal(animations,before,'respects reduced motion');
fail=true;choose('2');await flush();assert.match(table.textContent,/Fallo temporal/);assert.equal(exportButton.getAttribute('aria-disabled'),'true');assert.equal(root.querySelector('#report-loading').hidden,true);
choose('3');await flush();assert.match(table.textContent,/Participante 3/);assert.equal(exportButton.getAttribute('aria-disabled'),'false');
delay=true;choose('2');await flush();cleanup();resolveOld();await flush();assert.match(table.textContent,/Participante 3/,'unmounted view ignores late results');
const scoped=await reportsPage('','11');root.innerHTML=scoped.html;const end=scoped.mount(root);
assert.equal(root.querySelector('#report-exam').value,'curso/11');
assert.equal(root.querySelector('#report-table tbody').rows.length,2);
assert(!root.querySelector('#report-exam option[value="3"]'),'Otras capacitaciones quedan fuera del filtro');
assert.equal(root.querySelector('#export-results').hasAttribute('href'),false);
end();dom.window.close();
console.log('OK reportes DOM: cambio en la misma página, URL y exportación sincronizadas, respuestas fuera de orden, error/reintento, movimiento reducido y limpieza.');
