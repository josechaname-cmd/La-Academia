import {mountPublicHeader} from './components/public-header.js?v=20261030-1';
import {sliderPage} from './pages/admin-slider.js?v=20261030-1';
import {homePopupPage} from './pages/admin-home-popup.js?v=20261030-1';
import {observeUI} from './components/ui.js?v=20261030-1';
import {overviewPage} from './pages/admin-home.js?v=20261030-1';
import {adminLayout} from './components/admin-layout.js?v=20261030-1';
import {session,command,query} from './api.js?v=20261030-1';
import {escape,errorBox,busy} from './components/common.js?v=20261030-1';
import {adminShell,setCourseMenuExpanded,setEventMenuExpanded,setUserMenuExpanded} from './components/admin-shell.js?v=20261030-1';
import {authPage} from './pages/auth.js?v=20261030-1';
import {portalPage} from './pages/portal.js?v=20261030-1';
import {catalogPage} from './pages/catalog.js?v=20261030-1';
import {usersPage,sitesPage,personnelPage} from './pages/admin-access.js?v=20261030-1';
import {coursePage} from './pages/course.js?v=20261030-1';
import {coursesPage,courseEditor} from './pages/admin-courses.js?v=20261030-1';
import {examEditor} from './pages/admin-exam.js?v=20261030-1';
import {reportsPage} from './pages/admin-reports.js?v=20261030-1';
import {notificationCenter} from './components/notification-center.js?v=20261030-1';
import {eventsPage} from './pages/admin-events.js?v=20261030-1';
observeUI(document.body);
mountPublicHeader();
const layout=adminLayout();
const root=document.querySelector('#app'),navigation=document.querySelector('#navigation');
let cleanupNotifications=null,cleanupPage=null,generation=0,navigationKey=null,shellKey=null;
const userKey=user=>user?JSON.stringify(user):'guest';
function clearPage(){cleanupPage?.();cleanupPage=null;}
function resetPrivateView(){
  clearPage();cleanupNotifications?.();cleanupNotifications=null;
  navigation.replaceChildren();navigationKey=null;shellKey=null;
  document.querySelector('#dialog-body')?.replaceChildren();
  root.innerHTML='<div class="loading" role="status">Cargando…</div>';layout.set(false);
}
function updateNavigation(admin,identity,parts,announcements){
  const key=JSON.stringify([admin,userKey(identity.user)]);
  if(navigationKey!==key){
    cleanupNotifications?.();cleanupNotifications=null;
    navigation.innerHTML=admin?(identity.user?'<a href="#inicio">Volver al portal</a><button id="logout" class="link-button">Cerrar sesión</button>':''):'<a href="#inicio">Inicio</a><a href="#capacitaciones">Capacitaciones</a><a href="#eventos">Eventos</a><a class="admin-link" href="#admin">'+(identity.user?'Mi panel':'Iniciar sesión')+'</a>';
    if(identity.user){const notices=notificationCenter(announcements,identity.user.id);navigation.insertAdjacentHTML('beforeend',notices.html);cleanupNotifications=notices.mount(navigation);}
    navigation.querySelector('#logout')?.addEventListener('click',event=>busy(event.target,async()=>{
      await command('admin','logout');++generation;resetPrivateView();history.replaceState(null,'','#inicio');await route();
    }));
    navigationKey=key;
  }
  navigation.querySelectorAll('a').forEach(link=>{
    if(link.hash===(location.hash||'#inicio')||(parts[0]==='curso'&&link.hash==='#capacitaciones')||(parts[0]==='eventos'&&link.hash==='#eventos'))link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  });
}
function commit(page,admin,user,section){
  clearPage();let target=root;
  if(admin&&user){
    const key=userKey(user),workspace=root.querySelector('.workspace');
    if(shellKey===key&&workspace){
      target=document.createElement('section');target.className='workspace';target.innerHTML=page.html;
      workspace.replaceWith(target);
    }else{
      root.innerHTML=adminShell(user,section,page.html);target=root.querySelector('.workspace');
    }
    shellKey=key;
    setCourseMenuExpanded(root,section==='capacitaciones/resultados');
    setEventMenuExpanded(root,section.startsWith('eventos/'));
    setUserMenuExpanded(root,section==='colaboradores');
    root.querySelectorAll('.sidebar nav a').forEach(link=>{
      const active=link.hash===`#admin${section?'/'+section:''}`;
      link.classList.toggle('selected',active);
      if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
    });
    layout.sync();
  }else{shellKey=null;root.innerHTML=page.html;}
  root.setAttribute('aria-busy','false');root.classList.remove('route-pending');
  window.scrollTo({top:0,behavior:'instant'});
  target.tabIndex=-1;target.focus({preventScroll:true});
  cleanupPage=page.mount?.(target)??null;
}
async function pageFor(parts,identity){
  if(parts[0]==='admin'){
    if(!identity.user)return authPage(identity,route);
    const section=parts[1]||'';
    if(section==='capacitaciones'){
      if(parts[2]==='resultados')return reportsPage(parts[3]||'');
      return parts[2]?courseEditor(parts[2],route,parts[3]==='publicar',identity.user):coursesPage(route);
    }
    if(section==='examen'&&/^\d+$/.test(parts[2]||''))return examEditor(parts[2],route);
    if(section==='eventos'&&parts[2]==='slider')return sliderPage(parts[3]||'');
    if(section==='eventos'&&parts[2]==='popup')return homePopupPage(parts[3]||'');
    if(section==='eventos')return eventsPage(route,parts[2]||'');
    if(['usuarios','sedes','colaboradores'].includes(section)){
      if(identity.user.role!=='superadmin')throw new Error('Solo superadministración puede gestionar colaboradores, accesos y sedes.');
      return section==='usuarios'?usersPage(route,identity.user):section==='sedes'?sitesPage(route):personnelPage(route);
    }
    return overviewPage(identity.user);
  }
  if(parts[0]==='curso'&&/^\d+$/.test(parts[1]||''))return coursePage(parts[1]);
  if(parts[0]==='capacitaciones'||parts[0]==='eventos')return catalogPage(parts[0]==='eventos',parts[0]==='eventos'?parts[1]||'':'');
  return portalPage();
}
async function route(){
  if(/^#admin\/slider(?:\/|$)/.test(location.hash))history.replaceState(null,'',location.hash.replace('#admin/slider','#admin/eventos/slider'));
  if(location.hash==='#admin/popup')history.replaceState(null,'','#admin/eventos/popup');
  layout.close();document.querySelectorAll('.ui-confirm').forEach(dialog=>dialog.close());
  if(['#admin/banners','#admin/notificaciones','#admin/avisos'].includes(location.hash)){location.replace('#admin/capacitaciones');return;}
  if(location.hash==='#admin/resultados'){location.replace('#admin/capacitaciones/resultados');return;}
  const current=++generation,parts=location.hash.slice(1).split('/'),admin=parts[0]==='admin';
  const section=parts[1]==='eventos'&&['popup','slider'].includes(parts[2])?'eventos/'+parts[2]:parts[1]==='examen'?'capacitaciones':parts[1]==='capacitaciones'&&parts[2]==='resultados'?'capacitaciones/resultados':parts[1]||'';
  document.querySelector('#event-lightbox')?.close();document.querySelector('#dialog')?.close();
  // Keep the current content and permanent navigation visible while the next view loads.
  root.setAttribute('aria-busy','true');root.classList.add('route-pending');
  let identity;
  try{
    identity=await session();if(current!==generation)return;
    if(admin&&parts[1]&&(!identity.user||((['usuarios','sedes','colaboradores'].includes(parts[1])||(parts[1]==='eventos'&&['popup','slider'].includes(parts[2])))&&identity.user.role!=='superadmin'))){
      history.replaceState(null,'','#admin');return route();
    }
    if(shellKey&&(!admin||shellKey!==userKey(identity.user)))resetPrivateView();
    document.body.classList.toggle('admin-mode',admin);layout.set(admin&&!!identity.user);
    const needsNavigation=navigationKey!==JSON.stringify([admin,userKey(identity.user)]);
    const [page,announcements]=await Promise.all([
      pageFor(parts,identity),
      needsNavigation&&identity.user?query('admin','notifications.list').catch(error=>{
        if(error.status===401||error.status===403)throw error;
        return {items:[],unavailable:true};
      }):Promise.resolve([])
    ]);
    if(current!==generation)return;
    updateNavigation(admin,identity,parts,announcements);
    commit(page,admin,identity.user,section);
    document.title=(root.querySelector('h1')?.textContent.trim()||(admin?'Administración':'Capacitación interna'))+' · La Academia';
  }catch(error){
    if(current!==generation)return;
    if(error.status===403&&admin&&parts[1]){
      try{await session(true);}catch{}
      if(current!==generation)return;
      resetPrivateView();history.replaceState(null,'','#admin');return route();
    }
    if(error.status===401){
      resetPrivateView();identity=null;
      try{await session(true);if(current===generation)return route();}catch(refreshError){error=refreshError;}
    }
    if(current!==generation)return;
    const user=identity?.user;
    if(identity)updateNavigation(admin,identity,parts,[]);
    commit({html:`<div class="container section">${errorBox(error)}<button class="button white" id="retry-page">Reintentar</button></div>`,mount(target){target.querySelector('#retry-page').addEventListener('click',route);}},admin,user,section);
  }
}
document.querySelector('.skip')?.addEventListener('click',event=>{
  event.preventDefault();const content=root.querySelector('.workspace')||root;content.focus({preventScroll:true});content.scrollIntoView({block:'start',behavior:'instant'});
});
document.querySelector('#dialog .close').addEventListener('click',()=>document.querySelector('#dialog').close());
document.querySelector('#dialog').addEventListener('click',event=>{const dialog=event.currentTarget;if(event.target!==dialog)return;const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();});
window.addEventListener('academia-session-expired',()=>{++generation;resetPrivateView();route();});
window.addEventListener('academia-open-activity',event=>{const href=event.detail.href;if(location.hash===href)route();else location.hash=href;});
window.addEventListener('hashchange',route);
route();
