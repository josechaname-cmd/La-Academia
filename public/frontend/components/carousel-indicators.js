import {escape} from './ui.js?v=20261029-10';
import {motion} from '../design/runtime.js?v=20261029-10';

// Time belongs to the indicator; the carousel supplies selection and pause context.
export function carouselIndicators(labels,{interval=motion.carousel}={}) {
  const count=labels.length,duration=Math.max(1000,Number(interval)||motion.carousel);
  return {
    html:`<div class="carousel-dots" role="group" aria-label="Elegir imagen; avance automático cada ${duration/1000} segundos" ${count<2?'hidden':''}>${labels.map((label,index)=>`<button type="button" data-slide="${index}" aria-label="Mostrar ${escape(label||`imagen ${index+1}`)}" aria-current="${index===0?'true':'false'}"><span class="carousel-dot-track" aria-hidden="true"><span class="carousel-dot-progress"></span></span></button>`).join('')}</div>`,
    mount(root,{onSelect}={}) {
      const host=root.querySelector('.carousel-dots'),dots=[...host.querySelectorAll('[data-slide]')];
      let selected=0,timer=null,started=0,remaining=duration,animation=null,paused=true,disposed=false;
      function stop(){if(timer!==null){remaining=Math.max(0,remaining-(performance.now()-started));clearTimeout(timer);timer=null;}animation?.pause();}
      function schedule(){if(disposed||paused||count<2)return;started=performance.now();animation?.play();timer=setTimeout(()=>choose((selected+1)%count,false),remaining);}
      function choose(index,manual){if(onSelect)onSelect(index,manual);else select(index);}
      function select(index){
        if(disposed||!count)return;stop();selected=((index%count)+count)%count;remaining=duration;
        dots.forEach((dot,i)=>dot.setAttribute('aria-current',String(i===selected)));
        animation?.cancel();animation=null;
        if(count>1){animation=dots[selected].querySelector('.carousel-dot-progress').animate?.([{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration,fill:'forwards',easing:'linear'});if(animation){animation.pause();animation.currentTime=0;}}
        schedule();
      }
      function setPaused(value){stop();paused=!!value;schedule();}
      const click=event=>{const button=event.target.closest('[data-slide]');if(button&&host.contains(button))choose(Number(button.dataset.slide),true);};
      host.addEventListener('click',click);select(0);
      return {select,setPaused,focus(index){dots[index]?.focus();},dispose(){disposed=true;stop();animation?.cancel();host.removeEventListener('click',click);}};
    }
  };
}
