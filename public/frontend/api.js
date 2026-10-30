import {createReadCache} from './read-cache.js?v=20261030-4';
const endpoint = new URL('../api/v1/', import.meta.url);
let sessionData=null,sessionPromise=null,sessionFetchedAt=0;
const reads=createReadCache();let activityRevision=null;
export function invalidateNavigationCache(){reads.clear();}
export function observeActivity(feed){
 const revision=String(feed.revision??'0'),changed=activityRevision!==null&&activityRevision!==revision;
 if(changed){reads.clear();if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('academia-activity-updated',{detail:feed.items}));}
 activityRevision=revision;
}
// Short-lived navigation lists; exam data, results, accounts and notifications stay live.
const cacheTimes=new Map([
 ['content:admin.list',30000],['content:categories.list',60000],
 ['admin:events.list',30000]
]);
function acceptSession(data){
 if(JSON.stringify(sessionData?.user)!==JSON.stringify(data?.user)||sessionData?.csrf!==data?.csrf){reads.clear();activityRevision=null;}
 sessionFetchedAt=Date.now();return sessionData=data;
}
const routes={
 'policy:list':['GET','policies'], 'policy:get':['GET','policies/{id}'],
 'policy:admin.list':['GET','admin/policies'], 'policy:admin.get':['GET','admin/policies/{id}'],
 'policy:create':['POST','admin/policies'], 'policy:save':['POST','admin/policies/{id}'], 'policy:delete':['DELETE','admin/policies/{id}'],
 'slider:list':['GET','admin/slider'], 'slider:get':['GET','admin/slider/{id}'], 'slider:create':['POST','admin/slider'], 'slider:save':['POST','admin/slider/{id}'], 'slider:status':['POST','admin/slider/{id}/status'], 'slider:delete':['DELETE','admin/slider/{id}'],
 'popup:public':['GET','home-popup'], 'popup:list':['GET','admin/home-popup'], 'popup:get':['GET','admin/home-popup/{id}'], 'popup:create':['POST','admin/home-popup'], 'popup:save':['POST','admin/home-popup/{id}'], 'popup:status':['POST','admin/home-popup/{id}/status'], 'popup:delete':['DELETE','admin/home-popup/{id}'],
 'view:course':['POST','courses/{id}/view'], 'view:event':['POST','events/{id}/view'],
 'content:slider':['GET','slider'],
 'content:upload.options':['GET','admin/materials/options'],
 'admin:session':['GET','session'], 'admin:login':['POST','session'], 'admin:logout':['DELETE','session'], 'admin:setup':['POST','setup'],
 'admin:notifications.list':['GET','notifications'],
 'admin:personnel.list':['GET','admin/personnel'], 'admin:personnel.import':['POST','admin/personnel/import'],
 'admin:personnel.create':['POST','admin/personnel'], 'admin:personnel.update':['POST','admin/personnel/update'], 'admin:personnel.delete':['POST','admin/personnel/delete'], 'admin:personnel.preview':['POST','admin/personnel/preview'],
 'admin:announcements.public':['GET','announcements'], 'admin:events.public':['GET','events'],
 'content:list':['GET','courses'], 'content:get':['GET','courses/{id}'], 'content:categories.list':['GET','categories'],
 'content:admin.list':['GET','admin/courses'], 'content:admin.get':['GET','admin/courses/{id}'],
 'content:create':['POST','admin/courses'], 'content:save':['PATCH','admin/courses/{id}'], 'content:publish':['POST','admin/courses/{id}/publish'], 'content:delete':['DELETE','admin/courses/{id}'],
 'content:upload':['POST','admin/courses/{course_id}/files'], 'content:file.delete':['DELETE','admin/files/{id}'], 'content:slides':['GET','files/{id}/slides'],
 'admin:image.upload':['POST','admin/images'], 'admin:categories.create':['POST','admin/categories'],
 'content:cover.upload':['POST','admin/courses/{id}/cover-image'],
 'content:purge':['DELETE','admin/courses/{id}/permanent'],
 'content:preview.status':['GET','files/{id}/preview-status'], 'content:preview.retry':['POST','admin/files/{id}/preview'], 'content:cover':['POST','admin/courses/{id}/cover'],
 'exam:status':['POST','admin/courses/{course_id}/exam/status'], 'exam:get':['GET','admin/courses/{course_id}/exam'], 'exam:save':['PUT','admin/courses/{course_id}/exam'], 'exam:participant':['POST','attempts/participant'], 'exam:start':['POST','attempts'], 'exam:submit':['POST','attempts/submit'],
 'report:exams':['GET','admin/reports/exams'], 'report:summary':['GET','admin/reports/summary'], 'report:results':['GET','admin/reports/results'],
};
for(const resource of ['events','users','sites']){
 routes[`admin:${resource}.list`]=['GET',`admin/${resource}`];
 routes[`admin:${resource}.save`]=['POST',`admin/${resource}`];
 routes[`admin:${resource}.delete`]=['DELETE',`admin/${resource}/{id}`];
}
function resolve(agent,action,values={}){
 const mapping=routes[`${agent}:${action}`];if(!mapping)throw new Error('Operación no disponible.');
 let [method,path]=mapping;const remaining={...values};
 if(agent==='admin'&&action.endsWith('.save')&&remaining.id){method='PATCH';path+='/{id}';}
 path=path.replace(/\{([a-z_]+)\}/g,(_,key)=>{const value=remaining[key];if(!/^[1-9][0-9]*$/.test(String(value)))throw new Error('Identificador no válido.');delete remaining[key];return encodeURIComponent(value);});
 return {method,url:new URL(path,endpoint),remaining};
}
export function fileUrl(id,download=false){const url=new URL(`files/${encodeURIComponent(id)}`,endpoint);if(download)url.searchParams.set('download','1');return url.href;}
async function request(agent,action,{data,params={},file,onProgress}={}){
 const {method,url,remaining}=resolve(agent,action,data??params);
 const headers={Accept:'application/json'};let body;
 if(method==='GET'){Object.entries(remaining).forEach(([key,value])=>url.searchParams.set(key,value));}
 else{
  if(!sessionData)await session();headers['X-CSRF-Token']=sessionData.csrf;
  if(file){body=new FormData();body.set('file',file);Object.entries(remaining).forEach(([key,value])=>body.set(key,value));}
  else{headers['Content-Type']='application/json';body=JSON.stringify(remaining);}
 }
 let response;
 try{
  if(file&&onProgress&&typeof XMLHttpRequest!=='undefined')response=await new Promise((resolve,reject)=>{
   const xhr=new XMLHttpRequest();xhr.open(method,url.href);xhr.withCredentials=true;Object.entries(headers).forEach(([key,value])=>xhr.setRequestHeader(key,value));
   xhr.upload.addEventListener('progress',event=>{if(event.lengthComputable)onProgress(Math.min(100,Math.round(event.loaded/event.total*100)));});
   xhr.addEventListener('load',()=>resolve({ok:xhr.status>=200&&xhr.status<300,status:xhr.status,json:async()=>JSON.parse(xhr.responseText)}));
   xhr.addEventListener('error',()=>reject(new Error('network')));xhr.addEventListener('abort',()=>reject(new Error('aborted')));xhr.send(body);
  });
  else response=await fetch(url,{method,headers,body,credentials:'same-origin',cache:'no-store'});
 }catch{throw new Error('No se pudo conectar con La Academia. Revisa tu conexión e inténtalo nuevamente.');}
 let payload;try{payload=await response.json();}catch{const error=new Error(response.status===413?'El archivo supera el límite de carga del servidor.':'El servidor devolvió una respuesta no válida.');error.status=response.status;throw error;}
 if(!response.ok){const error=new Error(payload.error?.message||'No se pudo completar la operación.');error.status=response.status;error.code=payload.error?.code;error.fields=payload.error?.fields||{};error.requestId=payload.meta?.request_id;if(error.code==='csrf_expired'||error.status===401){sessionData=null;reads.clear();}else if(error.status===403)reads.clear();throw error;}
 if(agent==='admin'&&action==='notifications.list')observeActivity(payload.data);
 return payload.data;
}
export async function session(refresh=false){
 if(sessionPromise)return sessionPromise;
 if(sessionData&&!refresh&&Date.now()-sessionFetchedAt<15000)return sessionData;
 sessionPromise=request('admin','session').then(acceptSession).finally(()=>sessionPromise=null);
 return sessionPromise;
}
export function query(agent,action,params={}){
 const key=JSON.stringify([agent,action,Object.entries(params).sort()]);
 return reads.read(key,cacheTimes.get(`${agent}:${action}`)||0,()=>request(agent,action,{params}));
}
export async function command(agent,action,data={}){
 // Refresh CSRF before authenticating. Failed mutations are never automatically replayed.
 if(agent==='admin'&&['login','setup'].includes(action))await session(true);
 // Clear both before and after writes so an older in-flight read cannot refill the cache.
 reads.clear();
 try{
  const result=await request(agent,action,{data});
  if(agent==='admin'&&['login','logout','setup'].includes(action))acceptSession(result);
  if(agent==='admin'&&action==='users.save')sessionFetchedAt=0;
  return result;
 }finally{reads.clear();}
}
export async function upload(agent,action,file,params={},options={}){reads.clear();try{return await request(agent,action,{data:params,file,onProgress:options.onProgress});}finally{reads.clear();}}

export function examResultsUrl(id){return new URL(`admin/reports/exams/${encodeURIComponent(id)}/export`,endpoint).href;}

export function previewUrl(id,version='',pdf=false){const url=new URL(`files/${encodeURIComponent(id)}/${pdf?'preview':'thumbnail'}`,endpoint);if(version)url.searchParams.set('v',version);return url.href;}
