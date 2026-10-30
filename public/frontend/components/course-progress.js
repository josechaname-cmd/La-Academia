import {escape,icon} from './common.js?v=20261030-1';

export function courseProgress({information,material,exam,withoutExam,published,dirty=false}) {
  const steps=[
    ['Información',information,dirty?'Cambios sin guardar':information?'Completa':'Completa los datos'],
    ['Material',material,material?'Disponible':'Adjunta un documento'],
    ['Evaluación',withoutExam||exam,withoutExam?'No requerida':exam?'Configurada':'Crea el examen'],
    ['Publicación',published,published?'En el portal':'Pendiente']
  ];
  const current=steps.findIndex(([,done])=>!done);
  return `<ol class="course-progress" aria-label="Proceso de la capacitación">${steps.map(([title,done,note],index)=>`<li class="${done?'is-complete':''}" ${index===current?'aria-current="step"':''}><span class="course-step-marker" aria-hidden="true">${done?icon('check'):index+1}</span><span><strong>${escape(title)}</strong><small>${escape(note)}</small></span></li>`).join('')}</ol>`;
}
