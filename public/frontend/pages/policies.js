import {query,command,uploadBundle,fileUrl} from '../api.js?v=20261030-8';
import {heading,breadcrumbs,escape,empty,field,busy,toast,confirmAction,icon} from '../components/common.js?v=20261030-8';
import {paginationControls,mountPagination,searchText} from '../components/list-controls.js?v=20261030-8';
import {attachValidation} from '../components/form-validation.js?v=20261030-8';
import {policyDocument} from '../components/policy-document.js?v=20261030-8';
const sizeLabel=bytes=>Number(bytes)<1024*1024?`${Math.max(1,Math.ceil(Number(bytes)/1024))} KB`:`${(Number(bytes)/1024/1024).toFixed(1)} MB`;
const coverImage=(policy,{preview=false}={})=>policy.cover_image_id?`<img src="${fileUrl(policy.cover_image_id)}" alt="${preview?'Vista previa de la portada':'Portada de '+escape(policy.title)}" loading="lazy">`:`<div class="policy-cover-placeholder">${icon('image')}<span>${preview?'Tu imagen de portada':'Documento institucional'}</span></div>`;

function cardContent(policy,{preview=false,admin=false}={}){
 const titleTag=preview?'h3':'h2';
 return `<div class="policy-card-image" ${preview?'data-policy-cover-preview':''}>${coverImage(policy,{preview})}</div><div class="policy-card-labels"><span class="policy-cover-badge">PDF</span>${admin?`<span class="badge" data-tone="${Number(policy.active)?'success':'neutral'}">${Number(policy.active)?'Publicado':'Borrador'}</span>`:''}</div><div class="policy-card-body"><${titleTag} ${preview?'data-policy-title-preview':''}>${escape(policy.title||(preview?'Título de tu política':''))}</${titleTag}><p class="policy-description" ${preview?'data-policy-description-preview':''}>${escape(policy.description||(preview?'Una descripción breve ayudará a encontrar el documento.':''))}</p></div>`;
}

export async function policiesPage(admin=false){
 const policies=await query('policy',admin?'admin.list':'list');
 return {html:`<div class="${admin?'':'container section '}policies-page">${heading('DOCUMENTOS INSTITUCIONALES','Políticas',admin?'Administra los documentos que pueden consultar y descargar los trabajadores.':'Consulta los lineamientos vigentes y descarga el documento que necesitas.',admin?'<a class="button primary" href="#admin/politicas/nueva">+ Nueva política</a>':'')}<div class="toolbar"><label class="search"><span class="sr-only">Buscar políticas</span><input type="search" data-policy-search placeholder="Buscar por título o descripción"></label>${admin?'<label>Estado<select data-policy-state><option value="">Todos</option><option value="1">Publicado</option><option value="0">Borrador</option></select></label>':''}</div><div class="policy-grid" data-policy-results></div>${paginationControls('políticas')}</div>`,mount(root){
  const results=root.querySelector('[data-policy-results]'),search=root.querySelector('[data-policy-search]'),filter=root.querySelector('[data-policy-state]');
  const pager=mountPagination(root.querySelector('[data-list-pagination]'),{size:6,onChange:render});
  function render(){
   const term=searchText(search.value),rows=policies.filter(item=>searchText(`${item.title} ${item.description}`).includes(term)&&(!filter?.value||String(item.active)===filter.value));
   const visible=pager.slice(rows);
   results.innerHTML=rows.length?visible.map(item=>`<article class="panel policy-card"><a class="policy-card-cover" href="#${admin?'admin/politicas':'politicas'}/${item.id}" aria-label="${admin?'Gestionar':'Ver'} ${escape(item.title)}">${cardContent(item,{admin})}</a></article>`).join(''):empty(policies.length?'No hay políticas que coincidan.':admin?'Todavía no has agregado políticas.':'Próximamente encontrarás aquí las políticas publicadas.');
  }
  const change=()=>{pager.reset();render();};search.addEventListener('input',change);filter?.addEventListener('change',change);render();
 }};
}

