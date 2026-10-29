import assert from 'node:assert/strict';
import {createReadCache} from '../public/frontend/read-cache.js';
let time=0,calls=0;
const cache=createReadCache({now:()=>time,limit:2});
const load=async()=>{calls++;return {items:[{title:'Original'}]};};
const [one,two]=await Promise.all([cache.read('list',30,load),cache.read('list',30,load)]);
assert.equal(calls,1,'Concurrent reads share a request');
one.items[0].title='Unsaved edit';
assert.equal(two.items[0].title,'Original','Concurrent consumers have independent values');
assert.equal((await cache.read('list',30,load)).items[0].title,'Original','Edits do not poison cached data');
time=30;await cache.read('list',30,load);assert.equal(calls,2,'TTL expires at the boundary');
await cache.read('live',0,load);await cache.read('live',0,load);assert.equal(calls,4,'Live data is never retained');
let finish;
const old=cache.read('race',30,()=>new Promise(resolve=>finish=resolve));await Promise.resolve();
cache.clear();await cache.read('race',30,async()=>({title:'New'}));finish({title:'Old'});await old;
assert.equal((await cache.read('race',30,load)).title,'New','An old request cannot restore invalidated data');
await assert.rejects(cache.read('failed',30,async()=>{throw Error('offline');}));
assert.equal((await cache.read('failed',30,async()=>42)),42,'Failed reads can retry');
cache.clear();await cache.read('a',30,load);await cache.read('b',30,load);await cache.read('c',30,load);
const before=calls;await cache.read('a',30,load);assert.equal(calls,before+1,'Cache is bounded');

// Exercise the real API module with mocked HTTP; no local database or credentials are used.
const realFetch=globalThis.fetch,realNow=Date.now;
let now=100000,user={id:1,role:'capacitador'},csrf='first',deny=false,revision=0;
const requests=[];
Date.now=()=>now;
globalThis.fetch=async(url,options)=>{
  const path=url.pathname.split('/api/v1/')[1];requests.push({path,method:options.method});
  if(deny&&path==='admin/reports/results')return {ok:false,status:401,json:async()=>({error:{code:'session_expired',message:'Expired'}})};
  let data;
  if(path==='session'){
    if(options.method==='DELETE'){user=null;csrf='guest';}
    if(options.method==='POST'){user={id:2,role:'capacitador'};csrf='second';}
    data={user,csrf};
  }else data=[{revision:++revision}];
  return {ok:true,json:async()=>({data})};
};
try{
  const {session,query,command,upload,observeActivity}=await import('../public/frontend/api.js');
  const count=path=>requests.filter(r=>r.path===path&&r.method==='GET').length;
  await session();await query('content','admin.list');await query('content','admin.list');
  assert.equal(count('admin/courses'),1,'Returning to courses uses the navigation cache');
  now+=30000;await query('content','admin.list');assert.equal(count('admin/courses'),2,'Lists eventually refresh');
  await command('content','save',{id:1,title:'Example'});await query('content','admin.list');
  assert.equal(count('admin/courses'),3,'Saving invalidates navigation lists');
  await upload('admin','image.upload',new Blob(['test']));await query('content','admin.list');
  assert.equal(count('admin/courses'),4,'Uploads invalidate navigation lists');
  await query('report','results');await query('report','results');assert.equal(count('admin/reports/results'),2,'Results always refresh');
  await query('exam','get',{course_id:1});await query('exam','get',{course_id:1});assert.equal(count('admin/courses/1/exam'),2,'Exam editor always refreshes');
  await query('admin','notifications.list');await query('admin','notifications.list');assert.equal(count('notifications'),2,'Notification polling stays live');
  await command('admin','logout');await command('admin','login',{});await query('content','admin.list');
  assert.equal(count('admin/courses'),5,'Cached data cannot cross login sessions');
  user={id:2,role:'superadmin'};await session(true);await query('content','admin.list');
  assert.equal(count('admin/courses'),6,'Role changes invalidate cached lists');
  deny=true;await assert.rejects(query('report','results'));deny=false;await query('content','admin.list');
  assert.equal(count('admin/courses'),7,'Expired authentication clears cached data');
  observeActivity({revision:'one',items:[]});await query('content','admin.list');
  const beforeActivity=count('admin/courses');observeActivity({revision:'two',items:[]});await query('content','admin.list');
  assert.equal(count('admin/courses'),beforeActivity+1,'New activity invalidates navigation data');
  observeActivity({revision:'two',items:[]});await query('content','admin.list');
  assert.equal(count('admin/courses'),beforeActivity+1,'Unchanged activity retains the cache');

}finally{globalThis.fetch=realFetch;Date.now=realNow;}
console.log('OK navigation cache: TTL, deduplication, copy isolation, limits, races, retry, writes, uploads, sessions and live results.');
