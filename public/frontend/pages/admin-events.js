import {paginationControls,mountPagination,searchText} from '../components/list-controls.js?v=20261030-5';
import {query,command} from '../api.js?v=20261030-5';
import {heading,field,escape,optionList,formData,modal,busy,toast,confirmAction,icon} from '../components/common.js?v=20261030-5';
import {eventCards} from '../components/events.js?v=20261030-5';
import {mountEventGallery,showEventGallery} from '../components/event-gallery.js?v=20261030-5';
import {photoPickerHtml,mountPhotoPicker} from '../components/event-photo-picker.js?v=20261030-5';
import {attachValidation} from '../components/form-validation.js?v=20261030-5';
import {categoryPicker,mountCategoryPicker} from '../components/category-picker.js?v=20261030-5';
export async function eventsPage(reload,selectedId=''){
  const [events,eventCategories]=await Promise.all([query('admin','events.list'),query('content','categories.list',{scope:'event'})]);
  return {html:`${heading('COMUNICACIÓN INTERNA','Eventos de La Academia','Los eventos publicados aparecen en Eventos. Agrega una galería de al menos 3 imágenes.','<button class="button primary" id="new-event">+ Crear evento</button>')}<div class="toolbar"><label class="search"><span class="sr-only">Buscar eventos</span><input id="event-search" type="search" placeholder="Buscar por título o lugar"></label><label>Categoría<select id="event-filter"><option value="">Todos los eventos</option>${optionList(eventCategories)}</select></label></div><div class="event-grid event-feed admin-event-grid" id="admin-events"></div>${paginationControls('eventos')}`,mount(root){
    const cleanupGallery=mountEventGallery(root,events,{admin:true});
    const pager=mountPagination(root.querySelector('[data-list-pagination]'),{size:6,onChange:render});
    function render(){const term=searchText(root.querySelector('#event-search').value),category=root.querySelector('#event-filter').value;const rows=events.filter(item=>(!category||item.category===category)&&searchText(`${item.title} ${item.location}`).includes(term));root.querySelector('#admin-events').innerHTML=eventCards(pager.slice(rows),true);}
    pager.reveal(events.findIndex(item=>String(item.id)===selectedId));render();
    if(/^[1-9][0-9]*$/.test(selectedId)){
      const card=root.querySelector(`#evento-${selectedId}`);
      if(card){card.classList.add('activity-target');card.tabIndex=-1;card.focus();card.scrollIntoView({block:'center'});const item=events.find(item=>String(item.id)===selectedId);if(item)showEventGallery(item,0,{admin:true});}
      else root.insertAdjacentHTML('afterbegin','<p class="notice">El evento de esta notificación ya no está disponible.</p>');
    }
    function edit(item={title:'',description:'',category:'',location:'',starts_at:'',active:0,images:[]}){
      modal(`<span class="eyebrow">EVENTOS La Academia</span><h2>${item.id?'Editar evento':'Crear evento'}</h2><form id="event-form"><div class="form-grid">${field('Nombre del evento','title',item.title,'required minlength="3" maxlength="160"')}${categoryPicker(eventCategories,item.category,'event',{optional:true})}${field('Fecha y hora (Lima)','starts_at',item.starts_at.replace(' ','T').slice(0,16),'type="datetime-local" min="1000-01-01T00:00" max="9999-12-31T23:59" required')}${field('Lugar o modalidad','location',item.location,'required minlength="2" maxlength="160" placeholder="Ej. Sala de capacitación / virtual"')}<label class="field full">Descripción<textarea name="description" required minlength="10" maxlength="2000" rows="4">${escape(item.description)}</textarea></label>${photoPickerHtml}<label class="field">Estado<select name="active"><option value="0" ${!Number(item.active)?'selected':''}>Borrador</option><option value="1" ${Number(item.active)?'selected':''}>Publicado en Eventos</option></select></label></div><button class="button primary" type="submit">Guardar evento ${icon('next')}</button></form>`);
      const form=document.querySelector('#event-form'),validate=attachValidation(form),photos=mountPhotoPicker(form,item.images||[],item.image_id),dialog=document.querySelector('#dialog');
      const categoryReady=mountCategoryPicker(form,name=>{eventCategories.push(name);root.querySelector('#event-filter').add(new Option(name,name));});
      form.addEventListener('submit',event=>{event.preventDefault();if(!categoryReady()||!validate()||!photos.valid())return;busy(form.querySelector('[type="submit"]'),async()=>{const data=formData(form);delete data.images;delete data.event_cover;const {imageIds,coverImageId}=await photos.save();await command('admin','events.save',{...data,image_ids:imageIds,cover_image_id:coverImageId,...(item.id?{id:item.id}:{})});dialog.close();toast('Evento, portada y galería guardados.');await reload();});});
    }
    root.querySelector('#new-event').addEventListener('click',()=>edit());
    root.querySelector('#event-filter').addEventListener('change',()=>{pager.reset();render();});
    root.querySelector('#event-search').addEventListener('input',()=>{pager.reset();render();});
    root.querySelector('#admin-events').addEventListener('click',async event=>{const editButton=event.target.closest('[data-edit-event]'),deleteButton=event.target.closest('[data-delete-event]');if(editButton)edit(events.find(item=>String(item.id)===editButton.dataset.editEvent));if(deleteButton&&await confirmAction('¿Eliminar este evento del portal?',{label:'Eliminar',title:'Eliminar evento'}))busy(deleteButton,async()=>{await command('admin','events.delete',{id:Number(deleteButton.dataset.deleteEvent)});await reload();});});
    return cleanupGallery;
  }};
}
