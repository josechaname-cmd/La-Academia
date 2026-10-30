import {escape} from './common.js?v=20261030-4';
import {carouselIndicators} from './carousel-indicators.js?v=20261030-4';
import {isExternalLink,isPublicLink} from './public-link.js?v=20261030-4';

export const slideStyleDefaults=Object.freeze({font_family:'default',title_color:'#ffffff',text_color:'#ffffff',title_size:36,text_size:17,text_align:'left'});
const safeColor=value=>typeof value==='string'&&/^#[a-f0-9]{6}$/i.test(value)?value.toLowerCase():'#ffffff';
const safeSize=(value,min,max,fallback)=>Number.isInteger(Number(value))&&Number(value)>=min&&Number(value)<=max?Number(value):fallback;
export function applySlideStyles(root){
  for(const copy of root.querySelectorAll('.carousel-copy')){
    copy.style.setProperty('--slide-title-color',safeColor(copy.dataset.titleColor));
    copy.style.setProperty('--slide-text-color',safeColor(copy.dataset.textColor));
    copy.style.setProperty('--slide-title-size',`${safeSize(copy.dataset.titleSize,20,72,36)}px`);
    copy.style.setProperty('--slide-text-size',`${safeSize(copy.dataset.textSize,12,36,17)}px`);
  }
}
export function slideMedia(item={},{interactive=false}={}){
  const fit=item.fit==='contain'?'contain':'cover',focal=['top','bottom','left','right'].includes(item.focal)?item.focal:'center';
  const title=String(item.title||'').trim(),subtitle=String(item.subtitle||'').trim(),href=String(item.link_url||''),linked=interactive&&isPublicLink(href),external=isExternalLink(href);
  const font=['arial','georgia','trebuchet'].includes(item.font_family)?item.font_family:'default',align=['center','right'].includes(item.text_align)?item.text_align:'left';
  const content=`<img src="${escape(item.image)}" alt="${escape(item.alt)}">${title||subtitle?`<div class="carousel-copy" data-font="${font}" data-align="${align}" data-title-color="${safeColor(item.title_color)}" data-text-color="${safeColor(item.text_color)}" data-title-size="${safeSize(item.title_size,20,72,36)}" data-text-size="${safeSize(item.text_size,12,36,17)}">${title?`<h2>${escape(title)}</h2>`:''}${subtitle?`<p>${escape(subtitle)}</p>`:''}</div>`:''}`;
  return `<div class="carousel-media" data-fit="${fit}" data-focal="${focal}" data-caption="${!!(title||subtitle)}">${linked?`<a class="carousel-image-link" href="${escape(href)}" aria-label="${escape(title||item.alt||'Abrir contenido')}${external?' (abre en otra pestaña)':''}" ${external?'target="_blank" rel="noopener noreferrer"':''}>${content}</a>`:content}</div>`;
}
export function homeCarousel(slides=[],{interactive=true}={}) {
  if(!slides.length)return {html:'',mount(){}};
  const indicators=carouselIndicators(slides.map(slide=>slide.alt));
  return {
    html:`<section class="hero-carousel" aria-roledescription="carrusel" aria-label="Destacados de La Academia"><div class="carousel-stage">${slides.map((item,index)=>`<article class="carousel-slide ${index===0?'is-active':''}" role="group" aria-roledescription="diapositiva" aria-label="${escape(item.title||item.alt)}" ${index===0?'':'aria-hidden="true" inert'}>${slideMedia(item,{interactive}).replace('<img ',index?'<img loading="lazy" ':'<img fetchpriority="high" ')}</article>`).join('')}</div>${indicators.html}<p class="sr-only carousel-status" aria-live="polite" aria-atomic="true"></p></section>`,
    mount(root) {
      applySlideStyles(root);
      const carousel=root.querySelector('.hero-carousel'),panels=[...carousel.querySelectorAll('.carousel-slide')],listeners=new AbortController();
      const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)');
      let selected=0,focused=false,keyboard=true,start=null,swiped=false;
      const dots=indicators.mount(carousel,{onSelect:show});
      const on=(target,type,handler)=>target?.addEventListener(type,handler,{signal:listeners.signal});
      const syncPause=()=>dots.setPaused(focused||document.hidden||reduced?.matches);
      function prepareNext(){const image=panels[(selected+1)%panels.length]?.querySelector('img');if(image)image.loading='eager';}
      function show(index,manual=false){
        selected=(index+slides.length)%slides.length;
        panels.forEach((panel,i)=>{panel.classList.toggle('is-active',i===selected);panel.inert=i!==selected;panel.setAttribute('aria-hidden',String(i!==selected));});
        if(manual)carousel.querySelector('.carousel-status').textContent=slides[selected].title||slides[selected].alt;
        dots.select(selected);prepareNext();
      }
      on(carousel,'focusin',()=>{focused=keyboard;syncPause();});
      on(carousel,'pointerdown',()=>{keyboard=false;focused=false;syncPause();});
      on(document,'keydown',event=>{if(event.key==='Tab')keyboard=true;});
      on(carousel,'focusout',event=>{if(!carousel.contains(event.relatedTarget)){focused=false;syncPause();}});
      on(carousel,'keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();keyboard=true;focused=true;syncPause();const index=event.key==='Home'?0:event.key==='End'?slides.length-1:selected+(event.key==='ArrowRight'?1:-1);show(index,true);dots.focus(selected);}});
      const stage=carousel.querySelector('.carousel-stage');
      on(stage,'pointerdown',event=>{swiped=false;if(event.pointerType==='touch'&&!event.target.closest('button'))start={x:event.clientX,y:event.clientY};});
      on(stage,'pointerup',event=>{if(!start)return;const dx=event.clientX-start.x,dy=event.clientY-start.y;start=null;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.4){swiped=true;show(selected+(dx<0?1:-1),true);}});
      on(stage,'click',event=>{if(swiped){event.preventDefault();swiped=false;}});
      on(stage,'pointercancel',()=>{start=null;});
      on(window,'pageshow',syncPause);on(document,'visibilitychange',syncPause);on(reduced,'change',syncPause);
      prepareNext();syncPause();
      return ()=>{dots.dispose();listeners.abort();};
    },
  };
}
