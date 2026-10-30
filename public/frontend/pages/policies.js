import {query,command,upload,fileUrl} from '../api.js?v=20261030-4';
import {heading,breadcrumbs,escape,empty,field,busy,toast,confirmAction,icon,date} from '../components/common.js?v=20261030-4';
import {paginationControls,mountPagination,searchText} from '../components/list-controls.js?v=20261030-4';
import {attachValidation} from '../components/form-validation.js?v=20261030-4';
import {materialViewer} from '../components/material-viewer.js?v=20261030-4';
const sizeLabel=bytes=>Number(bytes)<1024*1024?`${Math.max(1,Math.ceil(Number(bytes)/1024))} KB`:`${(Number(bytes)/1024/1024).toFixed(1)} MB`;

export async function policiesPage(admin=false){
 const policies=await query('policy',admin?'admin.list':'list');
 return {html:`<div class="${admin?'':'container section '}policies-page">${heading('DOCUMENTOS INSTITUCIONALES','Políticas',admin?'Administra los documentos que pueden consultar y descargar los trabajadores.':'Consulta los lineamientos vigentes y descarga el documento que necesitas.',admin?'<a class="button primary" href="#admin/politicas/nueva">+ Nueva política</a>':'')}<div class="toolbar"><label class="search"><span class="sr-only">Buscar políticas</span><input type="search" data-policy-search placeholder="Buscar por título o descripción"></label>${admin?'<label>Estado<select data-policy-state><option value="">Todos</option><option value="1">Publicado</option><option value="0">Borrador</option></select></label>':''}</div><div class="policy-grid" data-policy-results></div>${paginationControls('políticas')}</div>`,mount(root){
  const results=root.querySelector('[data-policy-results]'),search=root.querySelector('[data-policy-search]'),filter=root.querySelector('[data-policy-state]');
  const pager=mountPagination(root.querySelector('[data-list-pagination]'),{size:6,onChange:render});
  function render(){
   const term=searchText(search.value),rows=policies.filter(item=>searchText(`${item.title} ${item.description}`).includes(term)&&(!filter?.value||String(item.active)===filter.value));
   const visible=pager.slice(rows);
   results.innerHTML=rows.length?visible.map(item=>`<article class="panel policy-card"><div class="policy-card-top"><span class="policy-file-symbol" aria-hidden="true">${icon('book')}<small>PDF</small></span><span class="hint">${sizeLabel(item.size)}${admin?` · ${Number(item.active)?'Publicado':'Borrador'}`:''}</span></div><h2><a href="#${admin?'admin/politicas':'politicas'}/${item.id}">${escape(item.title)}</a></h2><p class="policy-description">${escape(item.description)}</p><small class="hint">Actualizado: ${date(item.updated_at)}</small><div class="policy-card-actions"><a class="button ${admin?'white':'primary'}" href="#${admin?'admin/politicas':'politicas'}/${item.id}">${admin?'Gestionar':'Ver política'} ${icon('next')}</a><a class="button white" href="${fileUrl(item.file_id,true)}" aria-label="Descargar PDF: ${escape(item.title)}" title="Descargar PDF">${icon('download')}</a></div></article>`).join(''):empty(policies.length?'No hay políticas que coincidan.':admin?'Todavía no has agregado políticas.':'Próximamente encontrarás aquí las políticas publicadas.');
  }
  const change=()=>{pager.reset();render();};search.addEventListener('input',change);filter?.addEventListener('change',change);render();
 }};
}

export async function policyPage(id){
 const policy=await query('policy','get',{id});
 const viewer=materialViewer([{id:policy.file_id,extension:'pdf',original_name:policy.original_name,size:policy.size}],{title:'Documento'});
 return {html:`<div class="container section policy-detail">${breadcrumbs([{label:'Políticas',href:'#politicas'},{label:policy.title}])}<header class="policy-detail-heading"><span class="eyebrow">POLÍTICA · PDF · ${sizeLabel(policy.size)}</span><h1>${escape(policy.title)}</h1><p class="policy-full-description">${escape(policy.description)}</p><div class="policy-detail-actions"><span class="hint">Actualizado: ${date(policy.updated_at)}</span><a class="button primary" href="${fileUrl(policy.file_id,true)}">${icon('download')} Descargar PDF</a></div></header>${viewer.html}<p class="hint">Si tu dispositivo no muestra el documento, puedes descargarlo y abrirlo en tu lector de PDF.</p></div>`,mount:root=>viewer.mount(root)};
}

