const panelHome = '#admin';
const panelRoutes = [
  /^#admin$/,
  /^#admin\/(?:usuarios|sedes|colaboradores)$/,
  /^#admin\/examen\/[1-9]\d*$/,
  /^#admin\/politicas(?:\/(?:nueva|[1-9]\d*))?$/,
  /^#admin\/capacitaciones(?:\/(?:nuevo|[1-9]\d*(?:\/publicar)?))?$/,
  /^#admin\/capacitaciones\/resultados(?:\/(?:curso\/)?[1-9]\d*)?$/,
  /^#admin\/eventos(?:\/[1-9]\d*)?$/,
  /^#admin\/eventos\/(?:slider|popup)(?:\/(?:nuevo|[1-9]\d*))?$/,
];
const restricted = /^#admin\/(?:usuarios|sedes|colaboradores|eventos\/(?:slider|popup))(?:\/|$)/;

// Only a route and a non-secret session tag survive a portal reload.
// Filters, including personnel searches, stay in this document's memory.
export function panelNavigation() {
  const key = 'la-academia.panel:' + location.pathname;
  const views = new Map();
  let owner = null, tag = null, role = null, last = panelHome;
  const allowed = hash => typeof hash === 'string' && panelRoutes.some(route => route.test(hash))
    && (role === 'superadmin' || !restricted.test(hash));

  function clear() {
    views.clear();
    owner = tag = role = null;
    last = panelHome;
    try { window.sessionStorage.removeItem(key); } catch {}
  }
  function bind(identity) {
    if (!identity.user) { clear(); return; }
    const user = identity.user;
    const scope = JSON.stringify([user.id, user.role, user.site_id, identity.navigation_id || identity.csrf]);
    if (owner === scope) return;
    views.clear();
    owner = scope;
    role = user.role;
    tag = identity.navigation_id ? scope : null;
    last = panelHome;
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(key));
      if (tag && saved?.tag === tag && allowed(saved.hash)) last = saved.hash;
      else window.sessionStorage.removeItem(key);
    } catch {}
  }
  function remember(hash) {
    if (!owner || !allowed(hash)) return;
    last = hash;
    if (tag) {
      try { window.sessionStorage.setItem(key, JSON.stringify({tag, hash})); } catch {}
    }
  }
  function view(hash) {
    if (!allowed(hash)) return {};
    if (!views.has(hash)) {
      if (views.size >= 32) views.delete(views.keys().next().value);
      views.set(hash, {});
    }
    return views.get(hash);
  }
  return {bind, clear, remember, view, get last() { return last; }};
}
