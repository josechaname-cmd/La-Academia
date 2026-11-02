import {paginationControls,mountPagination,searchText} from '../components/list-controls.js?v=20261030-9';
import {motion} from '../design/runtime.js?v=20261030-9';
import {query,examResultsUrl} from '../api.js?v=20261030-9';
import {heading,escape,empty,date,optionList,busy,errorBox} from '../components/common.js?v=20261030-9';
const examState=exam=>exam.course_status==='archived'?'Archivado':({scheduled:'Programado',open:'En curso',closed:'Finalizado',disabled:'Desactivado',not_required:'No requerido'}[exam.state]);
export async function reportsPage(examId='',courseId='',onRouteChange=()=>{}) {
  if(examId&&!/^[1-9][0-9]*$/.test(examId))throw new Error('Examen no válido.');
  if(courseId&&!/^[1-9][0-9]*$/.test(courseId))throw new Error('Capacitación no válida.');
  const selection=examId||(courseId?'curso/'+courseId:'');
  const params=value=>value.startsWith('curso/')?{course_id:value.slice(6)}:value?{exam_id:value}:{};
  const options=(items,value)=>{
    const courses=new Map(items.map(exam=>[String(exam.course_id),exam.title]));
    const course=value.startsWith('curso/')?value.slice(6):courseId;
    const group=course?`<option value="curso/${escape(course)}">Todas las versiones · ${escape(courses.get(course)||'Capacitación')}</option>`:'';
    const versions=(course?items.filter(exam=>String(exam.course_id)===course):items).map(exam=>`<option value="${Number(exam.id)}"${String(exam.id)===value?' selected':''}>${escape(exam.title)} · v${Number(exam.version)} · ${examState(exam)}</option>`).join('');
    return '<option value="">Todos los resultados recientes</option>'+group+versions;
  };
  let [initial,exams]=await Promise.all([query('report','results',params(selection)),query('report','exams')]);
  return {html:`${heading('SEGUIMIENTO INTERNO','Resultados de las evaluaciones','Última nota por colaborador y versión. Descarga resultados durante el examen o después del cierre.')}<section class="panel"><div class="toolbar report-controls"><label class="field report-exam">Examen<select id="report-exam">${options(exams,selection)}</select></label><a id="export-results" class="button primary" aria-disabled="true" tabindex="-1" download>Exportar Excel</a><button id="refresh-results" class="button white">Actualizar resultados</button></div><p id="report-period" class="report-period hint">Selecciona un examen para exportar todos sus participantes.</p><div class="toolbar"><label class="search"><span class="sr-only">Buscar resultados</span><input id="report-search" type="search" placeholder="Nombre, DNI, cargo o capacitación"></label><label>Cargo<select id="report-job-title"><option value="">Todos</option></select></label></div><div class="report-results"><p id="report-loading" role="status" hidden>Actualizando resultados…</p><div id="report-table"></div></div>${paginationControls('resultados')}</section><p class="hint">Vista: hasta 1 000 registros. Excel: todos los participantes del examen seleccionado, sin aplicar los filtros de búsqueda o cargo. Notas en blanco: todavía no hay un envío válido.</p>`,mount(root){
    let results=initial,generation=0,loading=false,ready=true,transition=null;const selected=root.querySelector('#report-exam'),exportButton=root.querySelector('#export-results'),jobTitle=root.querySelector('#report-job-title'),table=root.querySelector('#report-table');
    selected.value=selection;
    const pagerHost=root.querySelector('[data-list-pagination]'),pager=mountPagination(pagerHost,{onChange:render});
    function render(){
      pagerHost.hidden=false;
      const filter=jobTitle.value,search=searchText(root.querySelector('#report-search').value);
      const rows=results.filter(row=>(!filter||row.job_title===filter)&&searchText(`${row.name} ${row.dni} ${row.job_title} ${row.title}`).includes(search));
      const visible=pager.slice(rows);
      table.innerHTML=rows.length?`<div class="table-scroll"><table><thead><tr><th>Nombre completo</th><th>Cargo</th><th>Capacitación</th><th>Participación</th><th>Nota</th><th>Resultado</th><th>Envíos</th><th>Fecha del examen</th></tr></thead><tbody>${visible.map(row=>`<tr><td><strong>${escape(row.name)}</strong><small>DNI ${escape(row.dni)}</small></td><td>${escape(row.job_title)}</td><td>${escape(row.title)}<small>Versión ${row.version}</small></td><td>${escape(row.participation||'Enviado')}</td><td class="grade">${row.score??'—'}<small>/20</small></td><td>${row.passed==null?(row.score==null?'Sin envío':'Sin mínimo definido'):Number(row.passed)?'Aprobado':'No aprobado'}${row.passing_score!=null?`<small>Mínimo ${Number(row.passing_score)} / 20</small>`:''}</td><td>${row.attempts} de ${Number(row.max_attempts)||2}</td><td>${date(row.submitted_at)}</td></tr>`).join('')}</tbody></table></div>`:empty('Todavía no hay resultados para esta búsqueda.');
    }
    function jobTitles(){const previous=jobTitle.value;jobTitle.innerHTML='<option value="">Todos</option>'+optionList([...new Set(results.map(row=>row.job_title))],previous);}
    function controls(){
      const id=selected.value,available=/^\d+$/.test(id)&&!loading&&ready;
      exportButton.setAttribute('aria-disabled',String(!available));exportButton.tabIndex=available?0:-1;if(available)exportButton.href=examResultsUrl(id);else exportButton.removeAttribute('href');
      const exam=exams.find(exam=>String(exam.id)===id),format=value=>value?`${value.slice(0,16)} (Perú)`:'Sin fecha';
      root.querySelector('#report-period').textContent=id.startsWith('curso/')?'Todas las versiones de esta capacitación. Elige un examen para exportar sus participantes.':exam?`Apertura: ${format(exam.opens_at)} · Cierre: ${format(exam.closes_at)}. La descarga incluye los datos disponibles en ese momento.`:'Selecciona un examen para exportar todos sus participantes.';
    }
    async function load(){
      const current=++generation,id=selected.value;
      loading=true;ready=false;transition?.cancel();controls();table.setAttribute('aria-busy','true');table.inert=true;pagerHost.inert=true;
      root.querySelector('#report-loading').hidden=false;
      root.querySelector('#report-search').disabled=true;jobTitle.disabled=true;
      table.classList.add('is-loading');
      try{
        const [fresh,updatedExams]=await Promise.all([query('report','results',params(id)),query('report','exams')]);
        if(current!==generation)return;
        results=fresh;exams=updatedExams;
        selected.innerHTML=options(exams,id);
        selected.value=id;jobTitles();render();ready=true;onRouteChange('#admin/capacitaciones/resultados'+(id?'/'+id:''));
      }catch(error){if(current===generation){results=[];pagerHost.hidden=true;table.innerHTML=errorBox(error);}}
      finally{if(current===generation){
        loading=false;controls();table.setAttribute('aria-busy','false');table.inert=false;pagerHost.inert=false;table.classList.remove('is-loading');
        root.querySelector('#report-loading').hidden=true;root.querySelector('#report-search').disabled=false;jobTitle.disabled=false;
        if(!matchMedia('(prefers-reduced-motion: reduce)').matches)transition=table.animate?.([{opacity:.35},{opacity:1}],{duration:motion.fast,easing:'ease-out'});
      }}
    }
    selected.addEventListener('change',()=>{
      if(!selected.value)courseId='';
      history.replaceState(null,'','#admin/capacitaciones/resultados'+(selected.value?'/'+selected.value:''));
      root.querySelector('#report-search').value='';jobTitle.value='';pager.reset();load();
    });
    const onActivity=()=>load();window.addEventListener('academia-activity-updated',onActivity);
    exportButton.addEventListener('click',event=>{if(exportButton.getAttribute('aria-disabled')==='true')event.preventDefault();});
    root.querySelector('#refresh-results').addEventListener('click',event=>busy(event.currentTarget,load));
    root.querySelector('#report-search').addEventListener('input',()=>{pager.reset();render();});jobTitle.addEventListener('change',()=>{pager.reset();render();});controls();jobTitles();render();
    return ()=>{generation++;transition?.cancel();window.removeEventListener('academia-activity-updated',onActivity);};
  }};
}