export async function policyPage(id){
 const policy=await query('policy','get',{id});
 const viewer=policyDocument(policy,{externalControls:true});
 return {html:`<div class="container section policy-detail">${breadcrumbs([{label:'Políticas',href:'#politicas'},{label:policy.title}])}<div class="policy-reader"><aside class="policy-detail-info"><div class="policy-detail-cover">${coverImage(policy)}</div><div class="policy-detail-copy"><span class="eyebrow">DOCUMENTO INSTITUCIONAL</span><h1>${escape(policy.title)}</h1><p class="policy-full-description">${escape(policy.description)}</p><div class="policy-detail-controls">${viewer.controls}</div></div></aside>${viewer.html}</div></div>`,mount:root=>viewer.mount(root)};
}

export async function policyEditor(id){
 const creating=id==='nueva';
 const [policy,limits]=await Promise.all([creating?Promise.resolve({title:'',description:'',active:1}):query('policy','admin.get',{id}),query('content','upload.options')]);
 const maxBytes=Math.min(50*1024*1024,limits.document_max_bytes),maxMB=Math.floor(maxBytes/1024/1024);
 const viewer=creating?null:policyDocument(policy,{title:'PDF guardado'});
 return {html:`${breadcrumbs([{label:'Políticas',href:'#admin/politicas'},{label:creating?'Nueva':policy.title}])}${heading('POLÍTICAS',creating?'Nueva política':'Gestionar política',creating?'Elige una portada, describe la política y adjunta su PDF.':'Actualiza la portada, el texto o el PDF; cada archivo se conserva si no lo reemplazas.')}<div class="policy-editor-layout"><section class="panel padded"><form id="policy-form"><div class="form-grid">${field('Título','title',policy.title,'required minlength="3" maxlength="160"')}<label class="field full">Descripción<textarea name="description" rows="4" required minlength="10" maxlength="1500">${escape(policy.description)}</textarea></label><label class="field full">${policy.cover_image_id?'Reemplazar portada (opcional)':'Imagen de portada'}<input type="file" name="cover_image" accept=".jpg,.jpeg,.png,.webp" ${creating?'required':''}><small>JPG, PNG o WEBP · hasta 8 MB. Tú eliges la imagen que se mostrará.</small></label><label class="field full">${creating?'Documento PDF':'Reemplazar PDF (opcional)'}<input type="file" name="file" accept=".pdf,application/pdf" ${creating?'required':''}><small>PDF · hasta ${maxMB} MB.${creating?'':' Si no eliges otro archivo, se conserva el actual.'}</small></label><p class="hint full" data-policy-file role="status">${creating?'Ningún archivo seleccionado.':`Actual: ${escape(policy.original_name)} · ${sizeLabel(policy.size)}`}</p><label class="course-exam-option full"><input type="checkbox" name="active" ${Number(policy.active)?'checked':''}><span><strong>Visible en Políticas</strong><small>Desmarca para guardar como borrador.</small></span></label></div><div class="policy-upload-progress" hidden><progress max="100" value="0" aria-label="Progreso de carga"></progress><span role="status"></span></div><div class="actions"><a class="button white" href="#admin/politicas">Volver</a><button class="button primary" type="submit">${creating?'Guardar política':'Guardar cambios'}</button></div></form>${creating?'':`<div class="policy-remove"><button class="button danger" data-delete-policy>${icon('trash')} Eliminar política</button></div>`}</section><aside class="policy-editor-preview"><section class="panel policy-preview-panel"><div class="policy-preview-heading"><h2>Así se verá</h2><span class="hint">Vista previa</span></div><div class="policy-card policy-live-card"><div class="policy-card-cover">${cardContent(policy,{preview:true})}</div></div></section></aside></div>${viewer?`<details class="policy-saved-pdf"><summary>Revisar PDF guardado · ${escape(policy.original_name)}</summary>${viewer.html}</details>`:''}`,mount(root){
  let disposed=false,saving=false,coverBlob='';const form=root.querySelector('#policy-form'),input=form.elements.file,coverInput=form.elements.cover_image,progress=root.querySelector('.policy-upload-progress');
  const cleanupViewer=viewer?.mount(root),button=form.querySelector('[type=submit]');
  const values=()=>({title:form.elements.title.value.trim(),description:form.elements.description.value.trim(),active:form.elements.active.checked?1:0});
  let baseline=JSON.stringify(values());
  function sync(){
   button.disabled=saving||(!creating&&baseline===JSON.stringify(values())&&!input.files.length&&!coverInput.files.length);
   root.querySelector('[data-policy-title-preview]').textContent=form.elements.title.value.trim()||'Título de tu política';
   root.querySelector('[data-policy-description-preview]').textContent=form.elements.description.value.trim()||'Una descripción breve ayudará a encontrar el documento.';
  }
  const validate=attachValidation(form,()=>{
   const file=input.files[0],cover=coverInput.files[0],issues=[];
   if(file&&(!/\.pdf$/i.test(file.name)||!file.size||file.size>maxBytes))issues.push({control:input,message:`Selecciona un PDF de hasta ${maxMB} MB.`});
   if(cover&&(!/\.(jpe?g|png|webp)$/i.test(cover.name)||!cover.size||cover.size>8*1024*1024))issues.push({control:coverInput,message:'Selecciona una imagen JPG, PNG o WEBP de hasta 8 MB.'});
   return issues;
  });
  form.addEventListener('input',sync);form.addEventListener('change',sync);
  input.addEventListener('change',()=>{const file=input.files[0];root.querySelector('[data-policy-file]').textContent=file?`${file.name} · ${sizeLabel(file.size)}`:creating?'Ningún archivo seleccionado.':`Actual: ${policy.original_name} · ${sizeLabel(policy.size)}`;});sync();
  const releaseCover=()=>{if(coverBlob)URL.revokeObjectURL(coverBlob);coverBlob='';};
  coverInput.addEventListener('change',()=>{
   releaseCover();const preview=root.querySelector('[data-policy-cover-preview]'),file=coverInput.files[0];preview.innerHTML=coverImage(policy,{preview:true});
   if(file&&/\.(jpe?g|png|webp)$/i.test(file.name)&&file.size>0&&file.size<=8*1024*1024){
    coverBlob=URL.createObjectURL(file);const img=document.createElement('img');img.src=coverBlob;img.alt='Vista previa de la portada elegida';preview.replaceChildren(img);
    img.addEventListener('error',()=>{if(!disposed&&img.isConnected){preview.innerHTML='<div class="policy-cover-placeholder">No se pudo leer la imagen. Selecciona otra.</div>';coverInput.setCustomValidity('No se pudo leer la imagen seleccionada.');}},{once:true});
   }
   coverInput.setCustomValidity('');sync();
  });
  const leave=event=>{if(saving){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',leave);
  form.addEventListener('submit',async event=>{
   event.preventDefault();if(saving||!validate())return;saving=true;
   try{
    const data=values(),file=input.files[0],cover=coverInput.files[0];
    if(!await confirmAction(`${data.active?'La política estará visible para consulta y descarga.':'Se guardará como borrador, sin acceso público.'}${file&&!creating?' El PDF actual será reemplazado.':''}${cover&&!creating?' Se actualizará la portada.':''}`,{title:creating?'Guardar política':'Guardar cambios',label:'Confirmar'}))return;
    if(disposed)return;
    await busy(button,async()=>{
     const controls=[...form.querySelectorAll('input,textarea,select')];controls.forEach(control=>control.disabled=true);
     try{
      if(file||cover)progress.hidden=false;
      const params={...data,...(creating?{}:{id:Number(id)})};
      const saved=file||cover?await uploadBundle('policy',creating?'create':'save',{file,cover_image:cover},params,{onProgress:percent=>{if(disposed)return;progress.querySelector('progress').value=percent;progress.querySelector('span').textContent=percent>=100?'Validando y guardando…':`Subiendo archivos… ${percent} %`;}}):await command('policy','save',params);
      if(disposed)return;baseline=JSON.stringify(data);Object.assign(policy,saved);toast('Política guardada.');location.hash='admin/politicas';
     }finally{controls.forEach(control=>control.disabled=false);progress.hidden=true;}
    });
   }finally{saving=false;if(!disposed)sync();}
  });
  root.querySelector('[data-delete-policy]')?.addEventListener('click',async event=>{
   if(saving)return;const target=event.currentTarget;saving=true;
   try{if(!await confirmAction(`Se eliminará «${policy.title}» junto con su PDF y portada. No se puede deshacer.`,{title:'Eliminar política',label:'Eliminar'}))return;if(disposed)return;await busy(target,async()=>{await command('policy','delete',{id:Number(id)});if(!disposed){toast('Política eliminada.');location.hash='admin/politicas';}});}finally{saving=false;if(!disposed)sync();}
  });
  return ()=>{disposed=true;releaseCover();cleanupViewer?.();window.removeEventListener('beforeunload',leave);};
 }};
}
