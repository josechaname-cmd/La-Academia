import {fileUrl} from '../api.js?v=20261030-8';
import {escape,icon} from './common.js?v=20261030-8';

export function policyDocument(policy,{title='Documento',externalControls=false}={}){
 const controls=`<div class="policy-document-toolbar"><div><span class="badge">PDF</span><h2>${escape(title)}</h2></div><div class="policy-document-tools"><button type="button" class="button white" data-policy-expand aria-pressed="false" aria-label="Ampliar visor" title="Ampliar visor">${icon('expand')}</button><a class="button primary" href="${fileUrl(policy.file_id,true)}" title="Descargar PDF">${icon('download')} <span>Descargar</span></a></div></div>`;
 return {controls,html:`<section class="panel policy-document" aria-label="${escape(title)}">${externalControls?'':controls}<div class="policy-document-stage"><p class="loading" data-policy-loading role="status">Cargando documento…</p><iframe src="${fileUrl(policy.file_id)}#page=1&view=FitH&toolbar=1" title="PDF: ${escape(policy.title)}"></iframe></div><footer class="policy-document-footer"><span>${escape(policy.original_name)}</span><a href="${fileUrl(policy.file_id)}" target="_blank" rel="noopener">Abrir en otra pestaña ${icon('next')}</a></footer></section>`,mount(root){
  const viewer=root.querySelector('.policy-document'),frame=viewer.querySelector('iframe'),loading=viewer.querySelector('[data-policy-loading]'),toolbar=root.querySelector('.policy-document-toolbar'),button=toolbar.querySelector('[data-policy-expand]'),controlsHome=toolbar.parentElement;
  const reader=viewer.closest('.policy-reader'),details=reader?.querySelector('.policy-detail-info');
  const ready=()=>{loading.hidden=true;};
  const failed=()=>{loading.hidden=false;loading.textContent='No se pudo mostrar el documento. Descárgalo o ábrelo en otra pestaña.';};
  const expand=()=>{
   const expanded=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(expanded));
   const label=expanded?'Restaurar vista':'Ampliar visor';button.setAttribute('aria-label',label);button.title=label;
   if(externalControls){if(expanded)viewer.prepend(toolbar);else controlsHome.append(toolbar);}
   reader?.classList.toggle('is-reading',expanded);if(details)details.hidden=expanded;
   viewer.classList.toggle('is-expanded',expanded);
   button.focus({preventScroll:true});
   (expanded?viewer:toolbar).scrollIntoView?.({block:expanded?'start':'nearest',behavior:'instant'});
  };
  button.hidden=!reader;button.addEventListener('click',expand);frame.addEventListener('load',ready);frame.addEventListener('error',failed);
  return ()=>{button.removeEventListener('click',expand);frame.removeEventListener('load',ready);frame.removeEventListener('error',failed);frame.removeAttribute('src');};
 }};
}
