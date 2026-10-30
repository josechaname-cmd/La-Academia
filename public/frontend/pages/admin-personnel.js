import {paginationControls,mountPagination} from '../components/list-controls.js?v=20261030-4';
import {query,command,upload} from '../api.js?v=20261030-4';
import {heading,escape,field,formData,busy,toast,modal,empty,icon,confirmAction} from '../components/common.js?v=20261030-4';
import {attachValidation} from '../components/form-validation.js?v=20261030-4';

const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().trim();
const visibility=active=>`<span class="badge ${Number(active)?'green':''}">${Number(active)?'Activo':'Inactivo'}</span>`;
const siteOptions=(sites,selected='')=>sites.map(site=>`<option value="${site.id}" ${String(selected)===String(site.id)?'selected':''}>${escape(site.name)}${Number(site.active)?'':' (inactiva)'}</option>`).join('');
const personAction=(person,action)=>{const label=`${action==='edit'?(Number(person.active)?'Editar':'Editar o reactivar'):'Eliminar'} a ${person.name}`;return `<button type="button" class="button ${action==='edit'?'white':'danger'} small" data-${action}-person="${escape(person.dni)}" aria-label="${escape(label)}" title="${escape(label)}">${icon(action==='edit'?'edit':'trash')}</button>`;};
const personRows=people=>people.map(person=>`<tr><td><strong>${escape(person.name)}</strong><small>DNI ${escape(person.dni)}</small></td><td>${escape(person.job_title)}</td><td>${escape(person.site_name||'Sin sede asignada')}</td><td>${visibility(person.active)}</td><td><div class="personnel-row-actions">${personAction(person,'edit')}${Number(person.active)?personAction(person,'remove'):''}</div></td></tr>`).join('');
const table=()=>'<div class="table-scroll personnel-directory-table"><table><thead><tr><th>Trabajador</th><th>Cargo</th><th>Sede</th><th>Estado</th><th>Acciones</th></tr></thead><tbody data-person-rows></tbody></table></div><p class="hint" data-person-count role="status"></p>'+paginationControls('trabajadores');

