// Real-browser regression harness. Synthetic data only; never connects to MySQL.
// Run: node tests/dashboard-browser.mjs, then open the printed loopback URL.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const publicRoot=path.join(root,'public');
const kernel=fs.readFileSync(path.join(root,'backend/src/Http/WebKernel.php'),'utf8');
const csp=kernel.match(/header\("Content-Security-Policy: ([^"]+)"\)/)?.[1];
if(!csp)throw Error('Cannot read production CSP.');
const html='<!doctype html><html lang="es" class="academy-ui"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prueba visual de gráficos</title><link rel="stylesheet" href="/assets/styles.css"><link rel="stylesheet" href="/assets/learning.css"><link rel="stylesheet" href="/assets/design-system.css"><script type="module" src="/dashboard-fixture.js"></script></head><body><section class="container"><p>PRUEBA CON DATOS SINTÉTICOS · misma política de estilos que producción</p><button id="verify" class="button primary" type="button">Comprobar los tres gráficos</button><p id="verification" role="status">Pendiente</p><main id="fixture"></main></section><div id="toast" hidden></div></body></html>';
const fixture=`
import {overviewPage} from '/frontend/pages/admin-home.js';
const courses=[{id:1,title:'Capacitación de ejemplo',category:'Pruebas',status:'published',view_count:12},{id:2,title:'Sin visitas',category:'Pruebas',status:'published',view_count:0}];
const events=[{id:3,title:'Evento de ejemplo',active:1,view_count:20}];
const summary={courses:2,published:2,evaluations:12,score_averages:[{course_id:1,title:'Promedio doce',average_score:12,minimum_score:8,maximum_score:16,participant_count:6,top_scores:[16,12,8]},{course_id:2,title:'Promedio veinte',average_score:20,minimum_score:20,maximum_score:20,participant_count:4,top_scores:[20]},{course_id:3,title:'Promedio cero',average_score:0,minimum_score:0,maximum_score:0,participant_count:2,top_scores:[0]}]};
window.fetch=async url=>{const route=new URL(url).pathname.split('/api/v1/')[1];const data=route==='admin/reports/summary'?structuredClone(summary):route==='admin/courses'?structuredClone(courses):route==='admin/events'?structuredClone(events):[];return {ok:true,json:async()=>({data})};};
const violations=[];document.addEventListener('securitypolicyviolation',event=>violations.push(event.violatedDirective));
const root=document.querySelector('#fixture'),page=await overviewPage({role:'superadmin'});root.innerHTML=page.html;page.mount(root);
const settle=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const approx=(actual,expected,label)=>{if(Math.abs(actual-expected)>1)throw Error(label+': '+actual.toFixed(2)+' px; esperado '+expected.toFixed(2)+' px');};
const bar=(title,ratio)=>{const column=[...root.querySelectorAll('.dashboard-column')].find(node=>node.querySelector('strong').textContent===title);if(!column)throw Error('Falta '+title);const track=column.querySelector('.dashboard-column-track'),fill=track.querySelector('span'),marker=track.querySelector('i'),rect=track.getBoundingClientRect();if(marker){const dot=marker.getBoundingClientRect();approx(dot.left+dot.width/2-rect.left,track.clientWidth*ratio,title);}else approx(fill.getBoundingClientRect().width,track.clientWidth*ratio,title);};
document.querySelector('#verify').addEventListener('click',async()=>{
  const result=document.querySelector('#verification');result.textContent='Comprobando…';
  try{
    root.querySelector('[data-dashboard-chart="scores"]').click();await settle();
    bar('Promedio doce',.6);bar('Promedio veinte',1);bar('Promedio cero',0);
    root.querySelector('[data-chart-item="1"]').click();await settle();
    const track=root.querySelector('[data-chart-item="1"] .dashboard-column-track'),range=track.querySelector('span'),marker=track.querySelector('i'),rect=track.getBoundingClientRect();
    approx(range.getBoundingClientRect().width,track.clientWidth*.4,'Rango 8–16');approx(range.getBoundingClientRect().left-rect.left,track.clientWidth*.4,'Inicio del rango');approx(marker.getBoundingClientRect().left+marker.getBoundingClientRect().width/2-rect.left,track.clientWidth*.6,'Promedio en el rango');
    root.querySelector('[data-dashboard-chart="views"]').click();await settle();bar('Evento de ejemplo',1);bar('Capacitación de ejemplo',.6);bar('Sin visitas',0);
    root.querySelector('[data-dashboard-chart="participation"]').click();await settle();bar('Promedio doce',.75);bar('Promedio veinte',.5);bar('Promedio cero',.25);
    root.querySelector('[data-dashboard-chart="scores"]').click();summary.score_averages[0].average_score=16;window.dispatchEvent(new Event('academia-activity-updated'));await settle();bar('Promedio doce',.8);
    summary.score_averages[0].average_score=12;window.dispatchEvent(new Event('academia-activity-updated'));await settle();bar('Promedio doce',.6);
    const original=structuredClone(summary.score_averages);
    summary.score_averages=Array.from({length:12},(_,i)=>({course_id:100+i,title:'Capacitación de prueba '+String(i+1).padStart(2,'0'),average_score:20-i/2,minimum_score:20-i/2,maximum_score:20-i/2,participant_count:24-i,top_scores:Array(10).fill(20-i/2)}));
    window.dispatchEvent(new Event('academia-activity-updated'));await settle();
    for(const chart of ['scores','participation']){
      root.querySelector('[data-dashboard-chart="'+chart+'"]').click();await settle();
      const select=root.querySelector('[data-ranking-limit]');select.value='10';select.dispatchEvent(new Event('change',{bubbles:true}));await settle();
      if(root.querySelectorAll('[data-chart-item]').length!==5||root.querySelectorAll('[data-ranking-results] li').length!==10)throw Error('Paginación o Top 10 incompleto');
      if(root.querySelector('[data-ranking-results]').getBoundingClientRect().height>260)throw Error('El Top 10 se extiende en una lista larga');
      root.querySelector('[data-chart-page="1"]').click();await settle();
      if(root.querySelector('.dashboard-chart-pagination [role="status"]').textContent!=='6–10 de 12')throw Error('Página incorrecta');
      if(document.documentElement.scrollWidth>document.documentElement.clientWidth+1)throw Error('Desbordamiento horizontal');
    }
    summary.score_averages=original;window.dispatchEvent(new Event('academia-activity-updated'));await settle();
    if(violations.length)throw Error('Violaciones CSP: '+violations.join(', '));
    result.textContent='OK: barras horizontales, rangos 0/12/20, actualización, cinco filas por página y Top 10 compacto. Sin bloqueos CSP.';
  }catch(error){result.textContent='FALLO: '+error.message;}
});
`;
const server=http.createServer((request,response)=>{
  response.setHeader('Content-Security-Policy',csp);response.setHeader('Cache-Control','no-store');
  const url=new URL(request.url,'http://127.0.0.1');
  if(url.pathname==='/'){response.setHeader('Content-Type','text/html; charset=utf-8');response.end(html);return;}
  if(url.pathname==='/dashboard-fixture.js'){response.setHeader('Content-Type','text/javascript; charset=utf-8');response.end(fixture);return;}
  const file=path.resolve(publicRoot,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(publicRoot+path.sep)||!['.css','.js','.woff2'].includes(path.extname(file))||!fs.existsSync(file)){response.writeHead(404);response.end();return;}
  response.setHeader('Content-Type',path.extname(file)==='.css'?'text/css':path.extname(file)==='.js'?'text/javascript':'font/woff2');fs.createReadStream(file).pipe(response);
});
server.listen(0,'127.0.0.1',()=>console.log('Dashboard visual regression: http://127.0.0.1:'+server.address().port+'/'));
