// Ordre des onglets : Aujourd'hui · Cycle · Intime · Analyse
const NAV_VIEWS = ['today', 'calendar', 'intime', 'nous'];
const viewInits = {};
let currentView = null;
let vtActive = false;   // une View Transition est-elle en cours ?

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

  // ── Sens de la transition de vue (View Transitions API) ──────────────────
  // Onglets : glissement horizontal selon l'index. Réglages : vertical.
  const fromIdx = NAV_VIEWS.indexOf(currentView);
  const toIdx   = NAV_VIEWS.indexOf(name);
  let direction = 'none';
  if (name === 'settings')             direction = 'slide-up';
  else if (currentView === 'settings') direction = 'slide-down';
  else if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx)
    direction = toIdx > fromIdx ? 'slide-left' : 'slide-right';
  // L'écran de connexion est un changement de contexte complet : pas de
  // View Transition (un overlay figé y bloquerait les clics → bouton « mort »).
  if (name === 'auth') direction = 'none';
  document.documentElement.dataset.transitionDirection = direction;

  currentView = name;

  // Échange synchrone du template — capturé par la View Transition.
  const swapDom = () => {
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
  };

  // Init de la vue (asynchrone) + URL — joué après l'échange du DOM.
  const runInit = () => {
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
    // history.replaceState met à jour l'URL sans empiler d'entrée d'historique.
    history.replaceState(null, '', `#${name}${subpath}`);
  };

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  // Re-entrance : si une transition est déjà en cours (ex. double navigate au
  // logout), on échange sans transition pour ne pas laisser d'overlay figé qui
  // intercepterait les clics.
  if (document.startViewTransition && direction !== 'none' && !reduceMotion && !vtActive) {
    vtActive = true;
    const vt = document.startViewTransition(swapDom);
    vt.updateCallbackDone.then(runInit, runInit);
    vt.finished.finally(() => { vtActive = false; });
  } else {
    swapDom();
    runInit();
  }
}

export function initNavButtons() {
  document.getElementById('main-nav').querySelectorAll('button[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.nav));
  });
}
