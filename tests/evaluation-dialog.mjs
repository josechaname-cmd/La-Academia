import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><body><main id="app"><button id="start-evaluation">Empezar evaluación</button></main></body>',{url:'http://localhost/la-academia/#curso/42'});
for(const key of ['window','document','FormData','AbortController','Event','CustomEvent'])globalThis[key]=dom.window[key];
dom.window.HTMLElement.prototype.scrollIntoView=function(){};
dom.window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
dom.window.HTMLDialogElement.prototype.close=function(){if(this.open){this.removeAttribute('open');this.dispatchEvent(new Event('close'));}};
let clock=0;globalThis.performance={now:()=>clock};
const intervals=new Map();let nextTimer=0;
globalThis.setInterval=fn=>{intervals.set(++nextTimer,fn);return nextTimer;};
globalThis.clearInterval=id=>intervals.delete(id);
let correctCount=8,maximum=3,minimum=14,lookupBlocked=false;
const requests=[];let failSend=false,failLookup=false,starts=0,lookups=0,delayStart=null;
const questions=Array.from({length:10},(_,i)=>({prompt:`Pregunta ${i+1} <segura>`,choices:['Primera','Segunda','Tercera']}));
globalThis.fetch=async(url,options={})=>{
 const path=new URL(url).pathname,body=options.body?JSON.parse(options.body):null;
 requests.push({path,body});
 if(path.endsWith('/session'))return {ok:true,json:async()=>({data:{user:null,csrf:'test'}})};
 if(path.endsWith('/attempts/participant')){
  lookups++;
  if(failLookup){failLookup=false;return {ok:false,status:404,json:async()=>({error:{message:'DNI no encontrado'}})};}
  return {ok:true,json:async()=>({data:{name:'Persona de Prueba',job_title:'Supervisora de Operaciones',site_name:'Breña',exam_policy:{max_attempts:maximum,passing_score:minimum,attempts_used:lookupBlocked?1:0,remaining:lookupBlocked?0:maximum,retry_block_reason:lookupBlocked?'target_reached':null}}})};
 }
 if(path.endsWith('/attempts')){
  starts++;
  if(delayStart)await delayStart;
  return {ok:true,json:async()=>({data:{token:`token-${starts}`,attempt:starts,version:1,max_attempts:maximum,passing_score:minimum,participant:{name:'Persona de Prueba',job_title:'Supervisora de Operaciones',site_name:'Breña'},questions,server_time:1000,expires_at:1060}})};
 }
 if(path.endsWith('/attempts/submit')){
  if(failSend){failSend=false;return {ok:false,status:503,json:async()=>({error:{message:'Conexión interrumpida'}})};}
  return {ok:true,json:async()=>({data:{score:correctCount*2,correct:correctCount,remaining:maximum-1,max_attempts:maximum,passing_score:minimum,passed:correctCount*2>=minimum,retry_allowed:true,review:questions.map((q,i)=>({prompt:q.prompt,correct:i<correctCount,selected:'Primera',answer:'Primera',explanation:'Explicación'}))}})};
 }
 throw new Error(`Unexpected ${path}`);
};
const {mountEvaluation}=await import('../public/frontend/components/evaluation-dialog.js');
const root=document.querySelector('#app'),launch=root.querySelector('button');
const course={id:42,title:'Capacitación <prueba>',exam:{state:'open',question_count:10,max_attempts:3,passing_score:14,duration_minutes:1}};
let cleanup=mountEvaluation(root,course);
const find=s=>document.querySelector(s);
const flush=async()=>{for(let i=0;i<40;i++)await Promise.resolve();};
function fillLearner(){
 find('[name="dni"]').value='12345678';find('[name="dni"]').dispatchEvent(new Event('input',{bubbles:true}));
}
async function start(){launch.click();fillLearner();find('#learner-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await flush();find('[data-start]').click();await flush();}
launch.click();assert(find('dialog').open);assert.equal(find('#learner-form')!==null,true);
assert.equal(find('[name="name"]'),null);assert.equal(find('[name="phone"]'),null);assert.equal(find('[name="area"]'),null);
assert(find('[data-lookup-dni]').disabled,'Lookup starts disabled until the DNI is complete');
assert(find('.evaluation-lookup-row > [data-lookup-dni]'),'Lookup action is next to the DNI field');
assert.equal(find('.evaluation-footer [data-lookup-dni]'),null,'Lookup action is not separated in the footer');
find('#learner-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await flush();assert.equal(lookups,0,'Invalid DNI cannot be consulted');
fillLearner();find('[data-dismiss]').click();assert(!find('dialog').open);launch.click();assert.equal(find('[name="dni"]').value,'12345678','Learner data survives close');
failLookup=true;find('#learner-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));assert(find('[data-lookup-dni]').disabled,'The lookup action disables immediately after submit');await flush();assert.equal(lookups,1);assert(find('[data-lookup-dni]').disabled,'A sent DNI remains locked after an error');
find('#learner-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await flush();assert.equal(lookups,1,'The same request cannot be repeated without editing the DNI');
find('[name="dni"]').value='1234567';find('[name="dni"]').dispatchEvent(new Event('input',{bubbles:true}));assert(find('[data-lookup-dni]').disabled,'Seven digits remain invalid');
fillLearner();assert(!find('[data-lookup-dni]').disabled,'Editing and completing the DNI enables a new lookup');
find('#learner-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await flush();assert.equal(lookups,2);assert.equal(starts,0);assert.match(find('.evaluation-participant').textContent,/Persona de Prueba/);assert.match(find('.evaluation-participant').textContent,/Supervisora de Operaciones/);assert.match(find('.evaluation-participant').textContent,/Breña/,'DNI lookup shows the employee site');
find('[data-start]').click();await flush();assert.equal(starts,1);const registration=requests.find(r=>r.path.endsWith('/attempts')&&r.body);assert.deepEqual(Object.keys(registration.body).sort(),['course_id','dni']);
assert.equal(find('#evaluation-title').textContent,'Pregunta 1 de 10');assert.match(find('.evaluation-sidebar').textContent,/Intento 1 de 3/);assert(!find('.evaluation-header script'));
assert.equal(document.querySelectorAll('.evaluation-question').length,1,'Only one question in the modal');
assert.equal(root.querySelector('.evaluation-question'),null,'Exam is not appended below the material');
const first=find('[name="evaluation-answer"][value="0"]');first.checked=true;first.dispatchEvent(new Event('change',{bubbles:true}));
assert.equal(find('#evaluation-progress').value,1);
find('[data-dismiss]').click();assert.equal(launch.textContent,'Continuar evaluación');
clock+=10000;launch.click();assert.equal(find('[name="evaluation-answer"][value="0"]').checked,true);assert.equal(find('#evaluation-clock').textContent,'00:50');
find('[data-question="9"]').click();find('[data-next]').click();assert(find('[data-submit]').disabled,'Incomplete answers cannot be sent');
find('[data-correct]').click();assert.equal(find('#evaluation-title').textContent,'Pregunta 2 de 10');
for(let i=1;i<10;i++){
 find(`[data-question="${i}"]`).click();const radio=find('[name="evaluation-answer"][value="0"]');radio.checked=true;radio.dispatchEvent(new Event('change',{bubbles:true}));
}
find('[data-next]').click();assert(!find('[data-submit]').disabled);
failSend=true;find('[data-submit]').click();find('[data-submit]').click();await flush();
assert.equal(requests.filter(r=>r.path.endsWith('/submit')).length,1,'Double submit is blocked');
assert(find('.evaluation-content').textContent.includes('Conexión interrumpida'));
assert.equal(find('[data-question="0"]').disabled,true,'Uncertain submission retains its exact payload');
clock+=70000;for(const fn of intervals.values())fn();
assert(!find('[data-submit]').disabled,'Can recover a possibly committed result after expiry');
find('[data-submit]').click();await flush();
const sends=requests.filter(r=>r.path.endsWith('/submit'));assert.equal(sends.length,2);assert.deepEqual(sends[0].body,sends[1].body);
assert.equal(find('#evaluation-title').textContent,'Tu resultado');assert.equal(intervals.size,0);assert.match(find('.evaluation-result').textContent,/Aprobado/);assert.match(find('.evaluation-result').textContent,/14 \/ 20/);assert.match(find('[data-retry]').textContent,/Volver a intentar/);
find('[data-finish]').click();assert.equal(launch.textContent,'Ver resultado');launch.click();assert.equal(find('#evaluation-title').textContent,'Tu resultado');
find('[data-retry]').click();assert(find('#learner-form'));assert.equal(find('[name="dni"]').readOnly,true);assert.match(find('.evaluation-participant').textContent,/Persona de Prueba/);
cleanup();assert.equal(find('dialog'),null);assert(!document.body.classList.contains('evaluation-open'));
cleanup=mountEvaluation(root,course);await start();clock+=61000;for(const fn of intervals.values())fn();
assert(find('[name="evaluation-answer"]').disabled,'Expired attempt prevents answer edits');assert(!find('#evaluation-expired').hidden);
cleanup();assert.equal(intervals.size,0);
// Perfect/90% scores suppress retry even if a stale/malformed response advertises slots.
for(const [correct,limit] of [[9,3],[10,3],[6,1]]){
 correctCount=correct;maximum=limit;cleanup=mountEvaluation(root,course);await start();
 for(let i=0;i<10;i++){find(`[data-question="${i}"]`).click();const radio=find('[name="evaluation-answer"][value="0"]');radio.checked=true;radio.dispatchEvent(new Event('change',{bubbles:true}));}
 find('[data-next]').click();find('[data-submit]').click();await flush();
 assert.equal(find('[data-retry]'),null);assert(!find('.evaluation-content').textContent.includes('Te quedan'));
 assert.match(find('.evaluation-result').textContent,correct>=9?/Aprobado/:/No aprobado/);cleanup();
}
lookupBlocked=true;cleanup=mountEvaluation(root,course);launch.click();fillLearner();find('#learner-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await flush();assert.equal(find('[data-start]'),null);assert.match(find('.evaluation-content').textContent,/Ya alcanzaste el 90/);cleanup();lookupBlocked=false;
// A request finishing after leaving the course must never recreate UI or timers.
cleanup=mountEvaluation(root,course);let resolveStart;delayStart=new Promise(resolve=>resolveStart=resolve);
launch.click();fillLearner();find('#learner-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await flush();find('[data-start]').click();await flush();cleanup();resolveStart();await flush();
assert.equal(find('dialog'),null);assert.equal(intervals.size,0);
console.log('OK flujo DOM sin navegador: DNI junto al botón, bloqueo de repetición, nombre/cargo de base, registro mínimo, modal, progreso, plazo, revisión, reintento y limpieza asíncrona.');
