// Memory only: private responses never enter localStorage or the browser HTTP cache.
export function createReadCache({now=Date.now,limit=64}={}){
  const entries=new Map(),pending=new Map();let generation=0;
  return {
    clear(){generation++;entries.clear();pending.clear();},
    async read(key,ttl,load){
      const saved=entries.get(key);
      if(saved&&saved.expires>now())return structuredClone(saved.value);
      entries.delete(key);
      let task=pending.get(key);
      if(!task){
        const current=generation;
        task=Promise.resolve().then(load).then(value=>{
          if(ttl>0&&current===generation){
            entries.set(key,{value:structuredClone(value),expires:now()+ttl});
            while(entries.size>limit)entries.delete(entries.keys().next().value);
          }
          return value;
        }).finally(()=>{if(pending.get(key)===task)pending.delete(key);});
        pending.set(key,task);
      }
      return structuredClone(await task);
    }
  };
}
