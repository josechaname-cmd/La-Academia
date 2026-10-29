// Read activity IDs remain dismissed even when their destination or text changes.
export function activityReadState(userId,storage){
  const key=`academia:activity-reads:${userId}`;let read=new Set();
  function restore(value){
    try{const saved=JSON.parse(value||'[]');if(Array.isArray(saved))read=new Set(saved.map(entry=>String(Array.isArray(entry)?entry[0]:entry)).filter(id=>/^[1-9][0-9]*$/.test(id)));}catch{}
  }
  try{storage??=globalThis.localStorage;restore(storage?.getItem(key));}catch{}
  return {key,restore,pending:items=>items.filter(item=>!read.has(String(item.id))),mark(item){
    read.add(String(item.id));
    try{storage?.setItem(key,JSON.stringify([...read]));return !!storage;}catch{return false;}
  }};
}
