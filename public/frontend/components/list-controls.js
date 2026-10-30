import {escape,icon} from './ui.js?v=20261030-1';

export const searchText=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim();

export function paginationControls(label='registros'){
  return `<div class="list-pagination" data-list-pagination><p data-page-count role="status"></p><nav aria-label="Páginas de ${escape(label)}"><button type="button" class="button white" data-page-prev>${icon('previous')} Anterior</button><span data-page-label tabindex="-1"></span><button type="button" class="button white" data-page-next>Siguiente ${icon('next')}</button></nav></div>`;
}

export function mountPagination(host,{size=20,onChange=()=>{}}={}){
  const previous=host.querySelector('[data-page-prev]'),next=host.querySelector('[data-page-next]'),label=host.querySelector('[data-page-label]');
  let page=1,pages=1;
  for(const [button,direction] of [[previous,-1],[next,1]])button.addEventListener('click',()=>{
    page=Math.max(1,Math.min(pages,page+direction));onChange();
    // The last page disables the button just used; retain an identifiable keyboard position.
    if(button.disabled)label.focus({preventScroll:true});
  });
  return {
    reset(){page=1;},
    reveal(index){page=Math.floor(Math.max(0,index)/size)+1;},
    slice(rows){
      pages=Math.max(1,Math.ceil(rows.length/size));page=Math.min(page,pages);
      const start=(page-1)*size,end=Math.min(start+size,rows.length);
      host.querySelector('[data-page-count]').textContent=rows.length?`${start+1}–${end} de ${rows.length}`:'0 resultados';
      label.textContent=`Página ${page} de ${pages}`;previous.disabled=page===1;next.disabled=page===pages;
      host.querySelector('nav').hidden=pages<=1;
      return rows.slice(start,end);
    }
  };
}

export function mountTableSearch(root){
  const input=root.querySelector('[data-table-search]'),rows=[...root.querySelectorAll('tbody tr')],table=root.querySelector('.table-scroll'),empty=root.querySelector('[data-table-empty]');
  const pager=mountPagination(root.querySelector('[data-list-pagination]'),{onChange:render});
  function render(){
    const term=searchText(input.value),matching=rows.filter(row=>searchText(row.textContent).includes(term));
    rows.forEach(row=>row.hidden=true);pager.slice(matching).forEach(row=>row.hidden=false);
    table.hidden=!matching.length;empty.hidden=!!matching.length;
  }
  input.addEventListener('input',()=>{pager.reset();render();});render();
}
