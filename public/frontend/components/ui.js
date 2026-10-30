import {motion} from '../design/runtime.js?v=20261030-5';
export const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const paths={
  tag:'M3 3h8l10 10-8 8L3 11Z M7 7h.01',
  refresh:'M20 7v5h-5 M4 17v-5h5 M6 6a8 8 0 0 1 13 2l1 4 M4 12l1 4a8 8 0 0 0 13 2',
  edit:'M15 4 20 9 M4 20l5-1L21 7l-5-5L4 14Z',trash:'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6',image:'M3 3h18v18H3Z M3 17l6-6 4 4 3-3 5 5 M15 7h.01',pause:'M8 5v14 M16 5v14',
  expand:'M9 3H3v6 M15 3h6v6 M21 15v6h-6 M3 15v6h6',download:'M12 3v13 M6 10l6 6 6-6 M4 17v4h16v-4',upload:'M12 16V3 M6 9 12 3 18 9 M4 16v5h16v-5',previous:'M15 6 9 12 15 18',next:'M9 6 15 12 9 18',close:'M6 6 18 18 M18 6 6 18',grip:'M8 5h.01 M16 5h.01 M8 12h.01 M16 12h.01 M8 19h.01 M16 19h.01',
  home:'M3 11 12 3 21 11 M5 10v11h14V10 M9 21v-7h6v7',book:'M3 4h7l2 2 2-2h7v16h-7l-2 1-2-1H3Z M12 6v15',
  users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M18 4a4 4 0 0 1 0 7 M22 21v-2a4 4 0 0 0-3-4',
  building:'M4 21V3h16v18 M9 21v-5h6v5 M8 7h2 M14 7h2 M8 11h2 M14 11h2',
  calendar:'M4 5h16v16H4Z M8 3v4 M16 3v4 M4 10h16',check:'M5 12 10 17 20 6',
  results:'M4 3h16v18H4Z M8 8h8 M8 12h8 M8 16h5',menu:'M4 6h16 M4 12h16 M4 18h16',
  empty:'M4 4h16v16H4Z M8 9h8 M8 13h5',bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z M10 21h4'
};
export function icon(name){return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${paths[name]||paths.empty}"/></svg>`;}
export function breadcrumbs(items){return `<nav class="ui-breadcrumbs" aria-label="Ruta de navegación"><ol>${items.map((item,index)=>`<li>${index?icon('next'):''}${item.href?`<a href="${escape(item.href)}">${escape(item.label)}</a>`:`<span aria-current="page">${escape(item.label)}</span>`}</li>`).join('')}</ol></nav>`;}
export function pagination(){return `<nav class="catalog-pagination" aria-label="Paginación"><button type="button" class="button white" id="catalog-prev">${icon('previous')} Anterior</button><span id="catalog-page" aria-live="polite"></span><button type="button" class="button white" id="catalog-next">Siguiente ${icon('next')}</button></nav>`;}
export function alert(message,tone='info'){const type=['info','success','warning','error'].includes(tone)?tone:'info';return `<div class="ui-alert" data-tone="${type}" role="${type==='error'?'alert':'status'}">${escape(message)}</div>`;}
export function toast(message,tone='success',{title='',prominent=false}={}){
  const target=document.querySelector('#toast');if(!target)return;
  target.dataset.tone=tone;target.setAttribute('role',tone==='error'?'alert':'status');target.setAttribute('aria-live',tone==='error'?'assertive':'polite');
  target.classList.toggle('toast-prominent',prominent);
  if(prominent){target.innerHTML=`<span class="toast-symbol">${icon(tone==='success'?'check':'bell')}</span><div><strong>${escape(title||'Listo')}</strong><p>${escape(message)}</p></div><button class="button white" type="button" aria-label="Cerrar mensaje">${icon('close')}</button>`;target.querySelector('button').onclick=()=>{target.hidden=true;clearTimeout(toast.timer);};}else target.textContent=message;
  target.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>target.hidden=true,prominent?8000:motion.toast);
}
export function modal(html){
  const dialog=document.querySelector('#dialog'),trigger=document.activeElement;
  document.querySelector('#dialog-body').innerHTML=html;
  const title=dialog.querySelector('h2');if(title){title.id='form-dialog-title';dialog.setAttribute('aria-labelledby',title.id);}else dialog.removeAttribute('aria-labelledby');
  dialog.addEventListener('close',()=>{if(trigger?.isConnected)trigger.focus({preventScroll:true});},{once:true});
  dialog.showModal();(dialog.querySelector('input:not([disabled]):not([readonly]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]):not([readonly])')||dialog.querySelector('.close'))?.focus();
}
export async function busy(button,task){
  if(button.disabled)return;
  const nodes=[...button.childNodes],wasBusy=button.getAttribute('aria-busy'),form=button.form||button.closest('form');
  form?.querySelector('[data-action-error]')?.remove();
  const iconOnly=!button.textContent.trim()&&button.querySelector('svg');
  button.disabled=true;button.setAttribute('aria-busy','true');if(iconOnly)button.innerHTML=icon('refresh');else button.textContent='Procesando…';
  try{return await task();}
  catch(error){
    if(form)form.dispatchEvent(new CustomEvent('api-validation',{detail:error.fields||{}}));
    if(form?.closest('dialog[open]')){const feedback=document.createElement('div');feedback.className='ui-alert';feedback.dataset.tone='error';feedback.dataset.actionError='';feedback.setAttribute('role','alert');feedback.textContent=error.message;form.prepend(feedback);}
    else toast(error.message,'error');
  }
  finally{button.disabled=false;button.replaceChildren(...nodes);if(wasBusy===null)button.removeAttribute('aria-busy');else button.setAttribute('aria-busy',wasBusy);}
}
export function confirmAction(message,{label='Confirmar',title='Confirmar acción',tone='danger'}={}){
  const existing=document.querySelector('.ui-confirm');if(existing){existing.querySelector('[data-cancel]')?.focus();return Promise.resolve(false);}
  const trigger=document.activeElement,dialog=document.createElement('dialog');dialog.className='ui-confirm';
  dialog.setAttribute('aria-labelledby','confirm-title');dialog.setAttribute('aria-describedby','confirm-description');
  dialog.innerHTML=`<h2 id="confirm-title">${escape(title)}</h2><p id="confirm-description">${escape(message)}</p><div class="actions"><button type="button" class="button white" data-cancel>Cancelar</button><button type="button" class="button ${tone==='primary'?'primary':'danger'}" data-confirm>${escape(label)}</button></div>`;
  return new Promise(resolve=>{
    let accepted=false;
    dialog.querySelector('[data-cancel]').addEventListener('click',()=>dialog.close());
    dialog.querySelector('[data-confirm]').addEventListener('click',()=>{accepted=true;dialog.close();});
    dialog.addEventListener('close',()=>{dialog.remove();if(trigger?.isConnected)trigger.focus({preventScroll:true});resolve(accepted);},{once:true});
    document.body.append(dialog);dialog.showModal();dialog.querySelector('[data-cancel]').focus();
  });
}
export function enhanceUI(root){
  for(const region of root.querySelectorAll('.table-scroll')){
    region.tabIndex=0;region.setAttribute('role','region');if(!region.hasAttribute('aria-label'))region.setAttribute('aria-label','Tabla de datos; desplázate para ver todas las columnas');
    region.querySelectorAll('thead th').forEach(cell=>cell.setAttribute('scope','col'));
  }
  root.querySelectorAll('.loading').forEach(node=>{node.setAttribute('role','status');node.setAttribute('aria-live','polite');});
}
export function observeUI(root){
  enhanceUI(root);
  const observer=new window.MutationObserver(records=>{
    if(records.some(record=>record.addedNodes.length))enhanceUI(root);
  });
  observer.observe(root,{childList:true,subtree:true});return ()=>observer.disconnect();
}
