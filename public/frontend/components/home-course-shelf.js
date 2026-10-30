import {courseCards} from './course-cards.js?v=20261030-4';
import {mountCourseCovers} from './course-cover.js?v=20261030-4';
import {previousIcon,nextIcon} from './gallery-icons.js?v=20261030-4';
import {screens} from '../design/runtime.js?v=20261030-4';

// Each horizontal page contains at most three rows at every supported breakpoint.
export function homeCourseShelf(courses){
 const mobile=window.matchMedia?.(`(max-width: ${screens.mobile}px)`);
 const tablet=window.matchMedia?.(`(max-width: ${screens.wide}px)`);
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)');
 const capacity=()=>mobile?.matches?3:tablet?.matches?6:9;
 let size=capacity();
 const count=()=>Math.max(1,Math.ceil(courses.length/size));
 const pages=()=>Array.from({length:count()},(_,index)=>`<div class="course-grid home-course-page" role="group" aria-label="Grupo ${index+1} de ${count()}">${courseCards(courses.slice(index*size,(index+1)*size),{imageOnly:true})}</div>`).join('');
 return {
  html:`<div class="home-course-shelf"><div class="home-course-navigation" ${count()>1?'':'hidden'}><p class="hint">Desliza o usa las flechas para ver más.</p><div class="home-course-controls"><span data-shelf-status role="status" aria-live="polite" aria-atomic="true"></span><button type="button" class="button white" data-shelf-prev aria-label="Ver capacitaciones anteriores" aria-controls="home-course-track">${previousIcon}</button><button type="button" class="button white" data-shelf-next aria-label="Ver siguientes capacitaciones" aria-controls="home-course-track">${nextIcon}</button></div></div><div class="home-course-track" id="home-course-track" role="region" aria-label="Capacitaciones disponibles" tabindex="${count()>1?0:-1}">${pages()}</div></div>`,
  mount(root){
   const shelf=root.querySelector('.home-course-shelf'),track=shelf.querySelector('.home-course-track');
   const navigation=shelf.querySelector('.home-course-navigation'),status=shelf.querySelector('[data-shelf-status]');
   const previous=shelf.querySelector('[data-shelf-prev]'),next=shelf.querySelector('[data-shelf-next]');
   let page=0,cleanupCovers=mountCourseCovers(track);
   function update(){
    navigation.hidden=count()===1;track.tabIndex=count()>1?0:-1;
    previous.disabled=page===0;next.disabled=page===count()-1;
    status.textContent=`${courses.length?page*size+1:0}–${Math.min((page+1)*size,courses.length)} de ${courses.length}`;
   }
   function go(index,behavior=reduced?.matches?'instant':'smooth'){
    page=Math.max(0,Math.min(count()-1,index));
    track.scrollTo({left:page*track.clientWidth,behavior});update();
   }
   const back=()=>go(page-1),forward=()=>go(page+1);
   function onScroll(){if(track.clientWidth){page=Math.max(0,Math.min(count()-1,Math.round(track.scrollLeft/track.clientWidth)));update();}}
   function onKey(event){
    if(event.target!==track||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();go(event.key==='Home'?0:event.key==='End'?count()-1:page+(event.key==='ArrowRight'?1:-1));
   }
   function onFocus(event){
    const index=[...track.children].indexOf(event.target.closest('.home-course-page'));
    if(index>=0&&index!==page)go(index,'instant');
   }
   function resize(){
    const nextSize=capacity();if(nextSize===size)return;
    const focused=track.contains(document.activeElement)?document.activeElement.closest('a')?.getAttribute('href'):null;
    const anchor=focused?courses.findIndex(course=>`#curso/${course.id}`===focused):page*size;
    cleanupCovers();size=nextSize;track.innerHTML=pages();cleanupCovers=mountCourseCovers(track);
    go(Math.floor(Math.max(0,anchor)/size),'instant');
    if(focused)[...track.querySelectorAll('a')].find(link=>link.getAttribute('href')===focused)?.focus({preventScroll:true});
   }
   previous.addEventListener('click',back);next.addEventListener('click',forward);
   track.addEventListener('scroll',onScroll,{passive:true});track.addEventListener('keydown',onKey);track.addEventListener('focusin',onFocus);
   mobile?.addEventListener('change',resize);tablet?.addEventListener('change',resize);update();
   return ()=>{
    cleanupCovers();previous.removeEventListener('click',back);next.removeEventListener('click',forward);
    track.removeEventListener('scroll',onScroll);track.removeEventListener('keydown',onKey);track.removeEventListener('focusin',onFocus);
    mobile?.removeEventListener('change',resize);tablet?.removeEventListener('change',resize);
   };
  },
 };
}
