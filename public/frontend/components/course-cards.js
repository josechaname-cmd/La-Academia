import {courseCover} from './course-cover.js?v=20261029-10';
import {viewCountLabel} from './content-views.js?v=20261029-10';
import {escape,empty,date,icon,categoryBadge} from './common.js?v=20261029-10';
const publicationDay=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'});
const publicationDate=new Intl.DateTimeFormat('es-PE',{timeZone:'America/Lima',dateStyle:'long'});
const dayNumber=value=>{
  const parts=Object.fromEntries(publicationDay.formatToParts(value).map(part=>[part.type,part.value]));
  return Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day))/86400000;
};
export function publishedTime(value,now=new Date()){
  if(!value)return '';
  // Database timestamps use Peru time, independently of the visitor's time zone.
  const source=String(value).trim().replace(' ','T');
  const local=/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?)?$/.test(source);
  const timestamp=new Date(local?`${source.includes('T')?source:source+'T00:00:00'}-05:00`:source);
  if(!Number.isFinite(timestamp.getTime()))return '';
  const days=dayNumber(now)-dayNumber(timestamp),fullDate=publicationDate.format(timestamp);
  const label=days===0?'Hoy':days===1?'Hace un día':days>1?`Hace ${days} días`:fullDate;
  return `<time datetime="${timestamp.toISOString()}" title="Publicado el ${escape(fullDate)}">${escape(label)}</time>`;
}
export function courseCards(courses,{imageOnly=false,now=new Date()}={}){
  return courses.length?courses.map(course=>{
    const views=`<span class="course-view-count" role="img" aria-label="${viewCountLabel(course.view_count)}" title="${viewCountLabel(course.view_count)}">${icon('eye')}<span aria-hidden="true">${viewCountLabel(course.view_count,{compact:true})}</span></span>`;
    if(imageOnly)return `<article class="course-card course-card--image"><a class="course-cover course-image-link" href="#curso/${course.id}" aria-labelledby="home-course-title-${course.id}">${courseCover(course)}<div class="course-card-overlay">${categoryBadge(course.category)}<h3 id="home-course-title-${course.id}">${escape(course.title)}</h3><div class="course-card-metadata">${publishedTime(course.published_at??course.created_at,now)}${views}</div></div></a></article>`;
    return `<article class="course-card"><div class="course-cover">${courseCover(course)}${categoryBadge(course.category)}</div><div class="course-body"><h3><a href="#curso/${course.id}">${escape(course.title)}<span class="course-arrow" aria-hidden="true">${icon('next')}</span></a></h3><div class="card-bottom"><small>${date(course.published_at??course.created_at)}</small>${views}</div></div></article>`;
  }).join(''):empty('Todavía no hay capacitaciones publicadas.');
}