export async function personnelPage(){
  let [people,sites]=await Promise.all([query('admin','personnel.list'),query('admin','sites.list')]);
  return {html:`${heading('SUPERADMINISTRACIÓN','Colaboradores por sede','Busca y gestiona trabajadores individualmente o valida un archivo para la carga masiva.','<button type="button" id="personnel-refresh" class="button white">Actualizar directorio</button><button type="button" id="new-person" class="button primary">+ Agregar trabajador</button>')}
    <section class="panel padded personnel-individual" aria-labelledby="personnel-individual-title"><span class="eyebrow">GESTIÓN INDIVIDUAL</span><h2 id="personnel-individual-title">Buscar trabajador</h2><p class="hint">Busca por DNI, nombre o cargo para editar sus datos, cambiar su sede o eliminarlo.</p><div class="form-grid"><label class="field">DNI, nombre o cargo<input type="search" id="personnel-search" placeholder="Escribe para buscar en todas las sedes" autocomplete="off"></label><label class="field">Filtrar por sede<select id="personnel-filter"><option value="">Todas las sedes</option>${siteOptions(sites)}<option value="none">Sin sede asignada</option></select></label></div><div id="personnel-search-results" hidden>${table()}</div><p id="personnel-search-hint" class="hint">También puedes abrir el directorio de una sede más abajo.</p></section>
    <details class="panel padded personnel-bulk"><summary>Carga masiva</summary><p class="hint">Carga trabajadores de cualquier sede. Primero valida el archivo y revisa las sedes. Los cambios se guardan solo al confirmar la carga.</p><form id="personnel-import"><div class="personnel-import-layout"><label class="field">Sede para filas sin sede<select name="site_id"><option value="">Usar solo las sedes del archivo</option>${siteOptions(sites.filter(site=>Number(site.active)))}</select><small>Solo se aplica cuando una fila no indica sede. No se asigna ninguna sede automáticamente.</small></label><label class="field">Archivo de colaboradores<input name="file" type="file" accept=".csv,.xlsx" required data-max-mb="8"><small>Hasta 8 MB. Columnas: DNI, nombre completo, cargo y sede. Una sede escrita en el archivo tiene prioridad y debe existir y estar activa.</small></label></div><button type="submit" class="button white">${icon('check')} Validar archivo</button></form><div id="personnel-import-result" aria-live="polite"></div></details>
    <div id="personnel-overview" class="training-overview"></div><section class="personnel-sites" aria-labelledby="personnel-sites-title"><div class="personnel-sites-heading"><div><span class="eyebrow">DIRECTORIO</span><h2 id="personnel-sites-title">Sedes y trabajadores</h2></div><p>Abre una sede para consultar y gestionar su personal.</p></div><div id="personnel-site-cards" class="personnel-sites-grid"></div></section>`,mount(root){
    let disposed=false,previewVersion=0;const pagers=new WeakMap();
    const search=root.querySelector('#personnel-search'),filter=root.querySelector('#personnel-filter'),result=root.querySelector('#personnel-search-results'),importForm=root.querySelector('#personnel-import'),importResult=root.querySelector('#personnel-import-result'),validateImport=attachValidation(importForm);
    const belongs=(person,site)=>site==='none'?!person.site_id:String(person.site_id)===String(site);
    const matches=(person,term)=>normalize(`${person.dni} ${person.name} ${person.job_title}`).includes(normalize(term));
    function fillTable(container,workers){
      let state=pagers.get(container);
      if(!state){state={workers:[],key:'',pager:mountPagination(container.querySelector('[data-list-pagination]'),{onChange:()=>fillTable(container,state.workers)})};pagers.set(container,state);}
      const key=workers.map(person=>person.dni).join(',');if(key!==state.key)state.pager.reset();
      state.key=key;state.workers=workers;const shown=state.pager.slice(workers);
      container.querySelector('[data-person-rows]').innerHTML=personRows(shown);
      container.querySelector('.table-scroll').hidden=!workers.length;
      container.querySelector('[data-person-count]').hidden=!!workers.length;
      container.querySelector('[data-person-count]').textContent='No se encontraron trabajadores. Puedes agregar uno con el botón «Agregar trabajador».';
    }
    function renderSearch(){
      const show=!!search.value.trim()||!!filter.value;
      result.hidden=!show;root.querySelector('#personnel-search-hint').hidden=show;
      if(show)fillTable(result,people.filter(person=>(!filter.value||belongs(person,filter.value))&&matches(person,search.value)));
    }
    function render(){
      const groups=sites.map(site=>({...site,people:people.filter(person=>belongs(person,site.id))}));
      if(people.some(person=>!person.site_id))groups.push({id:'none',name:'Sin sede asignada',address:'Requiere regularización',people:people.filter(person=>!person.site_id)});
      root.querySelector('#personnel-overview').innerHTML=`<span><strong>${people.filter(person=>Number(person.active)).length}</strong> colaboradores activos</span><span><strong>${groups.filter(site=>site.people.some(person=>Number(person.active))).length}</strong> sedes con personal</span>`;
      root.querySelector('#personnel-site-cards').innerHTML=groups.map(site=>{const total=site.people.filter(person=>Number(person.active)).length,inactive=site.people.length-total;return `<button type="button" class="personnel-site-card" data-site-workers="${escape(site.id)}"><span class="personnel-site-icon">${icon('building')}</span><span class="personnel-site-copy"><small>SEDE</small><strong>${escape(site.name)}</strong><span>${escape(site.address||'Ubicación no registrada')}</span></span><span class="personnel-site-total"><strong>${total}</strong><span>${total===1?'trabajador':'trabajadores'}</span>${inactive?`<small>${inactive} inactivos</small>`:''}</span><span class="personnel-site-next">${icon('next')}</span></button>`;}).join('')||empty('Todavía no hay sedes registradas.','<a class="button white" href="#admin/sedes">Gestionar sedes</a>');
      renderSearch();
    }
    function invalidatePreview(){previewVersion++;importResult.replaceChildren();}
    async function refresh(){
      [people,sites]=await Promise.all([query('admin','personnel.list'),query('admin','sites.list')]);
      if(disposed)return;
      const selected=filter.value,defaultSite=importForm.elements.site_id.value;
      filter.innerHTML=`<option value="">Todas las sedes</option>${siteOptions(sites)}<option value="none">Sin sede asignada</option>`;filter.value=selected;
      importForm.elements.site_id.innerHTML=`<option value="">Usar solo las sedes del archivo</option>${siteOptions(sites.filter(site=>Number(site.active)))}`;importForm.elements.site_id.value=defaultSite;
      invalidatePreview();render();
    }
    function closeEditor(back){if(back)back();else document.querySelector('#dialog').close();}
    function edit(person=null,siteId='',back=null){
      const record=person||{dni:/^[0-9]{8}$/.test(search.value.trim())?search.value.trim():'',name:'',job_title:'',site_id:siteId,active:1};
      document.querySelector('#dialog').classList.remove('personnel-dialog');
      modal(`<span class="eyebrow">GESTIÓN INDIVIDUAL</span><h2>${person?'Editar trabajador':'Agregar trabajador'}</h2><form id="personnel-form"><div class="form-grid">${field('DNI','dni',record.dni,`required inputmode="numeric" pattern="[0-9]{8}" minlength="8" maxlength="8" ${person?'readonly':''}`)}${field('Nombre completo','name',record.name,'required minlength="3" maxlength="120"')}${field('Cargo','job_title',record.job_title,'required maxlength="160"')}<label class="field">Sede<select name="site_id" required><option value="">Selecciona una sede</option>${siteOptions(sites.filter(site=>Number(site.active)||String(site.id)===String(record.site_id)),record.site_id)}</select></label><label class="field">Estado<select name="active"><option value="1" ${Number(record.active)?'selected':''}>Activo</option><option value="0" ${Number(record.active)?'':'selected'}>Inactivo</option></select></label></div><p class="hint">${person?'El DNI identifica el historial y no se cambia. Eliminar desactiva al trabajador y conserva sus evaluaciones.':'Registra un solo trabajador sin cargar un archivo.'}</p><div class="actions">${person&&Number(person.active)?`<span class="personnel-row-actions">${personAction(person,'remove')}</span>`:''}<button type="button" class="button white" data-cancel-person>Cancelar</button><button type="submit" class="button primary">Guardar trabajador</button></div></form>`);
      const form=document.querySelector('#personnel-form'),validate=attachValidation(form);
      form.querySelector('[data-cancel-person]').addEventListener('click',()=>closeEditor(back));
      bindActions(form,()=>closeEditor(back));
      form.addEventListener('submit',event=>{event.preventDefault();if(!validate())return;const data={...formData(form),...(person?{revision:person.revision}:{})};busy(form.querySelector('[type="submit"]'),async()=>{
        const siteName=sites.find(site=>String(site.id)===data.site_id)?.name||'',active=Number(data.active);
        const effect=active?'Los datos se actualizarán en el directorio, las evaluaciones y el acceso de capacitador vinculado. Un cambio de sede cerrará sus sesiones. Los accesos desactivados se habilitan desde Usuarios.':'El trabajador quedará inactivo y se desactivará su acceso de capacitador vinculado. Se conservarán sus resultados.';
        if(!await confirmAction(`Verifica los datos: ${data.name.trim()}, DNI ${data.dni}, cargo ${data.job_title.trim()}, sede ${siteName}, estado ${active?'Activo':'Inactivo'}. ${effect}`,{title:person?'Verificar cambios del trabajador':'Verificar nuevo trabajador',label:person?'Guardar cambios':'Agregar trabajador',tone:active?'primary':'danger'}))return;
        if(disposed||!form.isConnected||!document.querySelector('#dialog').open)return;
        await command('admin',person?'personnel.update':'personnel.create',data);
        await refresh();if(disposed)return;closeEditor(back);toast(person?'Trabajador actualizado.':'Trabajador agregado.');
      });});
    }
    function bindActions(container,back=null){
      container.addEventListener('click',event=>{
        const editButton=event.target.closest('[data-edit-person]'),removeButton=event.target.closest('[data-remove-person]');
        if(editButton){const person=people.find(item=>item.dni===editButton.dataset.editPerson);if(person)edit(person,'',back);}
        if(removeButton)busy(removeButton,async()=>{
          const person=people.find(item=>item.dni===removeButton.dataset.removePerson);if(!person)return;
          if(!await confirmAction(`Verifica que deseas eliminar a ${person.name}, DNI ${person.dni}, de ${person.site_name||'la sede sin asignar'}. Quedará inactivo, se desactivará su acceso de capacitador y se cerrarán sus sesiones. No podrá iniciar ni enviar evaluaciones pendientes. Su historial de resultados se conservará y podrás reactivarlo al editar.`,{title:'Verificar eliminación',label:'Eliminar trabajador'}))return;
          if(disposed||!container.isConnected)return;
          await command('admin','personnel.delete',{dni:person.dni,revision:person.revision});await refresh();if(disposed)return;if(back)back();toast('Trabajador eliminado del personal activo.');
        });
      });
    }
    function directory(siteId,term=''){
      const site=sites.find(item=>String(item.id)===String(siteId))||{name:'Sin sede asignada'};
      modal(`<div class="personnel-directory"><span class="eyebrow">SEDE ${escape(site.name)}</span><h2>Directorio de trabajadores</h2><p>Consulta, edita o elimina a un trabajador de esta sede.</p><button type="button" class="button primary" id="personnel-site-add">+ Agregar trabajador</button><label class="search personnel-directory-search">Buscar por DNI, nombre o cargo<input id="personnel-site-search" type="search" value="${escape(term)}" autocomplete="off"></label><div id="personnel-site-results">${table()}</div></div>`);
      const dialog=document.querySelector('#dialog');dialog.classList.add('personnel-dialog');dialog.addEventListener('close',()=>dialog.classList.remove('personnel-dialog'),{once:true});
      const localSearch=dialog.querySelector('#personnel-site-search'),container=dialog.querySelector('#personnel-site-results'),back=()=>directory(siteId,localSearch.value);
      const renderDirectory=()=>fillTable(container,people.filter(person=>belongs(person,siteId)&&matches(person,localSearch.value)));
      localSearch.addEventListener('input',renderDirectory);bindActions(container,back);renderDirectory();
      dialog.querySelector('#personnel-site-add').addEventListener('click',()=>edit(null,sites.some(item=>String(item.id)===String(siteId)&&Number(item.active))?siteId:'',back));
    }
    root.querySelector('#personnel-refresh').addEventListener('click',event=>busy(event.currentTarget,refresh));
    search.addEventListener('input',renderSearch);filter.addEventListener('change',renderSearch);bindActions(result);
    root.querySelector('#new-person').addEventListener('click',()=>edit(null,sites.some(site=>String(site.id)===filter.value&&Number(site.active))?filter.value:''));
    root.querySelector('#personnel-site-cards').addEventListener('click',event=>{const button=event.target.closest('[data-site-workers]');if(button)directory(button.dataset.siteWorkers);});
    importForm.addEventListener('change',invalidatePreview);
    importForm.addEventListener('submit',event=>{
      event.preventDefault();if(!validateImport())return;invalidatePreview();
      const version=previewVersion,file=importForm.elements.file.files[0],params={site_id:importForm.elements.site_id.value};
      busy(importForm.querySelector('[type="submit"]'),async()=>{
        let summary;
        try{summary=await upload('admin','personnel.preview',file,params);}catch(error){if(!disposed&&version===previewVersion)importResult.innerHTML=`<div class="ui-alert" data-tone="error" role="alert">${escape(error.message)}</div>`;throw error;}
        if(disposed||version!==previewVersion)return;
        const transfers=summary.transfers.map(person=>`<li>${escape(person.name)} · DNI ${escape(person.dni)}: ${escape(sites.find(site=>String(site.id)===String(person.from_site_id))?.name||'Sin sede asignada')} → ${escape(person.to_site)}</li>`).join('');
        importResult.innerHTML=`<section class="personnel-import-review" aria-labelledby="personnel-review-title"><h3 id="personnel-review-title">Revisa las sedes antes de cargar</h3><p><strong>${summary.total}</strong> trabajadores: ${summary.created} nuevos y ${summary.updated} actualizados.</p><ul>${summary.site_totals.map(site=>`<li><strong>${escape(site.name)}</strong>: ${site.total} trabajadores</li>`).join('')}</ul><p class="hint">${summary.defaulted} filas usarán la sede seleccionada para filas sin sede. Los trabajadores que no aparecen en el archivo conservan sus datos.</p>${summary.reactivated?`<div class="notice">Se reactivarán ${summary.reactivated} trabajadores inactivos.</div>`:''}${summary.transfer_count?`<details open><summary>${summary.transfer_count} cambios de sede · Revisar</summary><ul>${transfers}</ul>${summary.transfer_count>summary.transfers.length?'<p class="hint">Se muestran los primeros 100 cambios. Revisa también el archivo completo.</p>':''}</details>`:''}<details><summary>Ver asignaciones por trabajador (${summary.sample.length} de ${summary.total})</summary><div class="table-scroll personnel-directory-table"><table><thead><tr><th>Trabajador</th><th>Sede de destino</th><th>Acción</th></tr></thead><tbody>${summary.sample.map(person=>`<tr><td>${escape(person.name)}<small>DNI ${escape(person.dni)}</small></td><td>${escape(person.site_name)}${person.uses_default?'<small>Seleccionada para filas sin sede</small>':''}</td><td>${escape(person.action)}</td></tr>`).join('')}</tbody></table></div></details><div class="actions"><button type="button" class="button white" id="personnel-import-cancel">Cancelar carga</button><button type="button" class="button primary" id="personnel-import-confirm">Confirmar carga de ${summary.total} trabajadores</button></div><p data-import-error role="alert" class="error" hidden></p></section>`;
        importResult.querySelector('#personnel-import-cancel').addEventListener('click',invalidatePreview);
        importResult.querySelector('#personnel-import-confirm').addEventListener('click',event=>busy(event.currentTarget,async()=>{
          const destinations=summary.site_totals.map(site=>`${site.name}: ${site.total}`).join('; ');
          if(!await confirmAction(`Verifica la carga de ${summary.total} trabajadores: ${summary.created} nuevos, ${summary.updated} actualizados, ${summary.transfer_count} cambios de sede y ${summary.reactivated} reactivaciones. Sedes: ${destinations}. Se actualizarán también ${summary.linked_accounts||0} accesos de capacitador vinculados y los datos de las evaluaciones. Los accesos desactivados permanecerán desactivados.`,{title:'Verificar carga masiva',label:'Confirmar carga',tone:'primary'}))return;
          if(disposed||version!==previewVersion)return;
          const controls=[...importForm.elements];controls.forEach(control=>control.disabled=true);importResult.querySelector('#personnel-import-cancel').disabled=true;
          try{
            const saved=await upload('admin','personnel.import',file,{...params,preview_token:summary.preview_token});
            await refresh();if(disposed)return;importForm.reset();importResult.innerHTML=`<div class="notice">Carga completada: ${saved.created} nuevos y ${saved.updated} actualizados en ${saved.sites} sedes.</div>`;toast('Base de colaboradores actualizada.');
          }catch(error){const notice=importResult.querySelector('[data-import-error]');if(notice){notice.hidden=false;notice.textContent=error.message;}throw error;}
          finally{controls.forEach(control=>control.disabled=false);const cancel=importResult.querySelector('#personnel-import-cancel');if(cancel)cancel.disabled=false;}
        }));
      });
    });
    render();
    return ()=>{disposed=true;previewVersion++;};
  }};
}
