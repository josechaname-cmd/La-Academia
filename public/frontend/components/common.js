import {escape,icon} from './ui.js?v=20261030-8';
export {escape,icon,breadcrumbs,pagination,alert,toast,modal,busy,confirmAction} from './ui.js?v=20261030-8';
export const optionList = (list, selected = '') => list.map(value => `<option value="${escape(value)}" ${value === selected ? 'selected' : ''}>${escape(value)}</option>`).join('');
export function heading(eyebrow, title, subtitle = '', actions = '') { return `<div class="heading"><div><span class="eyebrow">${escape(eyebrow)}</span><h1>${escape(title)}</h1><p>${escape(subtitle)}</p></div><div class="actions">${actions}</div></div>`; }
export const empty = (text, action = '') => `<div class="empty"><span class="empty-mark" aria-hidden="true">${icon('empty')}</span><h2>${escape(text)}</h2>${action}</div>`;
export function errorBox(error) { return `<div class="error" role="alert">${escape(error.message)}</div>`; }
export function formData(form) { return Object.fromEntries(new FormData(form)); }
export const status = state => `<span class="badge ${state === 'published' ? 'green' : ''}">${state === 'published' ? 'Publicado' : 'Borrador'}</span>`;
let fieldSequence=0;
export function field(label, name, value = '', attributes = '') {
  if(/type="password"/.test(attributes)){
    const id=`password-field-${++fieldSequence}`;
    return `<div class="field"><label for="${id}">${escape(label)}</label><div class="password-control"><input id="${id}" name="${escape(name)}" value="${escape(value)}" ${attributes}><button type="button" data-password-toggle aria-controls="${id}" aria-pressed="false" aria-label="Mostrar contraseña" title="Mostrar contraseña">${icon('eye')}</button></div></div>`;
  }
  return `<label class="field">${escape(label)}<input name="${escape(name)}" value="${escape(value)}" ${attributes}></label>`;
}
export function date(value) { return value ? new Intl.DateTimeFormat('es-PE',{dateStyle:'medium'}).format(new Date(value.replace(' ','T'))) : '—'; }

export const categoryBadge=category=>`<span class="course-category-badge">${icon('tag')}${escape(category)}</span>`;
