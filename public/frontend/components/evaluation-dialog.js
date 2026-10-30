import {command} from '../api.js?v=20261030-1';
import {escape,field,errorBox,icon} from './common.js?v=20261030-1';
import {attachValidation} from './form-validation.js?v=20261030-1';
import {closeIcon,previousIcon,nextIcon} from './gallery-icons.js?v=20261030-1';
import {evaluationState,remainingLabel} from './evaluation-state.js?v=20261030-1';

export function mountEvaluation(root,course) {
  const launch=root.querySelector('#start-evaluation');
  const dialog=document.createElement('dialog');
  dialog.className='evaluation-dialog';
  dialog.setAttribute('aria-labelledby','evaluation-title');
  document.body.append(dialog);
  const listeners=new AbortController();
  let phase='learner',participant=null,attempt=null,state=null,result=null,index=0;
  let pending=false,lookupLocked=false,disposed=false,timer=null,notice='',submittedPayload=null;
  const learner={dni:''};
  const on=(target,type,fn)=>target.addEventListener(type,fn,{signal:listeners.signal});

  function syncLaunch() {
    launch.disabled=phase==='learner'&&course.exam?.state!=='open';
    launch.textContent=phase==='result'?'Ver resultado':phase==='learner'?'Empezar evaluación':'Continuar evaluación';
  }
  function focusTitle() {
    if(dialog.open)dialog.querySelector('#evaluation-title')?.focus({preventScroll:true});
  }
  function frame(title,body,footer='',wide=false) {
    dialog.classList.toggle('evaluation-wide',wide);
    dialog.innerHTML=`<div class="evaluation-shell"><header class="evaluation-header"><div><span class="eyebrow">${escape(course.title)}</span><h2 id="evaluation-title" tabindex="-1">${escape(title)}</h2></div><button type="button" class="evaluation-close" data-dismiss aria-label="Volver al material">${closeIcon}</button></header><div class="evaluation-content">${body}</div>${footer?`<footer class="evaluation-footer">${footer}</footer>`:''}</div>`;
    dialog.querySelector('[data-dismiss]').addEventListener('click',()=>dialog.close());
  }
  function showLearner() {
    phase='learner';
    const identified=!!participant;
    const policy=participant?.exam_policy,maximum=Number(policy?.max_attempts??course.exam?.max_attempts)||2,minimum=policy&&Object.hasOwn(policy,'passing_score')?policy.passing_score:course.exam?.passing_score;
    const canStart=!policy||Number(policy.remaining)>0;
    const validDni=/^[0-9]{8}$/.test(learner.dni);
    const lookupDisabled=pending||lookupLocked||!validDni;
    const dniState=identified?'readonly':`aria-describedby="dni-help" ${pending?'readonly':''}`;
    const dniField=field('DNI','dni',learner.dni,`required pattern="[0-9]{8}" maxlength="8" inputmode="numeric" autocomplete="off" ${dniState}`);
    const lookup=identified?`<div class="evaluation-lookup-row is-identified">${dniField}</div>`:`<div class="evaluation-lookup-row">${dniField}<button type="submit" class="button primary" data-lookup-dni ${lookupDisabled?'disabled':''}>${pending?'Consultando…':'Consultar DNI'}</button></div><p class="evaluation-lookup-help" id="dni-help">${lookupLocked&&notice?'Modifica el DNI para realizar una nueva consulta.':'Escribe los 8 dígitos del DNI.'}</p>`;
    const footer=`<button type="button" class="button white" data-dismiss-footer>Volver al material</button>${identified&&canStart?`<button type="button" data-start form="learner-form" class="button primary" ${pending?'disabled':''}>${pending?'Iniciando…':'Iniciar evaluación'} ${nextIcon}</button>`:''}`;
    frame('Antes de comenzar',`<p>${identified?'Confirma tus datos antes de iniciar.':'Ingresa tu DNI para consultar tus datos en la base de colaboradores.'}</p><form id="learner-form">${lookup}${identified?`<dl class="evaluation-participant"><div><dt>Nombre completo</dt><dd>${escape(participant.name)}</dd></div><div><dt>Cargo</dt><dd>${escape(participant.job_title)}</dd></div><div><dt>Sede</dt><dd>${escape(participant.site_name||'Sin sede asignada')}</dd></div></dl><button type="button" class="link-button" data-change-dni>Consultar otro DNI</button>`:''}<div class="evaluation-info"><span><small>Preguntas</small><strong>${Number(course.exam?.question_count)||0}</strong></span><span><small>Tiempo por intento</small><strong>${course.exam?.duration_minutes?`${Number(course.exam.duration_minutes)} min`:'Según disponibilidad'}</strong></span><span><small>Máximo de intentos</small><strong>${maximum}</strong></span><span><small>Nota mínima / 20</small><strong>${minimum!=null?Number(minimum):'Sin mínimo definido'}</strong></span></div>${policy&&!canStart?`<div class="ui-alert" data-tone="info">${policy.retry_block_reason==='target_reached'?'Ya alcanzaste el 90 % de aciertos o más. No corresponde otro intento.':'Ya utilizaste todos los intentos permitidos para esta versión.'}</div>`:`<p class="hint">${policy?`Has enviado ${Number(policy.attempts_used)} de ${maximum} intentos. `:''}${maximum>1?'Solo podrás volver a intentar con menos del 90 % de aciertos y dentro del límite permitido.':'Tienes un único intento disponible.'}</p>`}<p class="hint">El tiempo empieza al iniciar. Volver al material no pausa el reloj. Las respuestas se conservan solo mientras permanezcas en esta capacitación.</p><div id="learner-error" role="alert">${notice?errorBox({message:notice}):''}</div></form>`,footer);
    const form=dialog.querySelector('#learner-form'),validate=attachValidation(form);
    const dniInput=form.elements.dni,lookupButton=dialog.querySelector('[data-lookup-dni]');
    dialog.querySelector('[data-dismiss-footer]').addEventListener('click',()=>dialog.close());
    dniInput.addEventListener('input',()=>{
      const normalized=dniInput.value.replace(/\D/g,'').slice(0,8);
      if(dniInput.value!==normalized)dniInput.value=normalized;
      learner.dni=normalized;lookupLocked=false;notice='';
      if(lookupButton)lookupButton.disabled=!/^[0-9]{8}$/.test(normalized);
      const help=dialog.querySelector('#dni-help');if(help)help.textContent='Escribe los 8 dígitos del DNI.';
      dialog.querySelector('#learner-error')?.replaceChildren();
    });
    dialog.querySelector('[data-change-dni]')?.addEventListener('click',()=>{participant=null;learner.dni='';lookupLocked=false;notice='';render();dialog.querySelector('[name="dni"]')?.focus();});
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      if(pending||participant||lookupLocked||!validate())return;
      learner.dni=dniInput.value;lookupLocked=true;pending=true;notice='';render();
      try {
        const data=await command('exam','participant',{dni:learner.dni,course_id:Number(course.id)});
        if(disposed)return;
        participant=data;
      } catch(error) {
        if(disposed)return;
        notice=error.message;
      } finally {
        pending=false;
        if(!disposed){render();syncLaunch();if(participant)focusTitle();else dialog.querySelector('[name="dni"]')?.focus();}
      }
    });
    dialog.querySelector('[data-start]')?.addEventListener('click',startAttempt);
  }
  async function startAttempt() {
    if(pending||!participant)return;
    pending=true;notice='';render();
    try {
      const data=await command('exam','start',{dni:learner.dni,course_id:Number(course.id)});
      if(disposed)return;
      participant=data.participant||participant;attempt=data;state=evaluationState(data);index=0;result=null;submittedPayload=null;phase='question';
      timer=setInterval(tick,1000);
    } catch(error) {
      if(disposed)return;
      notice=error.message;
      if(error.code==='identification_required'){participant=null;lookupLocked=false;}
      if(['target_reached','attempt_limit'].includes(error.code)&&participant)participant.exam_policy={...(participant.exam_policy||{}),remaining:0,retry_block_reason:error.code==='target_reached'?'target_reached':'limit_reached'};
    } finally {
      pending=false;
      if(!disposed){render();syncLaunch();focusTitle();}
    }
  }
  function progressHtml() {
    return `<p class="hint">Intento ${attempt.attempt} de ${Number(attempt.max_attempts??course.exam?.max_attempts)||2} · Versión ${attempt.version}</p><div class="evaluation-status"><span id="evaluation-progress-text" aria-live="polite">${state.completed()} de ${attempt.questions.length} respondidas</span><span class="evaluation-clock" id="evaluation-clock" role="timer" aria-label="Tiempo restante">${remainingLabel(state.remaining())}</span></div><progress id="evaluation-progress" value="${state.completed()}" max="${attempt.questions.length}" aria-label="Preguntas respondidas"></progress><p id="evaluation-expired" class="evaluation-time-warning" role="status" ${state.remaining()===0?'':'hidden'}>El tiempo terminó. ${submittedPayload?'Puedes comprobar si el envío anterior se registró.':'El servidor ya no admite nuevos envíos de este intento.'}</p>`;
  }
  function navHtml() {
    return `<nav class="evaluation-question-nav" aria-label="Preguntas del examen">${attempt.questions.map((_,i)=>`<button type="button" data-question="${i}" class="${state.answers[i]!==null?'is-answered':''}" ${phase==='question'&&i===index?'aria-current="step"':''} aria-label="Pregunta ${i+1}, ${state.answers[i]===null?'pendiente':'respondida'}" ${pending||submittedPayload?'disabled':''}>${i+1}</button>`).join('')}</nav>`;
  }
  function bindNavigation() {
    dialog.querySelectorAll('[data-question]').forEach(button=>button.addEventListener('click',()=>{index=Number(button.dataset.question);phase='question';notice='';render();focusTitle();}));
  }
  function showQuestion() {
    const question=attempt.questions[index];
    frame(`Pregunta ${index+1} de ${attempt.questions.length}`,`<div class="evaluation-workspace"><aside class="evaluation-sidebar">${progressHtml()}${navHtml()}<p class="hint">Selecciona un número para revisar esa pregunta.</p></aside><div><fieldset class="evaluation-question"><legend>${escape(question.prompt)}</legend>${question.choices.map((choice,value)=>`<label class="evaluation-answer"><input type="radio" name="evaluation-answer" value="${value}" ${state.answers[index]===value?'checked':''} ${state.remaining()===0?'disabled':''}><span class="evaluation-letter" aria-hidden="true">${'ABC'[value]}</span><span>${escape(choice)}</span></label>`).join('')}</fieldset><p class="hint">Puedes revisar y cambiar tus respuestas antes de enviarlas.</p></div></div>`,`<button type="button" class="button white" data-previous ${index===0?'disabled':''}>${previousIcon} Anterior</button><button type="button" class="button primary" data-next>${index===attempt.questions.length-1?'Revisar respuestas':'Siguiente'} ${nextIcon}</button>`,true);
    bindNavigation();
    dialog.querySelectorAll('[name="evaluation-answer"]').forEach(input=>input.addEventListener('change',()=>{
      state.choose(index,Number(input.value));
      dialog.querySelector('#evaluation-progress').value=state.completed();
      dialog.querySelector('#evaluation-progress-text').textContent=`${state.completed()} de ${attempt.questions.length} respondidas`;
      const button=dialog.querySelector(`[data-question="${index}"]`);button.classList.add('is-answered');button.setAttribute('aria-label',`Pregunta ${index+1}, respondida`);
    }));
    dialog.querySelector('[data-previous]').addEventListener('click',()=>{index--;render();focusTitle();});
    dialog.querySelector('[data-next]').addEventListener('click',()=>{if(index===attempt.questions.length-1)phase='review';else index++;render();focusTitle();});
  }
  function showReview() {
    const missing=state.missing();
    frame('Revisa antes de enviar',`${progressHtml()}<p>${submittedPayload?'El envío está preparado. Si hubo un problema de conexión, reintenta con las mismas respuestas.':missing<0?'Has respondido todas las preguntas. Puedes corregir una respuesta o enviar tu evaluación.':'Todavía quedan preguntas pendientes. Selecciónalas para completarlas.'}</p><ol class="evaluation-summary">${attempt.questions.map((question,i)=>`<li><button type="button" data-question="${i}" ${pending||submittedPayload?'disabled':''}><strong>${i+1}. ${escape(question.prompt)}</strong><span class="${state.answers[i]===null?'evaluation-missing':''}">${state.answers[i]===null?'Sin responder':escape(question.choices[state.answers[i]])}</span></button></li>`).join('')}</ol><div role="alert">${notice?errorBox({message:notice}):''}</div>`,`<button type="button" class="button white" data-correct ${pending||submittedPayload?'disabled':''}>${missing<0?'Volver a las preguntas':'Completar pendientes'}</button><button type="button" class="button primary" data-submit ${pending||missing>=0||(state.remaining()===0&&!submittedPayload)?'disabled':''}>${pending?'Enviando…':submittedPayload?'Reintentar envío':'Enviar evaluación'}</button>`,true);
    bindNavigation();
    dialog.querySelector('[data-correct]').addEventListener('click',()=>{index=missing<0?0:missing;phase='question';render();focusTitle();});
    dialog.querySelector('[data-submit]').addEventListener('click',submit);
  }
  async function submit() {
    if(pending||state.missing()>=0||(state.remaining()===0&&!submittedPayload))return;
    submittedPayload??=state.payload();pending=true;notice='';render();
    try {
      const data=await command('exam','submit',submittedPayload);
      if(disposed)return;
      result=data;phase='result';clearInterval(timer);timer=null;submittedPayload=null;
    } catch(error) {
      if(disposed)return;
      notice=error.message;
      // A network or server failure may occur after commit. Retry the same token/answers.
      if(error.status&&error.status<500)submittedPayload=null;
    } finally {
      pending=false;
      if(!disposed){render();syncLaunch();focusTitle();}
    }
  }
  function showResult() {
    const total=Number(result.total)||result.review.length,reached=result.correct*10>=total*9;
    const retry=!reached&&Number(result.remaining)>0&&result.retry_allowed!==false;
    const minimum=Object.hasOwn(result,'passing_score')?result.passing_score:attempt&&Object.hasOwn(attempt,'passing_score')?attempt.passing_score:course.exam?.passing_score;
    const passed=Object.hasOwn(result,'passed')?result.passed:(minimum!=null?Number(result.score)>=Number(minimum):null);
    const status=passed===null?'Resultado registrado':passed?'Aprobado':'No aprobado',tone=passed===null?'info':passed?'success':'warning';
    const percentage=new Intl.NumberFormat('es-PE',{maximumFractionDigits:1}).format(result.correct*100/total);
    const next=retry?`Puedes realizar otro intento. Te quedan ${Number(result.remaining)} de ${Number(result.max_attempts??attempt?.max_attempts??course.exam?.max_attempts)||2} permitidos.`:reached?'Alcanzaste el 90 % de aciertos o más. No corresponde otro intento.':result.retry_block_reason==='unavailable'?'Este examen ya no está disponible para nuevos intentos.':'Has utilizado todos los intentos permitidos.';
    frame('Tu resultado',`<section class="evaluation-result" data-result-tone="${tone}"><div class="evaluation-score">${result.score}<small>/ 20</small></div><div><span class="badge" data-tone="${tone}">${status}</span><h3>${result.correct} de ${total} respuestas correctas</h3><p>${percentage} % de aciertos${minimum!=null?` · Nota mínima: ${Number(minimum)} / 20`:''}</p></div></section><div class="ui-alert" data-tone="${reached?'success':'info'}">${next}</div><p class="hint">Puntaje de este intento. Las notas no se suman.</p><details class="evaluation-result-details"><summary>Revisar respuestas y explicaciones</summary><div class="evaluation-review">${result.review.map((item,i)=>`<details><summary><span class="${item.correct?'success':'evaluation-missing'}">${item.correct?icon('check'):'–'} ${item.correct?'Correcta':'Por reforzar'}</span><span>${i+1}. ${escape(item.prompt)}</span></summary><p><strong>Tu respuesta:</strong> ${escape(item.selected)}</p><p><strong>Respuesta correcta:</strong> ${escape(item.answer)}</p>${item.explanation?`<p>${escape(item.explanation)}</p>`:''}</details>`).join('')}</div></details>`,`<button type="button" class="button white" data-finish>Volver al material</button>${retry?'<button type="button" class="button primary" data-retry>Volver a intentar</button>':'<a class="button primary" href="#capacitaciones">Volver al catálogo</a>'}`,true);
    dialog.querySelector('[data-finish]').addEventListener('click',()=>dialog.close());
    dialog.querySelector('[data-retry]')?.addEventListener('click',()=>{participant.exam_policy={...result};phase='learner';notice='';showLearner();focusTitle();});
  }
  function tick() {
    if(disposed||!state||phase==='result')return;
    const remaining=state.remaining(),clock=dialog.querySelector('#evaluation-clock');
    if(clock){clock.textContent=remainingLabel(remaining);clock.classList.toggle('is-urgent',remaining!==null&&remaining<=60);}
    const warning=dialog.querySelector('#evaluation-expired');if(warning)warning.hidden=remaining!==0;
    if(remaining===0){
      dialog.querySelectorAll('[name="evaluation-answer"]').forEach(input=>input.disabled=true);
      const send=dialog.querySelector('[data-submit]');if(send&&!submittedPayload)send.disabled=true;
    }
  }
  function render() {
    if(phase==='learner')showLearner();
    else if(phase==='question')showQuestion();
    else if(phase==='review')showReview();
    else showResult();
    tick();
  }
  on(launch,'click',()=>{
    if(!dialog.open){render();dialog.showModal();document.body.classList.add('evaluation-open');
      const dni=phase==='learner'?dialog.querySelector('[name="dni"]:not([readonly])'):null;if(dni)dni.focus();else focusTitle();}
  });
  on(dialog,'close',()=>{document.body.classList.remove('evaluation-open');if(!disposed){syncLaunch();launch.focus({preventScroll:true});}});
  on(window,'beforeunload',event=>{if(state&&!result){event.preventDefault();event.returnValue='';}});
  return ()=>{
    disposed=true;clearInterval(timer);listeners.abort();dialog.close();dialog.remove();document.body.classList.remove('evaluation-open');
    participant=null;attempt=null;state=null;result=null;submittedPayload=null;
    for(const key of Object.keys(learner))learner[key]='';
  };
}
