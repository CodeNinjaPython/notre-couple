// Ordre des onglets : Aujourd'hui · Cycle · Intime · Analyse
const NAV_VIEWS = ['today', 'calendar', 'intime', 'nous'];
const viewInits = {};
let currentView = null;

export function registerView(name, initFn) {
  viewInits[name] = initFn;
}

// Vrai si une vue a été enregistrée pour ce nom (viewInits est privé au module).
export function isRegisteredView(name) {
  return Object.prototype.hasOwnProperty.call(viewInits, name);
}

export function navigate(name, params = {}) {
  const tpl = document.getElementById(`tpl-${name}`);
  const container = document.getElementById('view');
  const nav = document.getElementById('main-nav');

  if (!tpl || !container) return;

  // Nettoyer les subscriptions realtime quand on quitte Today ou Analyse
  if ((currentView === 'today' || currentView === 'nous') && name !== currentView) {
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
    nav.querySelectorAll('button').forEach(btn => {
      const active = btn.dataset.nav === name;
      btn.classList.toggle('on', active);
      // A11Y : signaler l'onglet courant aux technologies d'assistance
      if (active) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
  } else {
    nav.classList.remove('visible');
  }

  // Filet de sécurité : une init de vue qui jette (Supabase down, réseau coupé)
  // ne doit pas laisser un écran à moitié rendu sans explication.
  if (viewInits[name]) {
    Promise.resolve(viewInits[name](params)).catch(err => {
      console.error(`[router] échec de l'init de la vue "${name}"`, err);
      import('./ui-feedback.js').then(m => {
        m.toast(m.friendlyError(err), 'error');
        container.innerHTML = `
          <div class="app">
            <div class="error-card" style="margin: 40px auto; max-width: 400px;">
              <p>Impossible de charger la page :<br>${m.friendlyError(err)}</p>
              <button type="button" class="btn-primary" onclick="window.location.reload()" style="margin-top: 10px;">Réessayer</button>
            </div>
          </div>
        `;
      });
    });
  }

  const subpath = params.section ? `/${params.section}` : '';
  const newHash = `#${name}${subpath}`;
  // history.replaceState met à jour l'URL sans ajouter d'entrée à l'historique du navigateur,
  // ce qui est idéal pour la navigation entre onglets.
  history.replaceState(null, '', newHash);
}

export function initNavButtons() {
  document.getElementById('main-nav').querySelectorAll('button[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.nav));
  });
}
