let sequence=0;
export function attachValidation(form, extra=()=>[]) {
  form.noValidate=true;
  let submitted=false;
  const summary=document.createElement('p');
  summary.className='validation-summary';summary.setAttribute('role','alert');summary.hidden=true;form.prepend(summary);
  function clearErrors(){
    form.querySelectorAll('[data-field-error]').forEach(node=>node.remove());
    form.querySelectorAll('[data-invalid]').forEach(node=>{node.removeAttribute('aria-invalid');node.removeAttribute('data-invalid');const ids=(node.getAttribute('aria-describedby')||'').split(' ').filter(id=>!id.startsWith('field-error-'));if(ids.length)node.setAttribute('aria-describedby',ids.join(' '));else node.removeAttribute('aria-describedby');});
    summary.hidden=true;summary.textContent='';
  }
  function validate(focus=true) {
    submitted=true;clearErrors();
    const issues=[],radioNames=new Set();
    for(const control of form.elements){
      if(!control.willValidate||control.disabled)continue;
      const password=control.type==='password'||!!control.closest('.password-control'),value=password?control.value:control.value.trim(),length=[...value].length;
      let message='';
      if(control.validity.customError)message=control.validationMessage;
      else if(control.type==='radio'){
        if(radioNames.has(control.name))continue;radioNames.add(control.name);
        const group=[...form.elements].filter(item=>item.type==='radio'&&item.name===control.name&&!item.disabled);
        if(group.some(item=>item.required)&&!group.some(item=>item.checked))message='Selecciona una alternativa.';
      }else if(control.validity.badInput)message='Introduce un valor válido.';
      else if(control.type==='checkbox'&&control.required&&!control.checked)message='Marca esta opción para continuar.';
      else if(control.required&&(control.type==='file'?!control.files.length:!value))message=control.type==='file'?'Selecciona un archivo.':control.tagName==='SELECT'?'Selecciona una opción.':'Completa este campo.';
      else if(control.validity.typeMismatch)message=control.type==='email'?'Escribe un correo válido, por ejemplo nombre@dominio.com.':'Escribe una dirección válida.';
      else if(control.validity.patternMismatch)message=control.pattern==='[0-9]{8}'?'Escribe los 8 dígitos del DNI.':control.title||'Revisa el formato de este campo.';
      else if(value&&control.minLength>0&&length<control.minLength)message=`Escribe al menos ${control.minLength} caracteres.`;
      else if(control.maxLength>=0&&length>control.maxLength)message=`Escribe como máximo ${control.maxLength} caracteres.`;
      else if(password&&(value.includes('\0')||new TextEncoder().encode(value).length>72))message='La contraseña debe ocupar como máximo 72 bytes; los acentos y símbolos pueden ocupar varios.';
      else if(!password&&/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(value))message='El texto contiene caracteres no válidos.';
      else if(control.type==='number'&&value&&(!control.step||control.step==='1')&&!/^[+-]?\d+$/.test(value))message='Escribe un número entero, sin decimales ni exponentes.';
      else if(control.validity.rangeUnderflow)message=`El valor mínimo es ${control.min}.`;
      else if(control.validity.rangeOverflow)message=`El valor máximo es ${control.max}.`;
      else if(!control.validity.valid)message='Revisa el valor de este campo.';
      if(control.type==='file'&&control.files.length&&!message){
        const extensions=control.accept.toLowerCase().split(',').map(value=>value.trim()).filter(value=>value.startsWith('.'));
        for(const file of control.files){
          if(!file.size)message=`El archivo «${file.name}» está vacío.`;
          else if(extensions.length&&!extensions.some(ext=>file.name.toLowerCase().endsWith(ext)))message=`Selecciona un archivo ${extensions.join(', ')}.`;
          else if(control.dataset.maxMb&&file.size>Number(control.dataset.maxMb)*1024*1024)message=`Cada archivo debe pesar como máximo ${control.dataset.maxMb} MB.`;
          if(message)break;
        }
      }
      if(message)issues.push({control,message});
    }
    issues.push(...extra());
    const marked=new Set();
    for(const {control,message} of issues){
      if(!control||marked.has(control))continue;marked.add(control);
      const error=document.createElement('span');error.className='field-error';error.dataset.fieldError='';error.id=`field-error-${++sequence}`;error.textContent=message;
      control.setAttribute('aria-invalid','true');control.dataset.invalid='';control.setAttribute('aria-describedby',`${control.getAttribute('aria-describedby')||''} ${error.id}`.trim());
      const target=control.type==='radio'?control.closest('.answer-choices')||control.parentElement:control;
      if(target!==control){target.dataset.invalid='';target.append(error);}else control.after(error);
      const details=control.closest('details');if(details){details.dataset.invalid='';if(focus)details.open=true;}
    }
    summary.hidden=!marked.size;summary.textContent=marked.size?'Revisa los campos resaltados en rojo antes de continuar.':'';
    if(marked.size&&focus){const first=[...marked][0];first.focus();first.scrollIntoView?.({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});}
    return marked.size===0;
  }
  const clear=event=>{event.target.setCustomValidity?.('');if(event.target.type==='radio')for(const control of form.elements)if(control.type==='radio'&&control.name===event.target.name)control.setCustomValidity('');if(submitted)validate(false);};
  form.addEventListener('input',clear);
  form.addEventListener('change',clear);
  for(const button of form.querySelectorAll('[data-password-toggle]'))button.addEventListener('click',()=>{
    const input=form.querySelector(`#${button.getAttribute('aria-controls')}`),visible=input.type==='password';
    input.type=visible?'text':'password';button.setAttribute('aria-pressed',String(visible));button.setAttribute('aria-label',visible?'Ocultar contraseña':'Mostrar contraseña');button.title=visible?'Ocultar contraseña':'Mostrar contraseña';
  });
  form.addEventListener('reset',()=>{
    submitted=false;clearErrors();
    for(const control of form.elements)control.setCustomValidity?.('');
    for(const button of form.querySelectorAll('[data-password-toggle]')){
      form.querySelector(`#${button.getAttribute('aria-controls')}`).type='password';button.setAttribute('aria-pressed','false');button.setAttribute('aria-label','Mostrar contraseña');button.title='Mostrar contraseña';
    }
  });
  validate.setError=(control,message)=>{control.setCustomValidity(message);validate();};
  form.addEventListener('api-validation',event=>{for(const [name,message] of Object.entries(event.detail)){const item=form.elements.namedItem(name),control=item?.setCustomValidity?item:item?.[0];if(control?.setCustomValidity)control.setCustomValidity(message);}validate();});
  return validate;
}
