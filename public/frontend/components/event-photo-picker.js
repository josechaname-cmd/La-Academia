import {upload,fileUrl} from '../api.js?v=20261029-10';
import {escape} from './common.js?v=20261029-10';
export const photoPickerHtml='<section class="full event-photo-picker"><label class="field">Imágenes del evento<input name="images" type="file" accept=".jpg,.jpeg,.png,.webp" multiple><small>Selecciona de 3 a 12 imágenes para publicar. Luego marca cuál será la portada principal. JPG, PNG o WEBP · hasta 8 MB por imagen.</small></label><p class="field-error" data-photo-error role="alert" hidden></p><p class="hint" data-photo-count aria-live="polite"></p><div class="photo-preview-grid"></div></section>';
export function mountPhotoPicker(form,existing=[],selectedCoverId=null){
  const input=form.elements.images,container=form.querySelector('.event-photo-picker'),grid=container.querySelector('.photo-preview-grid'),error=container.querySelector('[data-photo-error]'),counter=container.querySelector('[data-photo-count]');
  let sequence=0,photos=existing.map(photo=>({...photo,key:`stored-${photo.id}`})),coverKey=photos.find(photo=>Number(photo.id)===Number(selectedCoverId))?.key||null,locked=false;
  const fail=message=>{error.hidden=false;error.textContent=message;input.setAttribute('aria-invalid','true');};
  function clear(){error.hidden=true;error.textContent='';input.removeAttribute('aria-invalid');}
  function render(){counter.textContent=`${photos.length} de 12 imágenes${photos.length&&!coverKey?' · Elige la portada principal':''}`;grid.innerHTML=photos.map((photo,index)=>`<article class="${photo.key===coverKey?'is-cover':''}"><img src="${photo.url||fileUrl(photo.id)}" alt="${escape(photo.name)}"><label class="photo-cover-choice"><input type="radio" name="event_cover" value="${photo.key}" ${photo.key===coverKey?'checked':''} ${locked?'disabled':''}><span>${photo.key===coverKey?'Portada principal':'Elegir como portada'}</span></label><small>${escape(photo.name)}</small><div><button type="button" class="link-button" data-photo-remove="${index}" ${locked?'disabled':''}>Quitar</button></div></article>`).join('');}
  input.addEventListener('change',()=>{
    if(locked)return;const files=[...input.files];input.value='';if(!files.length)return;clear();
    if(photos.length+files.length>12){fail('Puedes agregar hasta 12 imágenes por evento.');return;}
    for(const file of files){if(!/\.(jpe?g|png|webp)$/i.test(file.name)||!['image/jpeg','image/png','image/webp'].includes(file.type)){fail(`Formato no válido: ${file.name}. Utiliza JPG, PNG o WEBP.`);return;}if(!file.size||file.size>8*1024*1024){fail(`La imagen ${file.name} debe pesar entre 1 byte y 8 MB.`);return;}}
    for(const file of files){if(photos.some(photo=>photo.file&&photo.file.name===file.name&&photo.file.size===file.size&&photo.file.lastModified===file.lastModified))continue;photos.push({file,name:file.name,url:URL.createObjectURL(file),key:`new-${++sequence}`});}
    render();
  });
  grid.addEventListener('change',event=>{if(locked||event.target.name!=='event_cover')return;coverKey=event.target.value;clear();render();});
  grid.addEventListener('click',event=>{if(locked)return;const remove=event.target.closest('[data-photo-remove]');if(remove){const [photo]=photos.splice(Number(remove.dataset.photoRemove),1);if(photo.key===coverKey)coverKey=null;if(photo.url)URL.revokeObjectURL(photo.url);clear();render();}});
  const dialog=form.closest('dialog');dialog.addEventListener('close',()=>photos.forEach(photo=>{if(photo.url)URL.revokeObjectURL(photo.url);}),{once:true});render();
  return {
    valid(){if(Number(form.elements.active.value)&&photos.length<3){fail('Agrega al menos 3 imágenes para publicar el evento.');input.focus();return false;}if(photos.length&&!coverKey){fail('Selecciona cuál imagen será la portada principal.');grid.querySelector('[name="event_cover"]')?.focus();return false;}clear();return true;},
    async save(){locked=true;input.disabled=true;render();try{for(const photo of photos){if(photo.id)continue;counter.textContent=`Subiendo ${photo.name}…`;try{const saved=await upload('admin','image.upload',photo.file);photo.id=saved.id;}catch(failure){fail(`${photo.name}: ${failure.message}`);throw failure;}}return {imageIds:photos.map(photo=>photo.id),coverImageId:photos.find(photo=>photo.key===coverKey)?.id||null};}finally{locked=false;input.disabled=false;render();}}
  };
}
