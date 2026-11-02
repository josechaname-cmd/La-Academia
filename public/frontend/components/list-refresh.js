// Refresh after a successful mutation. Retrying here only reads, never repeats the write.
export function listRefresh(root,load,apply){
  let disposed=false,revision=0;
  const feedback=document.createElement('div');feedback.className='ui-alert';feedback.dataset.tone='warning';feedback.dataset.listRefresh='';feedback.setAttribute('role','status');feedback.hidden=true;
  const message=document.createElement('p'),retry=document.createElement('button');retry.type='button';retry.className='button white small';retry.textContent='Actualizar lista';feedback.append(message,retry);
  const heading=root.querySelector('.heading');if(heading)heading.after(feedback);else root.prepend(feedback);
  async function refresh(){
    if(disposed)return false;
    const current=++revision;root.setAttribute('aria-busy','true');retry.disabled=true;
    try{
      const data=await load();if(disposed||current!==revision)return false;
      const active=root.contains(document.activeElement)?document.activeElement:null;
      const identity=active?[...active.attributes].filter(attribute=>attribute.name==='id'||attribute.name==='href'||attribute.name.startsWith('data-')):[];
      apply(data);feedback.hidden=true;
      if(active&&!active.isConnected){
        const replacement=identity.length?[...root.querySelectorAll('button,a,input,select')].find(control=>identity.every(attribute=>control.getAttribute(attribute.name)===attribute.value)):null;
        (replacement||root.querySelector('[data-page-label]')||root).focus({preventScroll:true});
      }
      return true;
    }catch(error){
      if(disposed||current!==revision)return false;
      if([401,403].includes(error.status)){window.dispatchEvent(new CustomEvent('academia-session-expired'));return false;}
      message.textContent='El cambio se guardó, pero no se pudo actualizar la lista. Puedes volver a consultarla sin repetir el guardado.';feedback.hidden=false;
      return false;
    }finally{if(!disposed&&current===revision){root.setAttribute('aria-busy','false');retry.disabled=false;}}
  }
  retry.addEventListener('click',refresh);
  return {refresh,get active(){return !disposed;},dispose(){disposed=true;++revision;feedback.remove();}};
}
