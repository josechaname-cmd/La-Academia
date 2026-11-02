import {query,invalidateNavigationCache} from '../api.js?v=20261030-9';
import {heading,escape,empty,busy,icon} from '../components/common.js?v=20261030-9';
const count=value=>Number.isFinite(Number(value))?Math.max(0,Math.floor(Number(value))):0;
const number=value=>count(value).toLocaleString('es-PE');
const decimal=value=>(Number.isFinite(Number(value))?Math.max(0,Number(value)):0).toLocaleString('es-PE',{maximumFractionDigits:2});
const percentage=value=>{const numeric=Number(value);return Number.isFinite(numeric)?Math.max(0,Math.min(100,numeric)):0;};
// The production CSP blocks style attributes parsed from HTML. Apply only finite
// chart geometry through CSS properties after each render, including drill-downs.
function applyChartGeometry(root){
  for(const node of root.querySelectorAll('[data-chart-height]'))node.style.height=`${percentage(node.dataset.chartHeight)}%`;
  for(const node of root.querySelectorAll('[data-chart-left]'))node.style.left=`${percentage(node.dataset.chartLeft)}%`;
  for(const node of root.querySelectorAll('[data-chart-width]'))node.style.width=`${percentage(node.dataset.chartWidth)}%`;
}
function scoreRange(item){
  const average=Number(item.average_score)||0,minimum=Number(item.minimum_score),maximum=Number(item.maximum_score);
  const min=Number.isFinite(minimum)?minimum:average,max=Number.isFinite(maximum)?maximum:average;
  return {average,min,max,low:percentage(min/20*100),high:percentage(max/20*100),mean:percentage(average/20*100)};
}
function horizontalBars(rows,{maximum,value,format=number,unit='',kind=()=>'',detail=()=>'',id,selected,insightId,range=false}){
  if(!rows.length)return empty('No hay datos para mostrar en este gráfico.');
  const ceiling=Math.max(1,Number(maximum)||1),ticks=[0,1,2,3,4].map(step=>ceiling*step/4);
  return `<div class="dashboard-horizontal-chart"><div class="dashboard-axis" aria-hidden="true"><div class="dashboard-scale">${ticks.map(tick=>`<span>${format(tick)}</span>`).join('')}</div></div><div class="dashboard-columns">${rows.map(item=>{
    const amount=Math.max(0,Number(value(item))||0),width=percentage(amount/ceiling*100),label=`${format(amount)}${unit}`,key=String(id(item)),active=key===String(selected),stats=range?scoreRange(item):null;
    const geometry=stats?`<span data-chart-left="${stats.low}" data-chart-width="${Math.max(0,stats.high-stats.low)}"></span><i data-chart-left="${stats.mean}"></i>`:`<span data-chart-width="${width}"></span>`;
    return `<button type="button" class="dashboard-column dashboard-column-action" data-kind="${escape(kind(item))}" data-chart-item="${escape(key)}" aria-pressed="${active}" aria-describedby="${insightId}" aria-label="${escape(item.title)}: ${escape(label)}${stats?`, mínimo ${decimal(stats.min)}, máximo ${decimal(stats.max)}`:''}. Seleccionar para consultar estadísticas."><span class="dashboard-column-label"><strong title="${escape(item.title)}">${escape(item.title)}</strong><small>${escape(detail(item))}</small></span><span class="dashboard-column-track${stats?' is-range':''}" aria-hidden="true">${geometry}</span><span class="dashboard-column-value">${escape(label)}</span></button>`;
  }).join('')}</div></div>`;
}
function scoreInsight(item){
  const {average,min,max}=scoreRange(item);
  return `<div class="dashboard-insight-heading"><h3 title="${escape(item.title)}">${escape(item.title)}</h3></div><dl class="dashboard-score-stats"><div class="is-primary"><dt>Promedio exacto</dt><dd>${escape(decimal(average))}<small>/ 20</small></dd></div><div><dt>Mínimo</dt><dd>${escape(decimal(min))}</dd></div><div><dt>Máximo</dt><dd>${escape(decimal(max))}</dd></div></dl>`;
}
function countInsight(item,rows,chart){
  const views=chart==='views',value=row=>(views?count(row.view_count):people(row)),total=rows.reduce((sum,row)=>sum+value(row),0),share=total?value(item)/total*100:0;
  const description=views?`${item.kind==='course'?'Capacitación':'Evento'} · ${item.category||'General'}`:'';
  return `<div class="dashboard-insight-heading"><h3 title="${escape(item.title)}">${escape(item.title)}</h3>${description?`<p>${escape(description)}</p>`:''}</div><dl class="dashboard-score-stats"><div class="is-primary"><dt>${views?'Aperturas acumuladas':'Personas evaluadas'}</dt><dd>${number(value(item))}</dd></div><div><dt>Del total filtrado</dt><dd>${decimal(share)}<small>%</small></dd></div><div><dt>Posición</dt><dd>${number(rows.indexOf(item)+1)}<small>de ${number(rows.length)}</small></dd></div></dl>`;
}
function rankingChart(entries,limit,scores){
  const top=entries.slice(0,limit);
  if(!top.length)return '<p class="hint">Sin resultados disponibles.</p>';
  const ceiling=scores?20:Math.max(1,...top.map(entry=>entry.amount));
  return `<ol class="${scores?'dashboard-note-ranking':'dashboard-count-ranking'}">${top.map((entry,index)=>{
    const ratio=percentage(entry.amount/ceiling*100);
    return scores?`<li aria-label="Puesto ${index+1}: ${escape(entry.label)} de 20"><strong>${escape(entry.label)}</strong><span class="dashboard-rank-track" aria-hidden="true"><i data-chart-height="${ratio}"></i></span><small>#${index+1}</small></li>`:`<li><button type="button" data-ranking-item="${escape(entry.key)}" title="${escape(entry.label)}" aria-label="Puesto ${index+1}: ${escape(entry.label)}, ${escape(entry.value)}. Ver detalle"><strong>${index+1}. ${escape(entry.label)}</strong><small>${number(entry.amount)}</small><span class="dashboard-rank-track" aria-hidden="true"><i data-chart-width="${ratio}"></i></span></button></li>`;
  }).join('')}</ol>${top.length<limit?`<p class="hint">${number(top.length)} de ${number(limit)} disponibles.</p>`:''}`;
}
const people = row => count(row.people_count ?? row.participant_count);
const closingDate = new Intl.DateTimeFormat('es-PE',{timeZone:'America/Lima',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});

function nextActions(courses, exams, now=Date.now()) {
  const draft = courses.filter(course=>course.status==='draft')
    .sort((a,b)=>String(b.updated_at||b.created_at||'').localeCompare(String(a.updated_at||a.created_at||''))||b.id-a.id)[0];
  const currentVersions = new Map(courses.map(course=>[Number(course.id),Number(course.exam_version)]));
  const closing = exams.filter(exam=>exam.course_status==='published' && exam.state==='open' && exam.closes_at
    && currentVersions.get(Number(exam.course_id))===Number(exam.version))
    .map(exam=>({exam,time:Date.parse(exam.closes_at.replace(' ','T')+'-05:00')}))
    .filter(item=>item.time>now && item.time<=now+7*86400000).sort((a,b)=>a.time-b.time)[0];
  const action = (href,label,title,link) => `<a class="dashboard-next-action" href="${href}"><span><small>${escape(label)}</small><strong>${escape(title)}</strong></span><span>${link} ${icon('next')}</span></a>`;
  return (draft? action('#admin/capacitaciones/'+Number(draft.id),'Borrador reciente',draft.title,'Continuar edición'):'')
    +(closing? action('#admin/capacitaciones/resultados/'+Number(closing.exam.id),'Cierra el '+closingDate.format(closing.time)+' (Perú)',closing.exam.title,'Ver resultados'):'');
}

export async function overviewPage(user,state={}){
  const globalOverview=user?.role==='superadmin';
  const fetchData=()=>Promise.all([query('report','summary'),query('content','admin.list'),globalOverview?query('admin','events.list'):Promise.resolve([]),query('report','exams')]);
  let [summary,courses,events,exams]=await fetchData();
  return {html:`<div class="dashboard-home">${heading('Inicio',{actions:'<a class="button white" href="#admin/capacitaciones/resultados">Ver resultados</a><a class="button primary" href="#admin/capacitaciones/nuevo">+ Nueva capacitación</a>'})}<nav id="home-next-actions" class="dashboard-next-actions" aria-label="Próximas tareas" hidden></nav><div id="home-metrics" class="dashboard-metrics"></div><p id="home-error" class="error" role="alert" hidden></p><div class="dashboard-content"><div class="dashboard-charts"><nav class="dashboard-chart-switcher" aria-label="Elegir gráfico"><button type="button" data-dashboard-chart="views" aria-pressed="false"><strong>Aperturas</strong></button><button type="button" data-dashboard-chart="scores" aria-pressed="true"><strong>Promedios</strong></button><button type="button" data-dashboard-chart="participation" aria-pressed="false"><strong>Personas evaluadas</strong></button></nav><section class="panel dashboard-analytics"><div class="dashboard-section-heading"><div><h2 id="home-chart-title">Promedio de notas por capacitación</h2></div><div class="dashboard-section-tools"><button type="button" class="button white" id="home-refresh">${icon('refresh')} Actualizar</button></div></div><div class="dashboard-chart-toolbar" id="home-chart-toolbar" hidden><label class="field dashboard-filter"><span class="sr-only">Tipo de publicación</span><select id="home-publication-type"><option value="">Todas las publicaciones</option><option value="course">Capacitaciones</option><option value="event">Eventos</option></select></label><div class="dashboard-chart-legend" aria-label="Tipos de publicación"><span data-kind="course">Capacitaciones</span><span data-kind="event">Eventos</span></div></div><p class="hint dashboard-caption" id="home-chart-description"></p><p class="dashboard-chart-summary" id="home-chart-summary" role="status"></p><div id="home-chart" class="dashboard-chart-host" role="group" aria-labelledby="home-chart-title" aria-describedby="home-chart-description"></div></section></div></div><section class="panel dashboard-status-strip" aria-label="Seguimiento de evaluaciones"><h2>Evaluaciones</h2><div id="home-evaluations"></div><nav class="dashboard-shortcuts" aria-label="Accesos rápidos del panel"><a href="#admin/capacitaciones">${icon('book')} Capacitaciones</a><a href="#admin/eventos">${icon('calendar')} Eventos</a></nav></section></div>`,mount(root){
    let disposed=false,generation=0;
    const filter=root.querySelector('#home-publication-type'),chartHost=root.querySelector('#home-chart'),chartButtons=[...root.querySelectorAll('[data-dashboard-chart]')];
    let selectedChart=state.chart||'scores',chartRows=[],chartOptions={},chartPage=0;
    const pageSize=5;
    const selections=state.selections??={views:null,scores:null,participation:null},topLimits=state.limits??={views:3,scores:3,participation:3};
    filter.value=state.filter||'';
    const itemKey=item=>selectedChart==='views'?`${item.kind}:${item.id}`:String(item.course_id);
    const insightId=()=>selectedChart==='scores'?'score-insight':`${selectedChart}-insight`;
    const rankingEntries=item=>selectedChart==='scores'?(Array.isArray(item.top_scores)?item.top_scores:[]).map(score=>({label:decimal(score),amount:Number(score)||0})):chartRows.map(row=>({key:itemKey(row),label:row.title,amount:(selectedChart==='views'?count(row.view_count):people(row)),value:`${number(selectedChart==='views'?row.view_count:row.participant_count)} ${selectedChart==='views'?'aperturas':'personas'}`}));
    function insightMarkup(item){
      const title={scores:'Mejores notas · 0–20',views:'Más aperturas',participation:'Más personas evaluadas'}[selectedChart];
      return `${selectedChart==='scores'?scoreInsight(item):countInsight(item,chartRows,selectedChart)}<section class="dashboard-top-scores"><div class="dashboard-ranking-heading"><strong>${title}</strong><label class="field dashboard-top-filter"><span class="sr-only">Cantidad de resultados del ranking</span><select data-ranking-limit>${[3,5,10].map(limit=>`<option value="${limit}"${topLimits[selectedChart]===limit?' selected':''}>Top ${limit}</option>`).join('')}</select></label></div><div data-ranking-results>${rankingChart(rankingEntries(item),topLimits[selectedChart],selectedChart==='scores')}</div></section>${selectedChart!=='views'?`<a class="text-link" href="#admin/capacitaciones/resultados/curso/${Number(item.course_id)}">Ver resultados de esta capacitación ${icon('next')}</a>`:''}`;
    }
    function renderDrilldown(rows,options,emptyMessage='No hay datos para mostrar en este gráfico.'){
      chartRows=rows;chartOptions=options;
      if(!rows.length){selections[selectedChart]=null;chartHost.innerHTML=empty(emptyMessage);return;}
      if(!rows.some(item=>itemKey(item)===selections[selectedChart]))selections[selectedChart]=itemKey(rows[0]);
      const selected=rows.find(item=>itemKey(item)===selections[selectedChart]);
      chartPage=Math.floor(rows.indexOf(selected)/pageSize);
      const start=chartPage*pageSize,pageRows=rows.slice(start,start+pageSize),pages=Math.ceil(rows.length/pageSize);
      chartHost.innerHTML=`<div class="dashboard-drilldown-layout"><div class="dashboard-score-plot">${horizontalBars(pageRows,{...options,id:itemKey,selected:selections[selectedChart],insightId:insightId()})}<p class="dashboard-plot-caption">${selectedChart==='scores'?'<span class="dashboard-range-key" aria-hidden="true"></span> Punto: promedio · Línea: mínimo–máximo':'Selecciona una barra para ver su detalle.'}</p><nav class="dashboard-chart-pagination" aria-label="Páginas del gráfico"${pages<2?' hidden':''}><button type="button" class="button white" data-chart-page="-1" aria-label="Página anterior del gráfico"${chartPage===0?' disabled':''}>${icon('previous')}</button><span role="status">${start+1}–${Math.min(start+pageSize,rows.length)} de ${number(rows.length)}</span><button type="button" class="button white" data-chart-page="1" aria-label="Página siguiente del gráfico"${chartPage===pages-1?' disabled':''}>${icon('next')}</button></nav></div><aside class="dashboard-score-insight" id="${insightId()}" data-insight-key="${escape(itemKey(selected))}" aria-live="polite">${insightMarkup(selected)}</aside></div>`;
      applyChartGeometry(chartHost);
    }
    const visiblePublications=()=>[...courses.filter(course=>course.status==='published').map(course=>({...course,kind:'course'})),...events.filter(event=>Number(event.active)===1).map(event=>({...event,kind:'event'}))];
    function publications(){
      const rows=visiblePublications().filter(item=>!filter.value||item.kind===filter.value).sort((a,b)=>count(b.view_count)-count(a.view_count)||b.id-a.id);
      const maximum=rows.reduce((max,item)=>Math.max(max,count(item.view_count)),0),step=Math.max(1,Math.ceil(maximum/4)),ceiling=step*4;
      root.querySelector('#home-chart-summary').textContent=`${number(rows.reduce((sum,item)=>sum+count(item.view_count),0))} aperturas · ${number(rows.length)} publicaciones`;
      renderDrilldown(rows,{maximum:ceiling,value:item=>item.view_count,kind:item=>item.kind,detail:item=>`${item.kind==='course'?'Capacitación':'Evento'} · ${item.category||'General'}`});
    }
    function scores(){
      const scoreRows=[...(summary.score_averages||[])].filter(item=>count(item.participant_count)>0).sort((a,b)=>Number(b.average_score)-Number(a.average_score)||String(a.title).localeCompare(String(b.title),'es'));
      const participants=scoreRows.reduce((sum,item)=>sum+count(item.participant_count),0),weighted=participants?scoreRows.reduce((sum,item)=>sum+Number(item.average_score)*count(item.participant_count),0)/participants:0;
      root.querySelector('#home-chart-summary').textContent=scoreRows.length?`${decimal(weighted)} / 20 promedio general · ${number(scoreRows.length)} ${scoreRows.length===1?'capacitación':'capacitaciones'}`:'Sin evaluaciones completadas para promediar.';
      renderDrilldown(scoreRows,{maximum:20,value:item=>item.average_score,format:decimal,unit:' / 20',kind:()=> 'score',range:true,detail:item=>`${number(item.participant_count)} ${count(item.participant_count)===1?'resultado':'resultados'}`},'No hay evaluaciones completadas para analizar.');
    }
    function participation(){
      const rows=[...(summary.score_averages||[])].filter(item=>count(item.participant_count)>0).sort((a,b)=>people(b)-people(a)||String(a.title).localeCompare(String(b.title),'es'));
      const maximum=rows.reduce((max,item)=>Math.max(max,people(item)),0),step=Math.max(1,Math.ceil(maximum/4)),ceiling=step*4;
      root.querySelector('#home-chart-summary').textContent=rows.length?`${number(rows.length)} ${rows.length===1?'capacitación con evaluación completada':'capacitaciones con evaluaciones completadas'}`:'Sin resultados completados para mostrar.';
      renderDrilldown(rows,{maximum:ceiling,value:item=>people(item),kind:()=> 'participation',detail:()=> 'Personas evaluadas'});
    }
    function renderChart(){
      const [title,description]={
        views:['Aperturas por publicación','Una apertura por publicación y sesión.'],
        scores:['Promedio de notas por capacitación','Última nota por persona y versión, sobre 20.'],
        participation:['Personas evaluadas por capacitación','Cada persona cuenta una vez por capacitación.']
      }[selectedChart];
      root.querySelector('#home-chart-title').textContent=title;
      root.querySelector('#home-chart-description').textContent=description;
      root.querySelector('#home-chart-toolbar').hidden=selectedChart!=='views'||!globalOverview;
      chartButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.dashboardChart===selectedChart)));
      if(selectedChart==='views')publications();else if(selectedChart==='scores')scores();else participation();
    }
    function render(){
      const actions=root.querySelector('#home-next-actions');
      actions.innerHTML=nextActions(courses,exams);actions.hidden=!actions.childElementCount;
      const total=visiblePublications().reduce((sum,item)=>sum+count(item.view_count),0);
      root.querySelector('#home-metrics').innerHTML=[['Aperturas',total,'Solo contenido publicado','eye'],['Capacitaciones',summary.courses,`${number(summary.published)} publicadas`,'book'],globalOverview?['Eventos',events.length,`${number(events.filter(event=>Number(event.active)).length)} publicados`,'calendar']:['Borradores',courses.filter(course=>course.status==='draft').length,'','book'],['Intentos completados',summary.evaluations,'','results']].map(([label,value,note,symbol])=>`<article class="panel dashboard-metric"><span class="dashboard-metric-label">${label}${icon(symbol)}</span><strong>${number(value)}</strong>${note?`<small>${note}</small>`:''}</article>`).join('');
      const current=exams.filter(exam=>exam.course_status!=='archived');
      root.querySelector('#home-evaluations').innerHTML=[['open','En curso'],['scheduled','Programadas'],['closed','Finalizadas'],['disabled','Desactivadas'],['not_required','No requeridas']].map(([state,label])=>`<div class="dashboard-evaluation-row"><span><i class="evaluation-dot ${state}" aria-hidden="true"></i>${label}</span><strong>${number(current.filter(exam=>exam.state===state).length)}</strong></div>`).join('');
      renderChart();
    }
    async function refresh(){
      const current=++generation;chartHost.setAttribute('aria-busy','true');invalidateNavigationCache();
      try{const data=await fetchData();if(disposed||current!==generation)return;[summary,courses,events,exams]=data;root.querySelector('#home-error').hidden=true;render();}
      catch(error){if(!disposed&&current===generation){const message=root.querySelector('#home-error');message.textContent=error.message;message.hidden=false;}}
      finally{if(!disposed&&current===generation)chartHost.setAttribute('aria-busy','false');}
    }
    filter.addEventListener('change',()=>{state.filter=filter.value;if(selectedChart==='views')publications();});
    chartButtons.forEach(button=>button.addEventListener('click',()=>{selectedChart=state.chart=button.dataset.dashboardChart;renderChart();}));
    const chartButton=target=>target.closest?.('[data-chart-item]');
    const showInsight=(button,persist=false)=>{
      if(!button)return;
      const item=chartRows.find(row=>itemKey(row)===button.dataset.chartItem),insight=root.querySelector(`#${insightId()}`);
      if(!item||!insight)return;
      if(persist)selections[selectedChart]=button.dataset.chartItem;
      chartHost.querySelectorAll('[data-chart-item]').forEach(node=>{node.classList.toggle('is-preview',node===button);node.setAttribute('aria-pressed',String(node.dataset.chartItem===selections[selectedChart]));});
      if(insight.dataset.insightKey===itemKey(item))return;
      insight.dataset.insightKey=itemKey(item);insight.innerHTML=insightMarkup(item);applyChartGeometry(insight);
    };
    const restoreInsight=()=>showInsight([...chartHost.querySelectorAll('[data-chart-item]')].find(node=>node.dataset.chartItem===selections[selectedChart]));
    chartHost.addEventListener('mouseover',event=>showInsight(chartButton(event.target)));
    chartHost.addEventListener('focusin',event=>showInsight(chartButton(event.target)));
    chartHost.addEventListener('click',event=>{
      const pageButton=event.target.closest('[data-chart-page]'),rankButton=event.target.closest('[data-ranking-item]');
      if(pageButton||rankButton){
        const item=rankButton?chartRows.find(row=>itemKey(row)===rankButton.dataset.rankingItem):chartRows[(chartPage+Number(pageButton.dataset.chartPage))*pageSize];
        if(!item)return;
        selections[selectedChart]=itemKey(item);renderDrilldown(chartRows,chartOptions);
        const nextControl=pageButton?chartHost.querySelector(`[data-chart-page="${pageButton.dataset.chartPage}"]:not(:disabled)`):null;
        (nextControl||chartHost.querySelector('[data-chart-item][aria-pressed="true"]'))?.focus();return;
      }
      showInsight(chartButton(event.target),true);
    });
    chartHost.addEventListener('mouseleave',()=>{if(!root.querySelector(`#${insightId()}`)?.contains(document.activeElement))restoreInsight();});
    chartHost.addEventListener('focusout',event=>{if(!chartHost.contains(event.relatedTarget))restoreInsight();});
    chartHost.addEventListener('change',event=>{
      if(!event.target.matches('[data-ranking-limit]'))return;
      const limit=Number(event.target.value),insight=root.querySelector(`#${insightId()}`),item=chartRows.find(row=>itemKey(row)===insight?.dataset.insightKey);
      if(![3,5,10].includes(limit)||!item)return;
      topLimits[selectedChart]=limit;insight.querySelector('[data-ranking-results]').innerHTML=rankingChart(rankingEntries(item),limit,selectedChart==='scores');applyChartGeometry(insight);
    });
    root.querySelector('#home-refresh').addEventListener('click',event=>busy(event.currentTarget,refresh));
    window.addEventListener('academia-activity-updated',refresh);render();
    return ()=>{disposed=true;generation++;window.removeEventListener('academia-activity-updated',refresh);};
  }};
}
