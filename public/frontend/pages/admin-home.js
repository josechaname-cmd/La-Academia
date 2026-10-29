import {query,invalidateNavigationCache} from '../api.js?v=20261029-10';
import {heading,escape,empty,busy,icon} from '../components/common.js?v=20261029-10';
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
  return `<div class="dashboard-insight-heading"><span class="eyebrow">DETALLE SELECCIONADO</span><h3 title="${escape(item.title)}">${escape(item.title)}</h3></div><dl class="dashboard-score-stats"><div class="is-primary"><dt>Promedio exacto</dt><dd>${escape(decimal(average))}<small>/ 20</small></dd></div><div><dt>Mínimo</dt><dd>${escape(decimal(min))}</dd></div><div><dt>Máximo</dt><dd>${escape(decimal(max))}</dd></div></dl>`;
}
function countInsight(item,rows,chart){
  const views=chart==='views',value=row=>count(views?row.view_count:row.participant_count),total=rows.reduce((sum,row)=>sum+value(row),0),share=total?value(item)/total*100:0;
  const description=views?`${item.kind==='course'?'Capacitación':'Evento'} · ${item.category||'General'}`:'Último resultado completado por participante.';
  return `<div class="dashboard-insight-heading"><span class="eyebrow">DETALLE SELECCIONADO</span><h3 title="${escape(item.title)}">${escape(item.title)}</h3><p>${escape(description)}</p></div><dl class="dashboard-score-stats"><div class="is-primary"><dt>${views?'Vistas acumuladas':'Resultados completados'}</dt><dd>${number(value(item))}</dd></div><div><dt>Del total filtrado</dt><dd>${decimal(share)}<small>%</small></dd></div><div><dt>Posición</dt><dd>${number(rows.indexOf(item)+1)}<small>de ${number(rows.length)}</small></dd></div></dl>`;
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
export async function overviewPage(user){
  const globalOverview=user?.role==='superadmin';
  const fetchData=()=>Promise.all([query('report','summary'),query('content','admin.list'),globalOverview?query('admin','events.list'):Promise.resolve([]),query('report','exams')]);
  let [summary,courses,events,exams]=await fetchData();
  return {html:`<div class="dashboard-home">${heading(globalOverview?'PANEL DE ADMINISTRACIÓN':'PANEL DEL CAPACITADOR','Inicio',globalOverview?'Vistas, participación y resultados de tus capacitaciones.':`Capacitaciones, participación y resultados de ${user?.site_name||'tu sede'}.`,'<a class="button white" href="#admin/capacitaciones/resultados">Ver resultados</a><a class="button primary" href="#admin/capacitaciones/nuevo">+ Nueva capacitación</a>')}<div id="home-metrics" class="dashboard-metrics"></div><p id="home-error" class="error" role="alert" hidden></p><div class="dashboard-content"><div class="dashboard-charts"><nav class="dashboard-chart-switcher" aria-label="Elegir gráfico"><button type="button" data-dashboard-chart="views" aria-pressed="false"><span>01</span><strong>Vistas</strong><small>Alcance de publicaciones</small></button><button type="button" data-dashboard-chart="scores" aria-pressed="true"><span>02</span><strong>Promedios</strong><small>Notas por capacitación</small></button><button type="button" data-dashboard-chart="participation" aria-pressed="false"><span>03</span><strong>Participación</strong><small>Resultados considerados</small></button></nav><section class="panel dashboard-analytics"><div class="dashboard-section-heading"><div><span class="eyebrow" id="home-chart-kicker">RENDIMIENTO</span><h2 id="home-chart-title">Promedio de notas por capacitación</h2></div><div class="dashboard-section-tools"><span class="dashboard-chart-badge" id="home-chart-badge">Escala 0–20</span><button type="button" class="button white" id="home-refresh">${icon('refresh')} Actualizar</button></div></div><div class="dashboard-chart-toolbar" id="home-chart-toolbar" hidden><label class="field dashboard-filter"><span class="sr-only">Tipo de publicación</span><select id="home-publication-type"><option value="">Todas las publicaciones</option><option value="course">Capacitaciones</option><option value="event">Eventos</option></select></label><div class="dashboard-chart-legend" aria-label="Tipos de publicación"><span data-kind="course">Capacitaciones</span><span data-kind="event">Eventos</span></div></div><p class="hint dashboard-caption" id="home-chart-description">Última entrega completada de cada participante.</p><p class="dashboard-chart-summary" id="home-chart-summary" role="status"></p><div id="home-chart" class="dashboard-chart-host" role="group" aria-labelledby="home-chart-title" aria-describedby="home-chart-description"></div></section></div></div><section class="panel dashboard-status-strip" aria-label="Seguimiento de evaluaciones"><h2>Evaluaciones</h2><div id="home-evaluations"></div><nav class="dashboard-shortcuts" aria-label="Accesos rápidos del panel"><a href="#admin/capacitaciones">${icon('book')} Capacitaciones</a><a href="#admin/eventos">${icon('calendar')} Eventos</a></nav></section></div>`,mount(root){
    let disposed=false,generation=0;
    const filter=root.querySelector('#home-publication-type'),chartHost=root.querySelector('#home-chart'),chartButtons=[...root.querySelectorAll('[data-dashboard-chart]')];
    let selectedChart='scores',chartRows=[],chartOptions={},chartPage=0;
    const pageSize=5;
    const selections={views:null,scores:null,participation:null},topLimits={views:3,scores:3,participation:3};
    const itemKey=item=>selectedChart==='views'?`${item.kind}:${item.id}`:String(item.course_id);
    const insightId=()=>selectedChart==='scores'?'score-insight':`${selectedChart}-insight`;
    const rankingEntries=item=>selectedChart==='scores'?(Array.isArray(item.top_scores)?item.top_scores:[]).map(score=>({label:decimal(score),amount:Number(score)||0})):chartRows.map(row=>({key:itemKey(row),label:row.title,amount:count(selectedChart==='views'?row.view_count:row.participant_count),value:`${number(selectedChart==='views'?row.view_count:row.participant_count)} ${selectedChart==='views'?'vistas':'resultados'}`}));
    function insightMarkup(item){
      const title={scores:'Mejores notas · 0–20',views:'Más vistas',participation:'Más resultados'}[selectedChart];
      return `${selectedChart==='scores'?scoreInsight(item):countInsight(item,chartRows,selectedChart)}<section class="dashboard-top-scores"><div class="dashboard-ranking-heading"><strong>${title}</strong><label class="field dashboard-top-filter"><span class="sr-only">Cantidad de resultados del ranking</span><select data-ranking-limit>${[3,5,10].map(limit=>`<option value="${limit}"${topLimits[selectedChart]===limit?' selected':''}>Top ${limit}</option>`).join('')}</select></label></div><div data-ranking-results>${rankingChart(rankingEntries(item),topLimits[selectedChart],selectedChart==='scores')}</div></section>`;
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
      root.querySelector('#home-chart-summary').textContent=`${number(rows.reduce((sum,item)=>sum+count(item.view_count),0))} vistas · ${number(rows.length)} publicaciones`;
      renderDrilldown(rows,{maximum:ceiling,value:item=>item.view_count,kind:item=>item.kind,detail:item=>`${item.kind==='course'?'Capacitación':'Evento'} · ${item.category||'General'}`});
    }
    function scores(){
      const scoreRows=[...(summary.score_averages||[])].filter(item=>count(item.participant_count)>0).sort((a,b)=>Number(b.average_score)-Number(a.average_score)||String(a.title).localeCompare(String(b.title),'es'));
      const participants=scoreRows.reduce((sum,item)=>sum+count(item.participant_count),0),weighted=participants?scoreRows.reduce((sum,item)=>sum+Number(item.average_score)*count(item.participant_count),0)/participants:0;
      root.querySelector('#home-chart-summary').textContent=scoreRows.length?`${decimal(weighted)} / 20 promedio general · ${number(scoreRows.length)} ${scoreRows.length===1?'capacitación':'capacitaciones'}`:'Sin evaluaciones completadas para promediar.';
      renderDrilldown(scoreRows,{maximum:20,value:item=>item.average_score,format:decimal,unit:' / 20',kind:()=> 'score',range:true,detail:item=>`${number(item.participant_count)} ${count(item.participant_count)===1?'resultado':'resultados'}`},'No hay evaluaciones completadas para analizar.');
    }
    function participation(){
      const rows=[...(summary.score_averages||[])].filter(item=>count(item.participant_count)>0).sort((a,b)=>count(b.participant_count)-count(a.participant_count)||String(a.title).localeCompare(String(b.title),'es'));
      const maximum=rows.reduce((max,item)=>Math.max(max,count(item.participant_count)),0),step=Math.max(1,Math.ceil(maximum/4)),ceiling=step*4,total=rows.reduce((sum,item)=>sum+count(item.participant_count),0);
      root.querySelector('#home-chart-summary').textContent=rows.length?`${number(total)} resultados · ${number(rows.length)} ${rows.length===1?'capacitación':'capacitaciones'}`:'Sin resultados completados para mostrar.';
      renderDrilldown(rows,{maximum:ceiling,value:item=>item.participant_count,kind:()=> 'participation',detail:()=> 'Resultados completados'});
    }
    function renderChart(){
      const settings={views:['ALCANCE','Vistas por publicación','Vistas acumuladas por publicación; escala común en todas las páginas.','Vistas'],scores:['RENDIMIENTO','Promedio de notas por capacitación','Mínimo, promedio y máximo de la última entrega completada por participante.','Escala 0–20'],participation:['PARTICIPACIÓN','Resultados por capacitación','Resultados completados por capacitación; escala común en todas las páginas.','Resultados']}[selectedChart];
      root.querySelector('#home-chart-kicker').textContent=settings[0];root.querySelector('#home-chart-title').textContent=settings[1];root.querySelector('#home-chart-description').textContent=settings[2];
      const badge=root.querySelector('#home-chart-badge');badge.textContent=settings[3];badge.hidden=!settings[3];root.querySelector('#home-chart-toolbar').hidden=selectedChart!=='views'||!globalOverview;
      chartButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.dashboardChart===selectedChart)));
      if(selectedChart==='views')publications();else if(selectedChart==='scores')scores();else participation();
    }
    function render(){
      const total=visiblePublications().reduce((sum,item)=>sum+count(item.view_count),0);
      root.querySelector('#home-metrics').innerHTML=[['Vistas',total,'Solo contenido publicado','eye'],['Capacitaciones',summary.courses,`${number(summary.published)} publicadas`,'book'],globalOverview?['Eventos',events.length,`${number(events.filter(event=>Number(event.active)).length)} publicados`,'calendar']:['Borradores',courses.filter(course=>course.status==='draft').length,'Pendientes de publicar','book'],['Evaluaciones enviadas',summary.evaluations,'Intentos completados','results']].map(([label,value,note,symbol])=>`<article class="panel dashboard-metric"><span class="dashboard-metric-label">${label}${icon(symbol)}</span><strong>${number(value)}</strong><small>${note}</small></article>`).join('');
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
    filter.addEventListener('change',()=>{if(selectedChart==='views')publications();});
    chartButtons.forEach(button=>button.addEventListener('click',()=>{selectedChart=button.dataset.dashboardChart;renderChart();}));
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
