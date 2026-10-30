import {isVideo,materialDuration,materialUploadFields,mountMaterialUpload} from '../components/material-upload.js?v=20261030-4';
import {paginationControls,mountPagination,searchText} from '../components/list-controls.js?v=20261030-4';
import {breadcrumbs} from '../components/ui.js?v=20261030-4';
import {courseProgress} from '../components/course-progress.js?v=20261030-4';
import {courseCover,courseCoverUrl,mountCourseCovers} from '../components/course-cover.js?v=20261030-4';
import {query,command,upload,fileUrl} from '../api.js?v=20261030-4';
import {heading,escape,empty,status,field,busy,toast,confirmAction,icon,categoryBadge} from '../components/common.js?v=20261030-4';
import {attachValidation} from '../components/form-validation.js?v=20261030-4';
import {categoryPicker,mountCategoryPicker} from '../components/category-picker.js?v=20261030-4';
function examLabel(exam) {
  if(!exam)return 'Examen pendiente';
  if(!Number(exam.enabled))return 'Examen desactivado';
  const now=Date.now(),stamp=value=>new Date(value.replace(' ','T')+'-05:00').getTime();
  if(exam.opens_at&&now<stamp(exam.opens_at))return 'Examen programado';
  if(exam.closes_at&&now>=stamp(exam.closes_at))return 'Examen finalizado';
  return 'Examen disponible';
}
export async function coursesPage() {
  const courses=await query('content','admin.list');
  const published=courses.filter(course=>course.status==='published').length;
  return {html:`${heading('BIBLIOTECA INTERNA','Capacitaciones','Materiales, evaluaciones y resultados en un solo lugar.', '<a class="button white" href="#admin/capacitaciones/resultados">Ver resultados</a><a class="button primary" href="#admin/capacitaciones/nuevo" aria-label="Nueva capacitación">+ Nueva</a>')}<div class="training-overview"><span><strong>${courses.length}</strong> en total</span><span><strong>${published}</strong> publicadas</span><span><strong>${courses.length-published}</strong> en borrador</span></div><section class="training-library"><div class="toolbar"><label class="search"><span class="sr-only">Buscar capacitación</span><input id="admin-search" type="search" placeholder="Buscar por título o categoría"></label><label>Estado<select id="status-filter"><option value="">Todos</option><option value="draft">Borrador</option><option value="published">Publicado</option></select></label></div><div id="admin-courses"></div>${paginationControls('capacitaciones')}</section>`,mount(root){
    let cleanupCovers=()=>{};
    const target=root.querySelector('#admin-courses'),pager=mountPagination(root.querySelector('[data-list-pagination]'),{size:6,onChange:()=>render()});
    const render=()=>{
      cleanupCovers();
      const search=searchText(root.querySelector('#admin-search').value),filter=root.querySelector('#status-filter').value;
      const rows=courses.filter(course=>(!filter||course.status===filter)&&searchText(`${course.title} ${course.category}`).includes(search));
      const visible=pager.slice(rows);
      target.innerHTML=rows.length?`<div class="training-grid">${visible.map(course=>{
        const withoutExam=Number(course.exam_required??1)===0;
        const exam=course.exam_version?{enabled:course.exam_enabled,opens_at:course.exam_opens_at,closes_at:course.exam_closes_at}:null;
        return `<article class="panel training-card"><a class="training-card-cover" href="#admin/capacitaciones/${course.id}" aria-label="${course.status==='draft'&&!course.first_published_at?'Continuar creación de':'Gestionar'} ${escape(course.title)}">${courseCover(course)}</a><div class="training-card-body"><div class="training-card-meta">${categoryBadge(course.category)}${status(course.status)}</div><h2><a href="#admin/capacitaciones/${course.id}">${escape(course.title)}</a></h2><div class="training-card-facts"><span class="content-visits" title="Aperturas públicas, una por sesión. No incluye revisiones de administradores.">${Number(course.view_count||0).toLocaleString('es-PE')} visitas</span><span>${course.material_count} ${Number(course.material_count)===1?'material':'materiales'}</span><span>${withoutExam?'Solo material':course.exam_duration_minutes?`${course.exam_duration_minutes} min por intento`:'Duración por definir'}</span></div>${withoutExam?'':`<p class="training-exam-state">${examLabel(exam)}${course.exam_version?` · v${course.exam_version}`:''}</p>`}<div class="training-card-actions"><a class="button primary small" href="#admin/capacitaciones/${course.id}">${course.status==='draft'&&!course.first_published_at?'Continuar creación':'Gestionar'}</a>${withoutExam?'':`<a class="button white small" href="#admin/examen/${course.id}">${course.exam_version?'Ver examen':'Crear examen'}</a>`}</div></div></article>`;
      }).join('')}</div>`:empty('No hay capacitaciones para mostrar.');
      cleanupCovers=mountCourseCovers(target);
    };
    root.querySelector('#admin-search').addEventListener('input',()=>{pager.reset();render();});
    root.querySelector('#status-filter').addEventListener('change',()=>{pager.reset();render();});
    render();return ()=>cleanupCovers();
  }};
}
export async function courseEditor(id,reload,publishStep=false,user=null) {
  const creating=id==='nuevo',superadmin=user?.role==='superadmin';
  const [categories,sites,limits]=await Promise.all([query('content','categories.list',{scope:'course'}),superadmin?query('admin','sites.list'):Promise.resolve([]),query('content','upload.options')]);
  const course=creating?{title:'',category:'SSOMA',description:'',status:'draft',materials:[],exam_required:1,site_id:user?.site_id||null}:await query('content','admin.get',{id});
  const activeSites=sites.filter(site=>Number(site.active)||String(site.id)===String(course.site_id)),selectedSite=course.site_id||(activeSites.length===1?activeSites[0].id:'');
  const siteField=superadmin?`<label class="field">Sede responsable<select name="site_id" required><option value="">Selecciona una sede</option>${activeSites.map(site=>`<option value="${site.id}" ${String(site.id)===String(selectedSite)?'selected':''}>${escape(site.name)}${!Number(site.active)?' (inactiva)':''}</option>`).join('')}</select></label>`:'';
  const configuring=creating||(course.status==='draft'&&!course.first_published_at);
  const withoutExam=Number(course.exam_required??1)===0,coverMaterials=course.materials.filter(file=>!isVideo(file)),hasVideo=course.materials.some(isVideo);
  const actionDock=`<section class="course-action-dock" aria-label="Acciones de la capacitación"><div class="course-action-copy"><strong>${creating?'Crear y continuar':'Siguiente acción'}</strong><p id="publish-state" class="hint" role="status"></p></div><div class="course-action-buttons">${creating?'':`<details class="course-more-actions"><summary class="button white">Más</summary><button type="button" class="link-button" id="archive">Archivar</button><button type="button" class="button danger small" id="delete-course">Eliminar definitivamente</button></details><a class="button white" id="course-exam-action" href="#admin/examen/${id}" ${withoutExam?'hidden':''}>${course.exam?'Configurar examen':'Crear examen'}</a>`}<button class="button ${creating?'primary':'white'}" id="course-save" type="submit" form="course-form" ${creating?'':'disabled'}>${creating?'Crear y continuar':'Guardar cambios'} ${icon('next')}</button>${creating?'':`<button class="button primary" type="button" id="publish" aria-describedby="publish-state" ${course.status==='published'?'disabled':''}>${course.status==='published'?'Publicado':'Publicar'}</button>`}</div></section>`;
  return {html:`${breadcrumbs([{label:'Capacitaciones',href:'#admin/capacitaciones'},{label:creating?'Nueva':course.title}])}${heading('EDITOR DE CONTENIDO',creating?'Nueva capacitación':publishStep?'Revisar y publicar':configuring?'Completar creación':'Gestionar capacitación',configuring?'Configura materiales y evaluación. La modalidad se fijará cuando publiques por primera vez.':'Actualiza la información, portada, materiales y preguntas. La modalidad publicada se conserva.','')}<div id="course-progress">${courseProgress({information:!creating,material:!!course.materials.length,exam:!!course.exam,withoutExam,published:course.status==='published'})}</div>${actionDock}<div class="editor-layout training-editor"><section class="panel padded"><span class="eyebrow">1 · INFORMACIÓN GENERAL</span><h2>Información</h2><form id="course-form"><div class="form-grid">${field('Título','title',course.title,'required minlength="5" maxlength="160"')}${categoryPicker(categories,course.category,'course')}${siteField}<label class="field full">Descripción<textarea name="description" required minlength="10" maxlength="1500" rows="4">${escape(course.description)}</textarea></label>${configuring?`<label class="course-exam-option full"><input type="checkbox" name="without_exam" ${withoutExam?'checked':''}><span><strong>Sin examen</strong><small>Puedes cambiar esta opción mientras preparas el borrador. Se fija al publicar por primera vez.</small></span></label>`:`<div class="field full course-exam-mode"><span>Modalidad</span><strong>${withoutExam?'Sin examen':'Con examen'}</strong><small>La modalidad está fijada desde la primera publicación.${withoutExam?'':' Puedes modificar las preguntas desde Configurar examen.'}</small></div>`}${creating?materialUploadFields(limits):''}</div><p id="course-save-state" class="hint" role="status">${creating?'Completa los campos para continuar.':'Sin cambios pendientes.'}</p></form></section><aside><section class="panel padded"><span class="eyebrow">ESTADO ACTUAL</span><h2>${status(course.status)}</h2><p class="content-visits" title="Aperturas públicas, una por sesión. No incluye revisiones de administradores.">${Number(course.view_count||0).toLocaleString('es-PE')} visitas</p><p class="hint">El indicador superior muestra qué falta. Guardar, configurar el examen y publicar están reunidos en una sola barra.</p>${creating?'':`<div class="training-exam-summary"><strong>${withoutExam?'Sin examen':examLabel(course.exam)}</strong>${withoutExam?'':`<dl><div><dt>Apertura</dt><dd>${escape(course.exam?.opens_at?.slice(0,16)||'Por definir')}</dd></div><div><dt>Cierre</dt><dd>${escape(course.exam?.closes_at?.slice(0,16)||'Sin fecha de cierre')}</dd></div><div><dt>Tiempo por intento</dt><dd>${course.exam?.duration_minutes?`${course.exam.duration_minutes} minutos`:'Por definir'}</dd></div></dl><span class="hint">Horario de Perú</span>`}</div>${course.exam?`<a class="text-link" href="#admin/capacitaciones/resultados/${course.exam.id}">Ver resultados</a>`:''}${course.status==='published'?`<a class="text-link" href="#curso/${id}">Ver en el portal ${icon('next')}</a>`:''}`}</section></aside></div>${creating?'':`<section class="panel padded cover-settings" aria-labelledby="cover-settings-title"><div>${courseCover(course)}</div><div><span class="eyebrow">2 · PRESENTACIÓN</span><h2 id="cover-settings-title">Elige la portada</h2><p class="hint">Esta imagen se mostrará en Inicio, en la capacitación y en el reproductor de video.</p>${hasVideo&&!course.custom_cover_id?'<p class="cover-choice-status" role="status">El video aún no tiene una imagen de portada elegida.</p>':''}<form id="custom-cover-form" class="custom-cover-form"><label class="field">Selecciona tu imagen de portada<input name="cover_image" type="file" accept=".jpg,.jpeg,.png,.webp" data-max-mb="8" required><small>JPG, PNG o WEBP · hasta 8 MB. Reemplaza solo la portada, no el material.</small></label><div id="custom-cover-preview" hidden></div><button class="button primary" type="submit">${icon('image')} Guardar imagen de portada</button></form><div class="document-cover-choice" ${coverMaterials.length?'':'hidden'}><label class="field">O usar la primera página de un documento<select id="cover-file">${coverMaterials.map(file=>`<option value="${file.id}" ${Number(file.id)===Number(course.cover_file_id)?'selected':''}>${escape(file.original_name)}</option>`).join('')}</select></label><button type="button" class="button white" id="save-cover" ${coverMaterials.length?'':'disabled'}>Usar como portada</button></div></div></section><section class="panel padded material-admin" id="material-admin"><div class="heading"><div><span class="eyebrow">3 · MATERIALES</span><h2>Documentos y videos</h2><p>Todos los materiales pertenecen a esta capacitación y comparten su contador de vistas.</p></div></div><form id="upload-form" class="upload-box">${materialUploadFields(limits)}<button class="button primary" type="submit">Subir material ${icon('upload')}</button></form><div class="files-list">${course.materials.map(file=>`<article><span class="format">${escape(file.extension.toUpperCase())}</span><div><strong>${escape(file.original_name)}</strong><small>${(file.size/1024/1024).toFixed(2)} MB · ${isVideo(file)?`${materialDuration(file.duration_seconds)} · ${Number(file.video_width)||0} × ${Number(file.video_height)||0} px`:file.preview_status==='ready'?'Vista previa lista':file.preview_status==='failed'?'No se pudo procesar':'Procesando vista previa'}</small>${!isVideo(file)&&file.preview_status==='failed'?`<button type="button" class="link-button" data-retry-preview="${file.id}">Reintentar portada</button>`:''}</div>${isVideo(file)?`<details class="admin-video-preview"><summary>Ver video</summary><video controls playsinline preload="none" ${course.custom_cover_id?`poster="${courseCoverUrl(course)}"`:''} src="${fileUrl(file.id)}" aria-label="${escape(file.original_name)}"></video></details>`:''}<a href="${fileUrl(file.id,true)}">Descargar</a><button class="button danger small" data-delete-file="${file.id}">Quitar</button></article>`).join('')}</div></section>`}`,mount(root){
    let disposed=false,saving=false,publishing=false,deleting=false;
    const form=root.querySelector('#course-form'),save=root.querySelector('#course-save'),publish=root.querySelector('#publish'),examAction=root.querySelector('#course-exam-action');
    const values=()=>({title:form.elements.title.value.trim(),category:form.elements.category.value.trim(),description:form.elements.description.value.trim(),exam_required:configuring?(form.elements.without_exam.checked?0:1):Number(course.exam_required??1),...(form.elements.site_id?{site_id:form.elements.site_id.value}:{})});
    let baseline=JSON.stringify(values());
    const categoryReady=mountCategoryPicker(form),validate=attachValidation(form),initialUpload=creating?mountMaterialUpload(form,limits):null;
    function sync(){
      if(disposed)return;
      const data=values(),dirty=JSON.stringify(data)!==baseline,material=creating?!!form.elements.file.files.length:!!course.materials.length;
      save.disabled=saving||publishing||deleting||(!creating&&!dirty);
      const valid=data.title.length>=5&&!!data.category&&data.description.length>=10&&(!form.elements.site_id||!!data.site_id);
      if(publish){
        publish.disabled=saving||publishing||deleting||course.status==='published'||!material||!valid||!!(data.exam_required&&!course.exam);
        if(!publishing)publish.textContent=course.status==='published'?'Publicado':dirty?'Guardar y publicar':'Publicar';
      }
      if(examAction)examAction.hidden=!data.exam_required;
      root.querySelector('#publish-state').textContent=creating?(!material?'Adjunta el material inicial para continuar.':!valid?'Completa título, categoría y descripción.':'Todo listo para crear y continuar.'):course.status==='published'?'Ya está disponible en el portal.':!material?'Adjunta un documento o video para publicar.':data.exam_required&&!course.exam?'Configura las preguntas del examen para publicar.':dirty?'Al publicar se guardarán los cambios pendientes.':data.exam_required?'Lista para publicar con examen.':'Lista para publicar sin examen.';
      root.querySelector('#course-save-state').textContent=saving?'Guardando…':dirty?'Hay cambios sin guardar.':creating?'':'Sin cambios pendientes.';
      root.querySelector('#course-progress').innerHTML=courseProgress({information:data.title.length>=5&&!!data.category&&data.description.length>=10,material,exam:!!course.exam,withoutExam:!data.exam_required,published:course.status==='published',dirty});
    }
    form.addEventListener('input',sync);form.addEventListener('change',sync);sync();
    examAction?.addEventListener('click',event=>{
      if(saving||publishing||deleting){event.preventDefault();return;}
      if(JSON.stringify(values())===baseline)return;
      event.preventDefault();if(!categoryReady()||!validate())return;
      busy(examAction,async()=>{
        saving=true;const data=values(),controls=[...form.querySelectorAll('input,textarea,select')].map(control=>[control,control.disabled]);controls.forEach(([control])=>control.disabled=true);sync();
        try{const saved=await command('content','save',{...data,id:Number(id)});if(disposed)return;Object.assign(course,saved);baseline=JSON.stringify(data);location.hash=`admin/examen/${id}`;}
        finally{saving=false;controls.forEach(([control,disabled])=>control.disabled=disabled);sync();}
      });
    });
    form.addEventListener('submit',event=>{
      event.preventDefault();if(creating)initialUpload.check();if(saving||publishing||deleting||(!creating&&JSON.stringify(values())===baseline)||!categoryReady()||!validate())return;
      busy(save,async()=>{
        saving=true;const data=values(),file=creating?form.elements.file.files[0]:null;
        const fields=[...form.querySelectorAll('input,select,textarea')].map(control=>[control,control.disabled]);
        fields.forEach(([control])=>control.disabled=true);initialUpload?.start();sync();
        try{
          const saved=creating?await upload('content','create',file,data,{onProgress:value=>initialUpload.progress(value)}):await command('content','save',{...data,id:Number(id)});
          if(disposed)return;
          baseline=JSON.stringify(data);Object.assign(course,saved);toast(creating?'Borrador creado. Continúa con portada y evaluación.':'Capacitación guardada.');
          if(creating)location.hash=`admin/capacitaciones/${saved.id}`;else await reload();
        }catch(error){if(creating&&error.status===422&&!Object.keys(error.fields||{}).length)validate.setError(form.elements.file,error.message);throw error;}
        finally{saving=false;initialUpload?.finish();fields.forEach(([control,disabled])=>control.disabled=disabled);}
      }).then(sync);
    });
    if(creating)return ()=>{disposed=true;initialUpload.dispose();};const cleanupCover=mountCourseCovers(root);
    let localCover='';const coverForm=root.querySelector('#custom-cover-form'),coverPreview=root.querySelector('#custom-cover-preview'),validateCover=attachValidation(coverForm);
    const releaseCover=()=>{if(localCover){URL.revokeObjectURL(localCover);localCover='';}};
    coverForm.elements.cover_image.addEventListener('change',()=>{releaseCover();const file=coverForm.elements.cover_image.files[0];coverPreview.hidden=true;coverPreview.replaceChildren();if(file&&/\.(png|jpe?g|webp)$/i.test(file.name)&&file.size<=8*1024*1024){localCover=URL.createObjectURL(file);coverPreview.innerHTML=`<img src="${escape(localCover)}" alt="Vista previa de la portada personalizada">`;coverPreview.hidden=false;}});
    coverForm.addEventListener('submit',event=>{event.preventDefault();if(!validateCover())return;busy(coverForm.querySelector('[type=submit]'),async()=>{const input=coverForm.elements.cover_image;input.disabled=true;try{await upload('content','cover.upload',input.files[0],{id:Number(id)});if(disposed)return;toast('Portada personalizada guardada.');await reload();}finally{input.disabled=false;}});});
    if(publishStep)root.querySelector('#publish')?.focus({preventScroll:true});
    const coverSelect=root.querySelector('#cover-file'),coverButton=root.querySelector('#save-cover');const syncCover=()=>{coverButton.disabled=!coverSelect.value||!course.custom_cover_id&&Number(coverSelect.value)===Number(course.cover_file_id);};coverSelect.addEventListener('change',syncCover);syncCover();root.querySelector('#save-cover').addEventListener('click',event=>busy(event.target,async()=>{await command('content','cover',{id:Number(id),file_id:Number(root.querySelector('#cover-file').value)});toast('Portada actualizada.');await reload();}));root.querySelectorAll('[data-retry-preview]').forEach(button=>button.addEventListener('click',()=>busy(button,async()=>{await command('content','preview.retry',{id:Number(button.dataset.retryPreview)});await reload();})));publish.addEventListener('click',event=>{
      if(saving||publishing||deleting||!categoryReady()||!validate())return;
      busy(event.currentTarget,async()=>{
        publishing=true;const data=values(),fields=[...form.querySelectorAll('input,select,textarea')].map(control=>[control,control.disabled]);
        fields.forEach(([control])=>control.disabled=true);sync();
        try{
          if(JSON.stringify(data)!==baseline){const saved=await command('content','save',{...data,id:Number(id)});Object.assign(course,saved);baseline=JSON.stringify(data);}
          if(disposed)return;
          const published=await command('content','publish',{id:Number(id)});Object.assign(course,published);
          if(!disposed){window.location.hash='admin/capacitaciones';toast('Tu capacitación ya está disponible en el portal.','success',{title:'¡Capacitación publicada!',prominent:true});}
        }finally{publishing=false;fields.forEach(([control,disabled])=>control.disabled=disabled);}
      }).then(sync);
    });root.querySelector('#archive').addEventListener('click',async event=>{if(await confirmAction('¿Archivar esta capacitación y retirarla del catálogo? Los resultados existentes se conservarán.',{label:'Archivar'}))busy(event.target,async()=>{await command('content','delete',{id:Number(id)});location.hash='admin/capacitaciones';});});const uploadForm=root.querySelector('#upload-form'),validateUpload=attachValidation(uploadForm),materialUpload=mountMaterialUpload(uploadForm,limits);let uploading=false;
    uploadForm.addEventListener('submit',async event=>{event.preventDefault();if(uploading)return;materialUpload.check();if(!validateUpload())return;const file=uploadForm.elements.file.files[0];uploading=true;
      if(!await confirmAction(`Se agregará ${file.name} (${(file.size/1024/1024).toFixed(1)} MB) a esta capacitación.`,{title:'Agregar material',label:'Subir material'})){uploading=false;return;}
      if(disposed){uploading=false;return;}
      busy(uploadForm.querySelector('[type="submit"]'),async()=>{materialUpload.start();try{await upload('content','upload',file,{course_id:id},{onProgress:materialUpload.progress});if(disposed)return;toast('Material cargado.');await reload();}catch(error){if(!disposed&&[413,422].includes(error.status))validateUpload.setError(uploadForm.elements.file,error.message);throw error;}finally{uploading=false;materialUpload.finish();}});
    });root.querySelectorAll('[data-delete-file]').forEach(button=>button.addEventListener('click',async()=>{if(await confirmAction('¿Quitar este material? Si es el último, la capacitación volverá a borrador.',{label:'Quitar material'}))busy(button,async()=>{await command('content','file.delete',{id:Number(button.dataset.deleteFile)});await reload();});}));root.querySelector('#delete-course').addEventListener('click',async event=>{
      const button=event.currentTarget;
      if(deleting||saving||publishing||uploading||root.querySelector('[aria-busy="true"]'))return;
      deleting=true;
      try{
        if(!await confirmAction(`Se eliminará «${course.title}» por completo: materiales, portada propia, exámenes, participantes de esta capacitación, intentos, resultados y vistas. Esta acción no se puede deshacer.`,{title:'Eliminar capacitación definitivamente',label:'Eliminar definitivamente'}))return;
        if(disposed)return;
        await busy(button,async()=>{
          const controls=[...root.querySelectorAll('button,input,select,textarea')].map(control=>[control,control.disabled]);controls.forEach(([control])=>control.disabled=true);
          try{await command('content','purge',{id:Number(id),confirm_delete:true});if(!disposed){location.hash='admin/capacitaciones';toast('Capacitación eliminada por completo.');}}
          finally{controls.forEach(([control,disabled])=>control.disabled=disabled);}
        });
      }finally{deleting=false;sync();}
    });return ()=>{disposed=true;materialUpload.dispose();root.querySelectorAll('video').forEach(video=>video.pause());cleanupCover();releaseCover();};}};
}
