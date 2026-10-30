import {query,command,upload} from '../api.js?v=20261030-4';
import {heading,escape,toast,breadcrumbs,confirmAction,empty,icon} from '../components/common.js?v=20261030-4';
import {attachValidation} from '../components/form-validation.js?v=20261030-4';
import {homeCarousel,slideMedia,slideStyleDefaults,applySlideStyles} from '../components/home-carousel.js?v=20261030-4';
import {isExternalLink,isPublicLink} from '../components/public-link.js?v=20261030-4';
const fields=['title','subtitle','alt','fit','focal',...Object.keys(slideStyleDefaults)];
const options=values=>values.map(([value,label])=>`<option value="${value}">${label}</option>`).join('');
const payload=item=>Object.fromEntries(['title','subtitle','alt','active','position','fit','focal','link_url',...Object.keys(slideStyleDefaults)].map(key=>[key,item[key]]));
const snapshot=item=>JSON.stringify(payload(item));
const targetKind=url=>url?.startsWith('#curso/')?'course':/^#eventos\//.test(url)?'event':isExternalLink(url||'')?'external':url?'page':'info';
export async function sliderPage(id=''){
  if(id&&id!=='nuevo'&&!/^[1-9][0-9]*$/.test(String(id)))throw new Error('Imagen no disponible.');
  const [saved,courses,events]=await Promise.all([query('slider','list'),query('content','admin.list'),query('admin','events.list')]);
  if(id&&id!=='nuevo'&&!saved.some(item=>String(item.id)===String(id)))throw new Error('Imagen no disponible.');
  const destinations={
    course:courses.filter(item=>item.status==='published').map(item=>({url:`#curso/${item.id}`,title:item.title})),
    event:events.filter(item=>Number(item.active)).map(item=>({url:`#eventos/${item.id}`,title:item.title})),
    page:[{url:'#inicio',title:'Inicio'},{url:'#capacitaciones',title:'Catálogo de capacitaciones'},{url:'#eventos',title:'Eventos'}]
  };
  return {html:`${breadcrumbs([{label:'Eventos',href:'#admin/eventos'},{label:'Slider de Inicio'}])}${heading('PORTAL PÚBLICO','Slider de Inicio','Carga varias imágenes, ordénalas y edita su contenido aquí. Los cambios se aplican al guardar.')}
    <div class="slider-workspace">
      <section class="panel padded slider-library"><h2>1. Imágenes y orden</h2><label class="button primary slider-add">${icon('upload')} Agregar imágenes<input id="slider-files" type="file" multiple accept=".jpg,.jpeg,.png,.webp" aria-label="Agregar varias imágenes al slider"></label><p class="hint">Puedes elegir varios archivos a la vez. JPG, PNG o WEBP · hasta 8 MB por imagen. Recomendado: 1920 × 600 px.</p><p class="hint" id="slider-sort-help">Arrastra desde los seis puntos para subir o bajar una imagen. Con teclado, enfoca los puntos y usa ↑ o ↓.</p><div id="slider-list" class="slider-thumbnails" role="list" aria-label="Imágenes en orden de aparición"></div><p id="slider-sort-status" class="sr-only" role="status"></p></section>
      <section class="panel padded slider-edit"><div id="slider-empty">${empty('Agrega imágenes para preparar el slider.')}</div><form id="slider-form" hidden><div class="heading"><h2>2. Contenido de la imagen</h2><span id="slider-selected-number" class="hint"></span></div><div class="form-grid">
        <label class="field full">Título sobre la imagen <small>Opcional; déjalo vacío si ya está escrito en el diseño.</small><input name="title" maxlength="160" placeholder="Ejemplo: Aprende a prevenir riesgos"></label>
        <label class="field full">Texto de apoyo <small>Opcional; una frase breve.</small><textarea name="subtitle" maxlength="300" rows="2" placeholder="Describe qué encontrarán al entrar"></textarea></label>
        <fieldset class="slider-typography full"><legend>Apariencia del texto</legend><div class="form-grid"><label class="field">Tipo de letra<select name="font_family">${options([['default','Institucional'],['arial','Arial · simple'],['georgia','Georgia · clásica'],['trebuchet','Trebuchet · cercana']])}</select></label><label class="field">Alineación<select name="text_align">${options([['left','Izquierda'],['center','Centro'],['right','Derecha']])}</select></label><label class="field">Tamaño del título (px)<input name="title_size" type="number" min="20" max="72" step="1" required></label><label class="field">Color del título<input name="title_color" type="color" aria-label="Color del título"></label><label class="field">Tamaño del texto (px)<input name="text_size" type="number" min="12" max="36" step="1" required></label><label class="field">Color del texto<input name="text_color" type="color" aria-label="Color del texto de apoyo"></label></div><p class="hint">Se aplica al texto que escribas aquí. El texto integrado en la imagen se cambia reemplazando el archivo. Los tamaños se adaptan a pantallas pequeñas.</p></fieldset>
        <label class="slider-visible full"><input name="active" type="checkbox"> Mostrar esta imagen en Inicio al guardar</label>
        <label class="field full">Al pulsar la imagen<select name="target_kind">${options([['info','No abrir ningún enlace'],['course','Abrir una capacitación'],['event','Abrir un evento'],['page','Abrir una sección'],['external','Abrir un enlace externo']])}</select></label>
        <label class="field full" id="slider-destination">Destino<select name="link_url"></select></label>
        <label class="field full" id="slider-external">Enlace externo<input name="external_url" type="url" maxlength="1000" placeholder="https://ejemplo.com"><small>Se abrirá en otra pestaña.</small></label>
      </div><details class="slider-settings"><summary>Ajustar imagen y accesibilidad</summary><div class="form-grid"><label class="field full">Descripción para lectores de pantalla<input name="alt" maxlength="160" required><small>No aparece sobre la imagen.</small></label><label class="field">Encuadre<select name="fit">${options([['cover','Llenar el espacio'],['contain','Mostrar imagen completa']])}</select></label><label class="field">Zona que debe verse<select name="focal">${options([['center','Centro'],['top','Arriba'],['bottom','Abajo'],['left','Izquierda'],['right','Derecha']])}</select></label><label class="field full">Reemplazar solo esta imagen<input name="image" type="file" accept=".jpg,.jpeg,.png,.webp"></label></div></details>
        <div class="slider-order-actions"><button type="button" class="button white" id="slider-remove">${icon('trash')} Quitar imagen</button></div>
      </form><div class="slider-live-preview"><div class="media-preview-heading"><h2>3. Vista previa</h2><label class="field">Pantalla<select id="slider-device"><option value="desktop">Escritorio</option><option value="mobile">Móvil</option></select></label></div><div class="media-preview-stage slider-preview-stage" data-device="desktop" id="slider-stage"><div id="slider-preview"></div></div><p id="slider-image-size" class="hint" role="status"></p><p id="slider-image-warning" class="notice" hidden></p><button class="button white" type="button" id="slider-preview-all">${icon('eye')} Ver secuencia completa</button></div></section>
    </div><div class="slider-savebar"><p id="slider-save-state" role="status"></p><button class="button primary" type="submit" form="slider-form" id="slider-save">${icon('check')} Guardar cambios</button></div><div id="slider-error" class="error" role="alert" hidden></div>`,mount(root){
    let serial=0,items=saved.map(item=>{const row={title:'',subtitle:'',link_url:'',...slideStyleDefaults,...item,active:Number(item.active),position:Number(item.position),title_size:Number(item.title_size??36),text_size:Number(item.text_size??17),_key:`stored-${item.id}`};row._saved=snapshot(row);return row;}),removed=[],selected=items.find(item=>String(item.id)===String(id))?._key||items[0]?._key||'',saving=false,disposed=false,confirming=false,closePreview=()=>{};
    const form=root.querySelector('#slider-form'),list=root.querySelector('#slider-list'),save=root.querySelector('#slider-save'),error=root.querySelector('#slider-error'),add=root.querySelector('#slider-files');
    const current=()=>items.find(item=>item._key===selected),changed=item=>!!item._file||!!(item._targetKind&&item._targetKind!=='info'&&!item.link_url)||snapshot(item)!==item._saved,dirty=()=>removed.length>0||items.some(changed);
    const source=item=>item?._local||item?.image||'';
    const release=item=>{if(item?._local){URL.revokeObjectURL(item._local);item._local='';}};
    const renumber=()=>items.forEach((item,index)=>item.position=index+1);
    function showError(message){error.textContent=message;error.hidden=!message;}
    function syncDestination(url=''){
      const kind=form.elements.target_kind.value,internal=['course','event','page'].includes(kind),target=form.elements.link_url;
      const links=destinations[kind]||[];
      target.innerHTML='<option value="">Selecciona un destino</option>'+links.map(item=>`<option value="${item.url}">${escape(item.title)}</option>`).join('');
      if(url&&internal&&!links.some(item=>item.url===url))target.insertAdjacentHTML('beforeend',`<option value="${escape(url)}">Destino retirado · elige otro</option>`);
      target.value=url;target.required=internal;target.disabled=!internal||saving;
      root.querySelector('#slider-destination').hidden=!internal;root.querySelector('#slider-external').hidden=kind!=='external';
      form.elements.external_url.required=kind==='external';form.elements.external_url.disabled=kind!=='external'||saving;
    }
    function read(){const item=current();if(!item)return;fields.forEach(key=>item[key]=['title_size','text_size'].includes(key)?Number(form.elements[key].value):form.elements[key].value);item.active=Number(form.elements.active.checked);const kind=form.elements.target_kind.value;item._targetKind=kind;item.link_url=kind==='info'?'':kind==='external'?form.elements.external_url.value.trim():form.elements.link_url.value;}
    function status(){const count=items.filter(changed).length;root.querySelector('#slider-save-state').textContent=saving?'Guardando…':dirty()?`${count} ${count===1?'imagen con cambios':'imágenes con cambios'}${removed.length?` · ${removed.length} por eliminar`:''}`:`${items.length} imágenes · Sin cambios pendientes`;save.disabled=saving||!dirty();root.querySelector('#slider-preview-all').disabled=saving||!items.some(item=>item.active&&source(item));}
    function renderList(){
      list.innerHTML=items.length?items.map((item,index)=>`<div class="slider-thumbnail ${item._key===selected?'selected':''}" data-slide-row="${item._key}" role="listitem"><button type="button" class="slider-select" data-select-slide="${item._key}" aria-pressed="${item._key===selected}" ${saving?'disabled':''}><img src="${escape(source(item))}" alt="" draggable="false"><span><strong>${index+1}. ${escape(item.title||item.alt||'Sin título')}</strong><small>${item.active?'Visible':'Oculta'} · ${!item.id?'Nueva':changed(item)?'Con cambios':'Guardada'}</small></span></button><button type="button" class="slider-drag" data-drag-slide="${item._key}" aria-label="Reordenar imagen ${index+1}: ${escape(item.title||item.alt||'Sin título')}" aria-describedby="slider-sort-help" title="Arrastrar para reordenar" ${saving||items.length<2?'disabled':''}>${icon('grip')}</button></div>`).join(''):'<p class="hint">Todavía no hay imágenes.</p>';
      status();
    }
    function renderPreview(){
      const item=current(),preview=root.querySelector('#slider-preview'),size=root.querySelector('#slider-image-size'),warning=root.querySelector('#slider-image-warning');
      preview.innerHTML=item?slideMedia({...item,image:source(item)}):'';applySlideStyles(preview);size.textContent='';warning.hidden=true;
      if(!item)return;
      form.elements.focal.disabled=saving||item.fit==='contain';
      function advice(){if(disposed||current()!==item)return;const d=item._dimensions;size.textContent=d?`${d.width} × ${d.height} px`:'La imagen se mostrará sin efectos de transición.';const notes=[];if(d){if(d.width<1600||d.height<500)notes.push('La imagen puede perder nitidez al ampliarse.');if(Math.abs(d.width/d.height-16/5)>.08)notes.push(item.fit==='contain'?'Se verá completa, con espacios alrededor.':'Se recortará para llenar el espacio. Puedes cambiar el encuadre.');if(d.width>8000||d.height>8000)notes.push('El máximo es 8000 px por lado.');}warning.textContent=notes.join(' ');warning.hidden=!notes.length;}
      const image=preview.querySelector('img');image.addEventListener('load',()=>{if(disposed||!image.isConnected)return;item._dimensions={width:image.naturalWidth,height:image.naturalHeight};advice();},{once:true});advice();
    }
    function select(key){
      selected=key;const item=current();form.querySelectorAll('input,textarea,select,button').forEach(control=>control.disabled=!item||saving);form.hidden=!item;root.querySelector('#slider-empty').hidden=!!item;root.querySelector('.slider-live-preview').hidden=!item;
      if(item){fields.forEach(key=>form.elements[key].value=item[key]??'');form.elements.active.checked=!!item.active;form.elements.image.value='';form.elements.target_kind.value=item._targetKind||targetKind(item.link_url);form.elements.external_url.value=isExternalLink(item.link_url)?item.link_url:'';syncDestination(item.link_url);root.querySelector('#slider-selected-number').textContent=`${items.indexOf(item)+1} de ${items.length}`;}
      renderList();renderPreview();
    }
    function validFile(file){return /\.(png|jpe?g|webp)$/i.test(file.name)&&['image/png','image/jpeg','image/webp'].includes(file.type)&&file.size>0&&file.size<=8*1024*1024;}
    add.addEventListener('change',()=>{
      if(saving)return;const files=[...add.files];add.value='';if(files.length>20){showError('Selecciona hasta 20 imágenes por carga.');return;}if(files.some(file=>!validFile(file))){showError('Revisa los archivos: usa JPG, PNG o WEBP de hasta 8 MB por imagen.');return;}
      read();showError('');const added=files.map(file=>({...slideStyleDefaults,_key:`new-${++serial}`,title:'',subtitle:'',link_url:'',alt:file.name.replace(/\.[^.]+$/,'').slice(0,160),active:1,fit:'cover',focal:'center',position:0,_file:file,_local:URL.createObjectURL(file),_saved:''}));items.push(...added);renumber();select(added[0]?._key||selected);
    });
    list.addEventListener('click',event=>{const button=event.target.closest('[data-select-slide]');if(button&&!saving){read();select(button.dataset.selectSlide);}});
    form.elements.target_kind.addEventListener('change',()=>{syncDestination();read();renderList();renderPreview();});
    form.addEventListener('input',event=>{if(saving||event.target.type==='file')return;read();renderList();renderPreview();});
    form.addEventListener('change',event=>{if(saving||event.target.type==='file')return;read();renderList();renderPreview();});
    form.elements.image.addEventListener('change',()=>{const item=current(),file=form.elements.image.files[0];if(saving||!item||!file)return;if(!validFile(file)){showError('Usa una imagen JPG, PNG o WEBP de hasta 8 MB.');form.elements.image.value='';return;}release(item);item._file=file;item._local=URL.createObjectURL(file);item._dimensions=null;showError('');renderList();renderPreview();});
    function reorder(key,index){
      const before=items.findIndex(item=>item._key===key);if(saving||before<0||index<0||index>=items.length||before===index)return;
      read();const [item]=items.splice(before,1);items.splice(index,0,item);renumber();select(selected);
      root.querySelector('#slider-sort-status').textContent=`${item.title||item.alt}: posición ${index+1} de ${items.length}. Guarda para publicar este orden.`;
    }
    let drag=null,dragFrame=0;
    const rows=()=>[...list.querySelectorAll('[data-slide-row]')];
    function dragMarker(){
      if(!drag)return;const others=rows().filter(row=>row.dataset.slideRow!==drag.key);
      drag.index=others.filter(row=>{const r=row.getBoundingClientRect();return drag.y>r.top+r.height/2;}).length;
      rows().forEach(row=>row.removeAttribute('data-drop'));
      const target=others[drag.index]||others.at(-1);if(target)target.dataset.drop=drag.index===others.length?'after':'before';
    }
    function scrollDrag(){
      if(!drag?.moved)return;const rect=list.getBoundingClientRect();
      if(drag.y<rect.top+35)list.scrollTop-=10;else if(drag.y>rect.bottom-35)list.scrollTop+=10;
      dragMarker();dragFrame=window.requestAnimationFrame(scrollDrag);
    }
    function finishDrag(commit=false){
      if(!drag)return;const state=drag;drag=null;window.cancelAnimationFrame(dragFrame);dragFrame=0;
      if(list.hasPointerCapture?.(state.pointer))list.releasePointerCapture(state.pointer);
      list.removeAttribute('data-dragging');rows().forEach(row=>{row.removeAttribute('data-drop');row.classList.remove('is-dragging');});
      if(commit&&state.moved)reorder(state.key,state.index);
      if(!disposed)list.querySelector(`[data-drag-slide="${state.key}"]`)?.focus({preventScroll:true});
    }
    list.addEventListener('pointerdown',event=>{
      const handle=event.target.closest('[data-drag-slide]');if(!handle||handle.disabled||saving||items.length<2||event.button>0)return;
      event.preventDefault();read();finishDrag();drag={key:handle.dataset.dragSlide,pointer:event.pointerId,y:event.clientY,startY:event.clientY,index:items.findIndex(item=>item._key===handle.dataset.dragSlide),moved:false};
      list.setPointerCapture?.(event.pointerId);handle.focus({preventScroll:true});
    });
    list.addEventListener('pointermove',event=>{
      if(!drag||drag.pointer!==event.pointerId)return;drag.y=event.clientY;
      if(!drag.moved&&Math.abs(drag.y-drag.startY)>5){drag.moved=true;list.dataset.dragging='true';list.querySelector(`[data-slide-row="${drag.key}"]`)?.classList.add('is-dragging');scrollDrag();}
      if(drag.moved){event.preventDefault();dragMarker();}
    });
    list.addEventListener('pointerup',event=>{if(drag?.pointer===event.pointerId)finishDrag(true);});
    list.addEventListener('pointercancel',()=>finishDrag());list.addEventListener('lostpointercapture',()=>finishDrag());
    list.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&drag){event.preventDefault();finishDrag();return;}
      const handle=event.target.closest('[data-drag-slide]');if(!handle||saving||!['ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
      event.preventDefault();const key=handle.dataset.dragSlide,index=items.findIndex(item=>item._key===key),next=event.key==='Home'?0:event.key==='End'?items.length-1:index+(event.key==='ArrowDown'?1:-1);reorder(key,next);list.querySelector(`[data-drag-slide="${key}"]`)?.focus({preventScroll:true});
    });
    root.querySelector('#slider-remove').addEventListener('click',()=>{if(saving)return;const item=current(),index=items.indexOf(item);if(!item)return;if(item.id)removed.push(item.id);release(item);items.splice(index,1);renumber();select(items[Math.min(index,items.length-1)]?._key||'');});
    root.querySelector('#slider-device').addEventListener('change',event=>root.querySelector('#slider-stage').dataset.device=event.target.value);
    root.querySelector('#slider-preview-all').addEventListener('click',()=>{read();closePreview();closePreview=previewSlider(items.filter(item=>item.active).map(item=>({...item,image:source(item)})));});
    const validate=attachValidation(form);
    function validateAll(){
      for(const item of items){
        const sizes=Number.isInteger(item.title_size)&&item.title_size>=20&&item.title_size<=72&&Number.isInteger(item.text_size)&&item.text_size>=12&&item.text_size<=36;
        if(!sizes){select(item._key);showError('Usa un tamaño de 20 a 72 px para el título y de 12 a 36 px para el texto.');return false;}
      }
      for(const item of items){let message='';if(!item.alt.trim())message='Escribe una descripción para lectores de pantalla.';else if(item.title.length>160||item.subtitle.length>300)message='Acorta el título o el texto de apoyo.';else if(item._dimensions&&(item._dimensions.width>8000||item._dimensions.height>8000))message='La imagen supera 8000 px por lado.';else if(item._targetKind&&item._targetKind!=='info'&&!item.link_url)message='Selecciona el destino de esta imagen o elige no abrir ningún enlace.';else if(item.link_url&&!isPublicLink(item.link_url))message='Escribe un enlace HTTP/HTTPS válido, sin credenciales.';else if(['course','event','page'].includes(targetKind(item.link_url))&&!(destinations[targetKind(item.link_url)]||[]).some(link=>link.url===item.link_url))message='El destino ya no está publicado. Selecciona otro.';if(message){select(item._key);showError(message);return false;}}
      return true;
    }
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(saving||confirming)return;read();if(!dirty()||(current()&&!validate())||!validateAll())return;
      confirming=true;const accepted=await confirmAction(`Se guardarán ${items.filter(changed).length} imágenes con cambios${removed.length?` y se eliminarán ${removed.length}`:''}. Quedarán ${items.filter(item=>item.active).length} visibles en Inicio.`,{title:'Guardar slider',label:'Guardar cambios'});confirming=false;if(!accepted||disposed)return;
      saving=true;showError('');closePreview();root.querySelectorAll('input,textarea,select,button').forEach(control=>control.disabled=true);status();
      let completed=0;
      try{
        const pending=items.filter(changed);
        for(const item of pending){
          root.querySelector('#slider-save-state').textContent=`Guardando imagen ${++completed} de ${pending.length}…`;
          const data={...payload(item),...(item.id?{id:item.id}:{})},action=item.id?'save':'create';
          const saved=item._file?await upload('slider',action,item._file,data):await command('slider',action,data);
          release(item);delete item._file;Object.assign(item,saved,{active:Number(saved.active),position:Number(saved.position),title_size:Number(saved.title_size??item.title_size),text_size:Number(saved.text_size??item.text_size)});item._saved=snapshot(item);
        }
        for(const id of [...removed]){await command('slider','delete',{id});removed=removed.filter(value=>value!==id);}
        if(!disposed)toast('Slider actualizado.');
      }catch(failure){if(!disposed)showError(`${failure.message} Los cambios ya guardados se conservan. Puedes reintentar los pendientes.`);}
      finally{saving=false;if(!disposed){root.querySelectorAll('input,textarea,select,button').forEach(control=>control.disabled=false);select(selected);}}
    });
    const beforeLeave=event=>{if(dirty()||saving){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',beforeLeave);
    select(selected);if(id==='nuevo')add.focus();
    return()=>{disposed=true;finishDrag();closePreview();window.removeEventListener('beforeunload',beforeLeave);items.forEach(release);};
  }};
}
function previewSlider(items){
  const trigger=document.activeElement,dialog=document.createElement('dialog'),carousel=homeCarousel(items,{interactive:false});dialog.className='media-preview-dialog';dialog.setAttribute('aria-label','Vista previa del slider');dialog.innerHTML=`<div class="media-preview-heading"><h2>Así se verá en Inicio</h2><button type="button" class="button white media-icon-action" aria-label="Cerrar vista previa">${icon('close')}</button></div>${carousel.html}<p class="hint">Vista previa. Los enlaces no se abren aquí.</p>`;document.body.append(dialog);dialog.showModal();const unmount=carousel.mount(dialog);let disposed=false;
  const close=()=>{if(disposed)return;disposed=true;unmount?.();dialog.remove();if(trigger?.isConnected)trigger.focus({preventScroll:true});};dialog.addEventListener('close',close,{once:true});dialog.querySelector('button').addEventListener('click',()=>dialog.close());return close;
}
