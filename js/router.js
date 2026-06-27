// Ordre des onglets : Aujourd'hui · Cycle · Intime · Analyse
const NAV_VIEWS = ['today', 'calendar', 'intime', 'nous'];
const viewInits = {};
let currentView = null;

export function registerView(name, initFn) {
  viewInits[name] = initFn;
}

export function navigate(name, params = {}) {
  const tpl = document.getElementById(`tpl-${name}`);
  const container = document.getElementById('view');
  const nav = document.getElementById('main-nav');

  if (!tpl || !container) return;

  // Nettoyer les subscriptions realtime quand on quitte Today
  if (currentView === 'today' && name !== 'today') {
    import('./realtime.js').then(m => m.unsubscribeAll());
  }
  // Enlever le dark mode intime quand on quitte la vue intime
  if (currentView === 'intime' && name !== 'intime') {
    import('./intimacy.js').then(m => m.cleanupIntimacy?.());
  }
  currentView = name;

  container.innerHTML = '';
  container.appendChild(tpl.content.cloneNode(true));

  if (NAV_VIEWS.includes(name)) {
    nav.classList.add('visible');
    nav.querySelectorAll('button').forEach(btn =>
      btn.classList.toggle('on', btn.dataset.nav === name)
    );
  } else {
    nav.classList.remove('visible');
  }

  // Filet de sécurité : une init de vue qui jette (Supabase down, réseau coupé)
  // ne doit pas laisser un écran à moitié rendu sans explication.
  if (viewInits[name]) {
    Promise.resolve(viewInits[name](params)).catch(err => {
      console.error(`[router] échec de l'init de la vue "${name}"`, err);
      import('./ui-feedback.js').then(m => m.toast(m.friendlyError(err), 'error'));
    });
  }

  window.location.hash = name;
}

export function initNavButtons() {
  document.getElementById('main-nav').querySelectorAll('button[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.nav));
  });
}