export async function policyEditor(id,user){
 const creating=id==='nueva';
 const [policy,sites,limits]=await Promise.all([creating?Promise.resolve({title:'',description:'',active:1}):query('policy','admin.get',{id}),creating&&user.role==='superadmin'?query('admin','sites.list'):Promise.resolve([]),query('content','upload.options')]);
 const activeSites=sites.filter(site=>Number(site.active));
 const maxBytes=Math.min(50*1024*1024,limits.document_max_bytes),maxMB=Math.floor(maxBytes/1024/1024);
 const viewer=creating?null:materialViewer([{id:policy.file_id,extension:'pdf',original_name:policy.original_name,size:policy.size}],{title:'PDF guardado'});
 return {html:`${breadcrumbs([{label:'Políticas',href:'#admin/politicas'},{label:creating?'Nueva':policy.title}])}${heading('POLÍTICAS',creating?'Nueva política':'Gestionar política',creating?'Agrega un título claro, una descripción y el PDF.':'Puedes actualizar el texto, sustituir el PDF o retirar la publicación.')}<div class="policy-editor-layout"><section class="panel padded"><form id="policy-form"><div class="form-grid">${field('Título','title',policy.title,'required minlength="3" maxlength="160"')}<label class="field full">Descripción<textarea name="description" rows="4" required minlength="10" maxlength="1500">${escape(policy.description)}</textarea></label>${creating&&user.role==='superadmin'?`<label class="field full">Sede responsable<select name="site_id" required><option value="">Selecciona una sede</option>${activeSites.map(site=>`<option value="${site.id}" ${activeSites.length===1?'selected':''}>${escape(site.name)}</option>`).join('')}</select></label>`:''}<label class="field full">${creating?'Documento PDF':'Reemplazar PDF (opcional)'}<input type="file" name="file" accept=".pdf,application/pdf" ${creating?'required':''}><small>PDF · hasta ${maxMB} MB.${creating?'':' Si no eliges otro archivo, se conserva el actual.'}</small></label><p class="hint full" data-policy-file role="status">${creating?'Ningún archivo seleccionado.':`Actual: ${escape(policy.original_name)} · ${sizeLabel(policy.size)}`}</p><label class="course-exam-option full"><input type="checkbox" name="active" ${Number(policy.active)?'checked':''}><span><strong>Visible en Políticas</strong><small>Desmarca para guardar como borrador.</small></span></label></div><div class="policy-upload-progress" hidden><progress max="100" value="0" aria-label="Progreso de carga"></progress><span role="status"></span></div><div class="actions"><a class="button white" href="#admin/politicas">Volver</a><button class="button primary" type="submit">${creating?'Guardar política':'Guardar cambios'}</button></div></form>${creating?'':`<div class="policy-remove"><button class="button danger" data-delete-policy>${icon('trash')} Eliminar política</button></div>`}</section><aside class="policy-editor-preview">${viewer?viewer.html:'<div class="panel padded"><span class="policy-file-symbol" aria-hidden="true">'+icon('book')+'<small>PDF</small></span><h2>Un documento, fácil de consultar</h2><p>La publicación tendrá su propia página con título, descripción, visor y descarga. Revisa el PDF que seleccionas antes de confirmar.</p></div>'}</aside></div>`,mount(root){
  let disposed=false,saving=false;const form=root.querySelector('#policy-form'),input=form.elements.file,progress=root.querySelector('.policy-upload-progress');
  const cleanupViewer=viewer?.mount(root),button=form.querySelector('[type=submit]');
  const values=()=>({title:form.elements.title.value.trim(),description:form.elements.description.value.trim(),active:form.elements.active.checked?1:0,...(form.elements.site_id?{site_id:form.elements.site_id.value}:{})});
  let baseline=JSON.stringify(values());
  function sync(){button.disabled=saving||(!creating&&baseline===JSON.stringify(values())&&!input.files.length);}
  const validate=attachValidation(form,()=>{
   const file=input.files[0];if(!file)return [];
   return !/\.pdf$/i.test(file.name)||!file.size||file.size>maxBytes?[{control:input,message:`Selecciona un PDF de hasta ${maxMB} MB.`}]:[];
  });
  form.addEventListener('input',sync);form.addEventListener('change',sync);
  input.addEventListener('change',()=>{const file=input.files[0];root.querySelector('[data-policy-file]').textContent=file?`${file.name} · ${sizeLabel(file.size)}`:creating?'Ningún archivo seleccionado.':`Actual: ${policy.original_name} · ${sizeLabel(policy.size)}`;});sync();
  const leave=event=>{if(saving){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',leave);
  form.addEventListener('submit',async event=>{
   event.preventDefault();if(saving||!validate())return;saving=true;
   try{
    const data=values(),file=input.files[0];
    if(!await confirmAction(`${data.active?'La política estará visible para consulta y descarga.':'Se guardará como borrador, sin acceso público.'}${file&&!creating?' El PDF actual será reemplazado.':''}`,{title:creating?'Guardar política':'Guardar cambios',label:'Confirmar'}))return;
    if(disposed)return;
    await busy(button,async()=>{
     const controls=[...form.querySelectorAll('input,textarea,select')];controls.forEach(control=>control.disabled=true);
     try{
      if(file)progress.hidden=false;
      const params={...data,...(creating?{}:{id:Number(id)})};
      const saved=file?await upload('policy',creating?'create':'save',file,params,{onProgress:percent=>{if(disposed)return;progress.querySelector('progress').value=percent;progress.querySelector('span').textContent=percent>=100?'Validando y guardando…':`Subiendo PDF… ${percent} %`;}}):await command('policy','save',params);
      if(disposed)return;baseline=JSON.stringify(data);Object.assign(policy,saved);toast('Política guardada.');location.hash='admin/politicas';
     }finally{controls.forEach(control=>control.disabled=false);progress.hidden=true;}
    });
   }finally{saving=false;if(!disposed)sync();}
  });
  root.querySelector('[data-delete-policy]')?.addEventListener('click',async event=>{
   if(saving)return;const target=event.currentTarget;saving=true;
   try{if(!await confirmAction(`Se eliminará «${policy.title}» y su PDF. No se puede deshacer.`,{title:'Eliminar política',label:'Eliminar'}))return;if(disposed)return;await busy(target,async()=>{await command('policy','delete',{id:Number(id)});if(!disposed){toast('Política eliminada.');location.hash='admin/politicas';}});}finally{saving=false;if(!disposed)sync();}
  });
  return ()=>{disposed=true;cleanupViewer?.();window.removeEventListener('beforeunload',leave);};
 }};
}
