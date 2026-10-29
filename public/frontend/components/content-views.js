import {command} from '../api.js?v=20261029-10';

export function viewCountLabel(value,{compact=false}={}){
  const number=Number(value),count=Number.isFinite(number)?Math.max(0,Math.trunc(number)):0;
  return `${count.toLocaleString('es-PE')}${compact?'':count===1?' vista':' vistas'}`;
}

// Called when opening course material or an event, never for catalog cards.
// Deduplication and administrator exclusion are enforced by the server session.
export function recordContentView(kind,id) {
  return command('view',kind,{id:Number(id)}).catch(()=>null);
}
