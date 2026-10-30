import {showHomePopup} from '../components/home-popup.js?v=20261030-5';
import {nextIcon} from '../components/gallery-icons.js?v=20261030-5';
import {query} from '../api.js?v=20261030-5';
import {homeCarousel} from '../components/home-carousel.js?v=20261030-5';
import {homeCourseShelf} from '../components/home-course-shelf.js?v=20261030-5';
export async function portalPage() {
  const [courses,slides]=await Promise.all([query('content','list'),query('content','slider')]);
  const carousel=homeCarousel(slides),shelf=homeCourseShelf(courses);
  return {
    html:`<h1 class="sr-only">La Academia · Capacitación interna</h1>${carousel.html}<div class="home-learning-backdrop"><div class="home-learning-texture" aria-hidden="true" hidden></div><section class="container section home-learning" aria-labelledby="home-learning-title"><div class="heading"><div class="home-learning-intro"><h2 id="home-learning-title">Tu próximo aprendizaje</h2><p>Selecciona una imagen para acceder al material a tu ritmo.</p></div><a class="button primary catalog-link" href="#capacitaciones"><span>Ver catálogo</span>${nextIcon}</a></div>${shelf.html}</section></div>`,
    mount(root) {
      const texture=root.querySelector('.home-learning-texture');
      const images=[...root.querySelectorAll('.hero-carousel .carousel-media img[src]')];
      texture.replaceChildren(...images.map(image=>{
        const tile=document.createElement('div'),copy=image.cloneNode(false);
        copy.alt='';copy.loading='lazy';copy.decoding='async';copy.removeAttribute('fetchpriority');
        copy.addEventListener('error',()=>copy.remove(),{once:true});
        tile.append(copy);return tile;
      }));
      texture.dataset.count=String(images.length);
      texture.hidden=!images.length;
      const cleanupShelf = shelf.mount(root);
      const slider = carousel.mount(root);
      let disposed=false,closePopup=()=>{};
      query('popup','public').then(item=>{if(!disposed)closePopup=showHomePopup(item);}).catch(()=>{});
      return () => {
        disposed=true;closePopup();
        cleanupShelf();
        slider?.();
      };
    },
  };
}
