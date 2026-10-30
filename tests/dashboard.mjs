import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import fs from 'node:fs';
const dom=new JSDOM('<body><main></main></body>',{url:'http://localhost/la-academia/#admin'});
for(const key of ['window','document','Event'])globalThis[key]=dom.window[key];
// jsdom does not enforce CSP. Reject blocked inline markup at the render boundary
// so a template cannot pass these tests with percentages the real browser ignores.
const html=Object.getOwnPropertyDescriptor(window.Element.prototype,'innerHTML');
Object.defineProperty(window.Element.prototype,'innerHTML',{...html,set(value){assert(!/\sstyle\s*=/i.test(String(value)),'Chart markup must work under the production CSP');html.set.call(this,value);}});
const kernel=fs.readFileSync(new URL('../backend/src/Http/WebKernel.php',import.meta.url),'utf8');
assert.match(kernel,/style-src 'self';/,'The fix must preserve the production style policy');
const courses=[{id:1,title:'Curso <seguro>',category:'SSOMA',status:'published',view_count:5}],events=[{id:1,title:'Evento',category:'General',active:1,view_count:20}];
courses.push({id:3,title:'Borrador con historial',status:'draft',view_count:300},{id:4,title:'Archivado',status:'archived',view_count:400});events.push({id:5,title:'Evento inactivo',active:'0',view_count:500});
const summary={courses:2,published:1,evaluations:12,score_averages:[{course_id:1,title:'Curso <seguro>',average_score:16.5,minimum_score:10,maximum_score:20,participant_count:8,top_scores:[20,19,18,18,17,16,14,10]},{course_id:2,title:'Otro curso',average_score:12,minimum_score:8,maximum_score:18,participant_count:4,top_scores:[18,14,8,8]}]};
let calls=0;
globalThis.fetch=async url=>{calls++;const path=new URL(url).pathname.split('/api/v1/')[1];const data=path==='admin/reports/summary'?structuredClone(summary):path==='admin/courses'?structuredClone(courses):path==='admin/events'?structuredClone(events):[];return {ok:true,json:async()=>({data})};};
const {overviewPage}=await import('../public/frontend/pages/admin-home.js');
const root=document.querySelector('main'),page=await overviewPage({role:'superadmin'});root.innerHTML=page.html;const cleanup=page.mount(root);
const changeTop=limit=>{const before=calls,select=root.querySelector('[data-ranking-limit]');select.focus();select.value=String(limit);select.dispatchEvent(new Event('change',{bubbles:true}));assert.equal(root.querySelector('[data-ranking-limit]'),select,'The control stays mounted');assert.equal(document.activeElement,select,'Changing Top keeps keyboard focus');assert.equal(calls,before,'Ranking size changes locally');select.blur();};
assert.equal(root.querySelector('[data-chart-item="2"] .dashboard-column-track>i').style.left,'60%','12/20 places the average marker at 60%');
assert.equal(root.querySelector('[data-chart-item][aria-pressed="true"] .dashboard-column-track>span').style.left,'50%');
assert.equal(root.querySelector('[data-chart-item][aria-pressed="true"] .dashboard-column-track>span').style.width,'50%');
assert.equal(root.querySelector('[data-chart-item][aria-pressed="true"] .dashboard-column-track>i').style.left,'82.5%');
assert.equal(root.querySelector('#home-chart-title').textContent,'Promedio de notas por capacitación','The interactive score chart is the default dashboard view');assert(root.querySelector('#score-insight'),'The score drill-down is visible immediately');root.querySelector('[data-dashboard-chart="views"]').click();
assert.equal(root.querySelector('.dashboard-metric>strong').textContent,'25');
assert.equal(root.querySelector('#home-chart-summary').textContent,'25 vistas · 2 publicaciones');
assert.equal(root.querySelector('#home-chart-title').textContent,'Vistas por publicación');
assert.equal(root.querySelectorAll('#home-chart .dashboard-column').length,2);
assert.equal(root.querySelector('#home-chart .dashboard-column-track > span').style.width,'100%');
assert.equal(root.querySelectorAll('#home-chart .dashboard-column-track > span')[1].style.width,'25%');
assert(root.querySelectorAll('#home-chart .dashboard-column-track:not(.is-range)').length===2,'Counts use horizontal bars');
assert.equal(root.querySelectorAll('.dashboard-analytics a').length,0,'Charts display data without navigation links');
assert.equal(root.querySelector('#home-chart').getAttribute('aria-labelledby'),'home-chart-title');
assert.match(root.querySelectorAll('#home-chart .dashboard-column')[1].textContent,/Curso <seguro>/);assert.equal(root.querySelector('seguro'),null);
assert(!root.querySelector('#home-chart').textContent.includes('Borrador'));assert(!root.querySelector('#home-chart').textContent.includes('inactivo'));
assert.equal(root.querySelector('#views-insight h3').textContent,'Evento');assert.match(root.querySelector('#views-insight').textContent,/Vistas acumuladas20/);assert.match(root.querySelector('#views-insight').textContent,/Del total filtrado80/);
assert.equal(root.querySelector('[data-chart-item="event:1"]').getAttribute('aria-describedby'),'views-insight');
root.querySelector('[data-chart-item="course:1"]').click();assert.equal(root.querySelector('#views-insight h3').textContent,'Curso <seguro>','Events and courses with the same ID remain distinct');assert.match(root.querySelector('#views-insight').textContent,/Vistas acumuladas5/);assert.match(root.querySelector('#views-insight').textContent,/Del total filtrado20/);
changeTop(10);assert.equal(root.querySelectorAll('#views-insight li').length,2);assert.match(root.querySelector('#views-insight').textContent,/2 de 10 disponibles/);
assert.equal(root.querySelectorAll('#views-insight .dashboard-rank-track>i')[1].style.width,'25%','Compact ranking bars keep the actual proportions');
root.querySelector('[data-chart-item="event:1"]').dispatchEvent(new dom.window.FocusEvent('focusin',{bubbles:true}));assert.equal(root.querySelector('#views-insight h3').textContent,'Evento');root.querySelector('#home-chart').dispatchEvent(new dom.window.FocusEvent('focusout',{bubbles:true,relatedTarget:null}));assert.equal(root.querySelector('#views-insight h3').textContent,'Curso <seguro>');
root.querySelector('[data-dashboard-chart="scores"]').click();assert.equal(root.querySelector('#home-chart-title').textContent,'Promedio de notas por capacitación');assert.equal(root.querySelector('#home-chart .dashboard-column-value').textContent,'16.5 / 20');assert.equal(root.querySelector('#home-chart .dashboard-column-track > i').style.left,'82.5%');assert(root.querySelector('#home-chart-toolbar').hidden);
const scoreButtons=[...root.querySelectorAll('[data-chart-item]')];assert.equal(scoreButtons.length,2);assert.equal(scoreButtons[0].getAttribute('aria-pressed'),'true');assert.equal(root.querySelector('#score-insight h3').textContent,'Curso <seguro>');assert.match(root.querySelector('#score-insight').textContent,/Promedio exacto16.5/);assert.match(root.querySelector('#score-insight').textContent,/Mínimo10/);assert.match(root.querySelector('#score-insight').textContent,/Máximo20/);assert.doesNotMatch(root.querySelector('#score-insight').textContent,/Muestra|N =/);assert.equal(root.querySelectorAll('#score-insight .dashboard-top-scores li').length,3);
changeTop(5);assert.equal(root.querySelectorAll('#score-insight li').length,5);changeTop(10);assert.equal(root.querySelectorAll('#score-insight li').length,8);assert.match(root.querySelector('#score-insight').textContent,/8 de 10 disponibles/);
assert.equal(root.querySelectorAll('#score-insight .dashboard-rank-track>i')[1].style.height,'95%');assert.equal(root.querySelectorAll('#score-insight .dashboard-rank-track>i')[7].style.height,'50%','Changing Top reapplies the mini-chart geometry');
scoreButtons[1].dispatchEvent(new dom.window.MouseEvent('mouseover',{bubbles:true}));assert.equal(root.querySelector('#score-insight h3').textContent,'Otro curso','Hover previews another category');root.querySelector('#home-chart').dispatchEvent(new dom.window.MouseEvent('mouseleave'));assert.equal(root.querySelector('#score-insight h3').textContent,'Curso <seguro>','Leaving restores the selected category');scoreButtons[1].click();assert.equal(scoreButtons[1].getAttribute('aria-pressed'),'true');assert.equal(root.querySelector('#score-insight h3').textContent,'Otro curso','Click persists the drill-down selection');
assert.equal(root.querySelector('[data-chart-item][aria-pressed="true"] .dashboard-column-track>span').style.left,'40%');assert.equal(root.querySelector('[data-chart-item][aria-pressed="true"] .dashboard-column-track>span').style.width,'50%');assert.equal(root.querySelector('[data-chart-item][aria-pressed="true"] .dashboard-column-track>i').style.left,'60%','Selecting another course also updates range geometry');
scoreButtons[0].dispatchEvent(new dom.window.FocusEvent('focusin',{bubbles:true}));assert.equal(root.querySelector('.is-preview .dashboard-column-track>i').style.left,'82.5%');root.querySelector('#home-chart').dispatchEvent(new dom.window.FocusEvent('focusout',{bubbles:true,relatedTarget:null}));assert.equal(root.querySelector('[data-chart-item][aria-pressed="true"] .dashboard-column-track>i').style.left,'60%','Leaving keyboard preview restores selected geometry');
root.querySelector('[data-dashboard-chart="participation"]').click();assert.equal(root.querySelector('#home-chart-title').textContent,'Resultados por capacitación');assert.equal(root.querySelector('#home-chart .dashboard-column-value').textContent,'8');assert.equal(root.querySelector('#home-chart .dashboard-column-track > span').style.width,'100%');
assert.equal(root.querySelectorAll('.dashboard-column-track>span')[1].style.width,'50%','Participation columns use the same scale');
assert.equal(root.querySelector('#participation-insight h3').textContent,'Curso <seguro>');assert.match(root.querySelector('#participation-insight').textContent,/Resultados completados8/);assert.match(root.querySelector('#participation-insight').textContent,/Del total filtrado66.67/);
root.querySelector('[data-chart-item="2"]').click();assert.equal(root.querySelector('#participation-insight h3').textContent,'Otro curso');assert.match(root.querySelector('#participation-insight').textContent,/Resultados completados4/);changeTop(5);assert.equal(root.querySelectorAll('#participation-insight li').length,2);
root.querySelector('[data-dashboard-chart="views"]').click();assert.equal(root.querySelector('#home-chart-toolbar').hidden,false);
const filter=root.querySelector('#home-publication-type'),before=calls;filter.value='course';filter.dispatchEvent(new Event('change'));assert.equal(calls,before);
assert.equal(root.querySelectorAll('#home-chart .dashboard-column').length,1);
assert.equal(root.querySelector('#views-insight h3').textContent,'Curso <seguro>');assert.equal(root.querySelector('[data-ranking-limit]').value,'10');assert.equal(root.querySelectorAll('#views-insight li').length,1);assert.match(root.querySelector('#views-insight').textContent,/Del total filtrado100/);
assert.equal(root.querySelector('.dashboard-column-track>span').style.width,'62.5%','Filtering reapplies geometry with the new scale');
courses[0].view_count=30;summary.score_averages[0].average_score=18;window.dispatchEvent(new Event('academia-activity-updated'));for(let i=0;i<40;i++)await Promise.resolve();
assert.equal(root.querySelector('.dashboard-metric>strong').textContent,'50');assert.equal(filter.value,'course');assert.equal(root.querySelector('#home-chart .dashboard-column-value').textContent,'30');
assert.equal(root.querySelector('.dashboard-column-track>span').style.width,'93.75%','Live update changes bar height');
root.querySelector('[data-dashboard-chart="scores"]').click();assert.equal(root.querySelector('#home-chart .dashboard-column-value').textContent,'18 / 20');
assert.equal(root.querySelector('#score-insight h3').textContent,'Otro curso');assert.equal(root.querySelector('[data-ranking-limit]').value,'10','Top choice survives refresh and tab changes');assert.equal(root.querySelectorAll('#score-insight li').length,4);
assert.equal(root.querySelector('[data-chart-item="1"] .dashboard-column-track>i').style.left,'90%');
summary.score_averages[0].average_score=20;summary.score_averages[1].average_score=0;window.dispatchEvent(new Event('academia-activity-updated'));for(let i=0;i<40;i++)await Promise.resolve();
assert.equal(root.querySelector('[data-chart-item="1"] .dashboard-column-track>i').style.left,'100%');assert.equal(root.querySelector('[data-chart-item="2"] .dashboard-column-track>i').style.left,'0%');assert.match(root.querySelector('[data-chart-item="2"]').getAttribute('aria-label'), /0 \/ 20/);
root.querySelector('[data-dashboard-chart="views"]').click();courses[0].view_count=0;events[0].view_count=0;window.dispatchEvent(new Event('academia-activity-updated'));for(let i=0;i<40;i++)await Promise.resolve();assert.equal(root.querySelector('#home-chart .dashboard-column-track > span').style.width,'0%');assert(!root.innerHTML.includes('NaN'));
courses[0].status='draft';events[0].active=0;window.dispatchEvent(new Event('academia-activity-updated'));for(let i=0;i<40;i++)await Promise.resolve();assert.equal(root.querySelector('.dashboard-metric>strong').textContent,'0');assert.equal(root.querySelectorAll('#home-chart .dashboard-column').length,0);
cleanup();const after=calls;window.dispatchEvent(new Event('academia-activity-updated'));assert.equal(calls,after);// Trainer overview requests only site-scoped course data and keeps event management as a shortcut.
const {invalidateNavigationCache}=await import('../public/frontend/api.js?v=20261030-8');invalidateNavigationCache();
// More than ten entries exercise each limit without truncating chart totals or bars.
summary.score_averages=Array.from({length:12},(_,i)=>({course_id:100+i,title:`Ranking ${String(i+1).padStart(2,'0')}`,average_score:20-i/2,minimum_score:20-i/2,maximum_score:20-i/2,participant_count:24-i,top_scores:Array(10).fill(20-i/2)}));
courses.splice(0,courses.length,...summary.score_averages.map(row=>({id:row.course_id,title:row.title,status:'published',view_count:row.participant_count})));
const largePage=await overviewPage({role:'superadmin'});root.innerHTML=largePage.html;const largeCleanup=largePage.mount(root);
for(const chart of ['scores','views','participation']){
  root.querySelector(`[data-dashboard-chart="${chart}"]`).click();
  const beforeSummary=root.querySelector('#home-chart-summary').textContent;
  for(const limit of [3,5,10]){changeTop(limit);assert.equal(root.querySelectorAll('[data-ranking-results] li').length,limit,`${chart}: Top ${limit}`);assert.equal(root.querySelectorAll('[data-chart-item]').length,5,'Main chart is capped at five rows');assert.equal(root.querySelector('#home-chart-summary').textContent,beforeSummary);}
  assert.equal(root.querySelector('[data-ranking-results] li strong').textContent,chart==='scores'?'20':'1. Ranking 01');
  const beforePage=calls,scale=root.querySelector('.dashboard-scale').textContent;
  assert(root.querySelector('[data-chart-page="-1"]').disabled);root.querySelector('[data-chart-page="1"]').click();
  assert.equal(root.querySelectorAll('[data-chart-item]').length,5);assert.equal(root.querySelector('.dashboard-scale').textContent,scale,'Scale remains stable between pages');
  root.querySelector('[data-chart-page="1"]').click();assert.equal(root.querySelectorAll('[data-chart-item]').length,2);assert(root.querySelector('[data-chart-page="1"]').disabled);assert.equal(calls,beforePage,'Pagination stays local');
  assert.equal(root.querySelector('.dashboard-chart-pagination [role="status"]').textContent,'11–12 de 12');
  if(chart!=='scores'){root.querySelector('[data-ranking-item="'+(chart==='views'?'course:109':'109')+'"]').click();assert.equal(root.querySelector('.dashboard-score-insight h3').textContent,'Ranking 10');assert.equal(document.activeElement.dataset.chartItem,chart==='views'?'course:109':'109');root.querySelector('[data-chart-page="1"]').click();}
  root.querySelector('[data-chart-item="'+(chart==='views'?'course:111':'111')+'"]').click();
}
summary.score_averages.pop();courses.pop();window.dispatchEvent(new Event('academia-activity-updated'));for(let i=0;i<40;i++)await Promise.resolve();
for(const chart of ['scores','views','participation']){root.querySelector(`[data-dashboard-chart="${chart}"]`).click();assert.equal(root.querySelector('.dashboard-score-insight h3').textContent,'Ranking 01','Removed selections fall back to a visible row');assert.equal(root.querySelector('[data-ranking-limit]').value,'10');}
summary.score_averages=[];window.dispatchEvent(new Event('academia-activity-updated'));for(let i=0;i<40;i++)await Promise.resolve();
for(const chart of ['scores','participation']){root.querySelector(`[data-dashboard-chart="${chart}"]`).click();assert.equal(root.querySelector('.dashboard-score-insight'),null);assert.equal(root.querySelector('[data-ranking-limit]'),null);assert.equal(root.querySelector('[data-chart-item]'),null);}
largeCleanup();invalidateNavigationCache();
let eventReads=0;
globalThis.fetch=async url=>{const path=new URL(url).pathname.split('/api/v1/')[1];if(path==='admin/events')eventReads++;return {ok:true,json:async()=>({data:path==='admin/reports/summary'?structuredClone(summary):path==='admin/courses'?structuredClone(courses):[]})};};
const trainerPage=await overviewPage({role:'capacitador',site_name:'Sede sintética'});root.innerHTML=trainerPage.html;const trainerCleanup=trainerPage.mount(root);
assert.equal(eventReads,0);assert(root.textContent.includes('Sede sintética'));assert(root.textContent.includes('Borradores'));assert(![...root.querySelectorAll('.dashboard-metric-label')].some(label=>label.textContent==='Eventos'));
assert(root.querySelector('a[href="#admin/eventos"]'));assert(!root.querySelector('a[href="#admin/usuarios"]'));
root.querySelector('[data-dashboard-chart="views"]').click();assert(root.querySelector('#home-chart-toolbar').hidden);trainerCleanup();
dom.window.close();
console.log('OK Inicio DOM: geometría, detalles de los tres gráficos, Top 3/5/10 compacto, paginación, foco, selección, filtros, actualización y sedes.');
