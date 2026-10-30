import {escape} from './common.js?v=20261030-8';
export const isVideo=file=>['mp4','webm'].includes(String(file.extension||file.name?.split('.').at(-1)||'').toLowerCase());
export const materialDuration=value=>{const seconds=Math.max(0,Math.round(Number(value)||0));return seconds>=3600?`${Math.floor(seconds/3600)}:${String(Math.floor(seconds%3600/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`:`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;};
export function materialUploadFields(limits){
 const docs=Math.floor(limits.document_max_bytes/1024/1024),video=Math.floor(limits.video_max_bytes/1024/1024);
 return `<label class="field full initial-material">Seleccionar documento o video<input name="file" type="file" accept=".pdf,.ppt,.pptx${limits.video_enabled?',.mp4,.webm':''}" required aria-describedby="material-upload-help"></label><p id="material-upload-help" class="hint full">PDF, PPT o PPTX · hasta ${docs} MB.${limits.video_enabled?` Videos MP4 (H.264/AAC) o WebM · hasta ${video} MB. Recomendado: MP4, 1080p.`:' La carga de videos no está habilitada en este servidor.'}</p><div class="material-selection full" data-material-selection hidden></div><div class="material-upload-progress full" data-upload-progress hidden><progress max="100" value="0" aria-label="Progreso de la carga"></progress><span role="status" aria-live="polite"></span></div>`;
}
export function mountMaterialUpload(form,limits){
 const input=form.elements.file,selection=form.querySelector('[data-material-selection]'),progress=form.querySelector('[data-upload-progress]');let blob='',sending=false,disposed=false;
 function release(){selection.querySelector('video')?.pause();if(blob)URL.revokeObjectURL(blob);blob='';selection.replaceChildren();}
 function check(){
  const file=input.files[0];input.setCustomValidity('');if(!file)return false;
  const video=isVideo(file),extension=file.name.split('.').at(-1).toLowerCase(),limit=video?limits.video_max_bytes:limits.document_max_bytes;
  if(!['pdf','ppt','pptx','mp4','webm'].includes(extension))input.setCustomValidity('Selecciona PDF, PPT, PPTX, MP4 o WebM.');
  else if(video&&!limits.video_enabled)input.setCustomValidity('La carga de videos no está habilitada en este servidor.');
  else if(file.size<=0||file.size>limit)input.setCustomValidity(`El archivo debe pesar entre 1 byte y ${Math.floor(limit/1024/1024)} MB.`);
  return input.validationMessage==='';
 }
 input.addEventListener('change',()=>{release();selection.hidden=true;if(!check())return;const file=input.files[0];selection.hidden=false;selection.innerHTML=`<p><strong>${escape(file.name)}</strong> · ${(file.size/1024/1024).toFixed(1)} MB</p>`;if(isVideo(file)){blob=URL.createObjectURL(file);selection.insertAdjacentHTML('beforeend',`<video controls playsinline preload="metadata" src="${escape(blob)}" aria-label="Vista previa local del video"></video><small>Vista previa antes de guardar. No registra vistas.</small>`);}});
 const beforeLeave=event=>{if(sending){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',beforeLeave);
 return {
  check,
  start(){sending=true;input.disabled=true;selection.querySelector('video')?.pause();progress.hidden=false;progress.querySelector('progress').value=0;progress.querySelector('span').textContent='Subiendo archivo… Mantén esta pantalla abierta.';},
  progress(value){if(disposed)return;progress.querySelector('progress').value=value;progress.querySelector('span').textContent=value>=100?'Archivo recibido. Validando y guardando…':`Subiendo archivo… ${value} %`;},
  finish(){sending=false;if(!disposed){input.disabled=false;progress.hidden=true;}},
  dispose(){disposed=true;release();window.removeEventListener('beforeunload',beforeLeave);}
 };
}
