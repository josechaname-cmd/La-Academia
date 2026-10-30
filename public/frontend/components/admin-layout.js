import {screens} from '../design/runtime.js?v=20261030-8';
import {setCourseMenuExpanded,setEventMenuExpanded,setUserMenuExpanded} from './admin-shell.js?v=20261030-8';
export function adminLayout(){
  const toggle=document.querySelector('#admin-menu-toggle'),mobile=matchMedia(`(max-width: ${screens.mobile}px)`);
  const preference='la-academia.admin-sidebar-collapsed';
  let enabled=false,opened=false,collapsed=false;
  try{collapsed=localStorage.getItem(preference)==='true';}catch{}
  const sidebar=()=>document.querySelector('#admin-sidebar');
  function blockContent(blocked){
    for(const element of document.querySelectorAll('.header,.workspace,.support-footer'))element.inert=blocked;
  }
  function close(returnFocus=false){
    const wasOpen=opened;opened=false;document.body.classList.remove('admin-drawer-open');
    toggle.setAttribute('aria-expanded','false');blockContent(false);
    sidebar()?.removeAttribute('role');sidebar()?.removeAttribute('aria-modal');
    if(wasOpen&&returnFocus&&!toggle.hidden)toggle.focus();
  }
  function open(){
    if(!enabled||!mobile.matches||!sidebar())return;
    opened=true;document.body.classList.add('admin-drawer-open');toggle.setAttribute('aria-expanded','true');
    sidebar().setAttribute('role','dialog');sidebar().setAttribute('aria-modal','true');blockContent(true);
    sidebar().querySelector('.sidebar-close').focus();
  }
  function syncCollapsed(){
    document.body.classList.toggle('admin-sidebar-collapsed',enabled&&collapsed);
    const control=document.querySelector('[data-sidebar-collapse]');
    if(!control)return;
    const label=collapsed?'Expandir menú lateral':'Contraer menú lateral';
    control.setAttribute('aria-expanded',String(!collapsed));control.setAttribute('aria-label',label);control.title=label;
  }
  function toggleCollapsed(){
    if(!enabled||mobile.matches)return;
    collapsed=!collapsed;syncCollapsed();
    try{localStorage.setItem(preference,String(collapsed));}catch{}
  }
  toggle.addEventListener('click',()=>opened?close(true):open());
  document.addEventListener('click',event=>{if(event.target.closest('[data-sidebar-collapse]'))toggleCollapsed();const courseToggle=event.target.closest('[data-course-menu]');if(courseToggle)setCourseMenuExpanded(document,courseToggle.getAttribute('aria-expanded')!=='true');const eventToggle=event.target.closest('[data-event-menu]');if(eventToggle)setEventMenuExpanded(document,eventToggle.getAttribute('aria-expanded')!=='true');const userToggle=event.target.closest('[data-user-menu]');if(userToggle)setUserMenuExpanded(document,userToggle.getAttribute('aria-expanded')!=='true');if(event.target.closest('.sidebar-close,.admin-backdrop'))close(true);});
  document.addEventListener('keydown',event=>{
    if(!opened)return;
    if(event.key==='Escape'){event.preventDefault();close(true);}
    if(event.key==='Tab'){
      const items=[...sidebar().querySelectorAll('a[href],button:not([disabled])')].filter(item=>item.getClientRects().length);
      const first=items[0],last=items.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  mobile.addEventListener('change',()=>{close();toggle.hidden=!enabled||!mobile.matches;syncCollapsed();});
  return {close,sync:syncCollapsed,set(value){enabled=value;close();document.body.classList.toggle('admin-panel',enabled);document.querySelector('.support-footer').hidden=enabled;toggle.hidden=!enabled||!mobile.matches;syncCollapsed();}};
}
