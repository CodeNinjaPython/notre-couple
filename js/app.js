import { supabase, IS_DEMO } from './supabase.js';
import { signInOrSignUp, onAuthChange } from './auth.js';
import { getMyMembership, createCouple, joinWithCode, renewPairingCode } from './pairing.js';
import { navigate, registerView, initNavButtons, isRegisteredView } from './router.js';
import { initToday } from './today.js';
import { initCalendar } from './calendar.js';
import { initNous, initSettings } from './nous.js';
import { requestPermission, getPermission, declineNotifications } from './notifications.js';
import { onboardingDone, initOnboarding, markOnboardingDone,
         profileComplete, getProfileName, getProfileRole, saveProfile } from './onboarding.js';
import { initIntimacy } from './intimacy.js';
import { initKinks } from './kinks.js';
import { initQuickHide } from './pin-lock.js';
import { initTheme } from './theme.js';
import { APP_VERSION } from './config.js';

// Restaurer le thème (clair/sombre) avant tout rendu
initTheme();

// Gestionnaire d'erreur global — remplace l'écran gris par un message lisible
window.addEventListener('unhandledrejection', e => {
  console.error('[App] Unhandled rejection:', e.reason);
});
window.addEventListener('error', e => {
  console.error('[App] Uncaught error:', e.message);
  const v = document.getElementById('view');
  if (v && !v.innerHTML) {
    v.innerHTML = `<div style="padding:40px 20px;font-family:system-ui;color:#E53935">
      <h2>Erreur de chargement</h2>
      <p style="margin-top:8px;font-size:14px">${e.message}</p>
      <button onclick="location.reload()" style="margin-top:20px;padding:10px 20px;background:#E84375;color:#fff;border:none;border-radius:8px;cursor:pointer">Recharger</button>
    </div>`;
  }
});

// Mode démo : indicateur sur le body
if (IS_DEMO) document.body.classList.add('demo-mode');

// Version runtime (debug de deploiement)
window.__APP_VERSION__ = APP_VERSION;
console.info(`[App] Version ${APP_VERSION}`);

// Service worker (prod seulement — en démo le SW ne sert pas le réseau)
if ('serviceWorker' in navigator && !IS_DEMO) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
  // Auto-rechargement quand une nouvelle version prend le contrôle (évite de rester
  // bloqué sur du code en cache après un déploiement). Reload unique (garde anti-boucle).
  let _reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (_reloading) return;
    _reloading = true;
    window.location.reload();
  });
}

// ── Register view inits ────────────────────────────────────────────────────
registerView('today',      () => initToday());
registerView('calendar',   () => initCalendar());
registerView('nous',       () => initNous());
registerView('settings',   () => initSettings());
registerView('intime',     () => { initIntimacy(); initKinks(); });
// Tests accessibles depuis la console du navigateur en dev
if (window.location.search.includes('run-tests')) {
  import('./intimacy-tests.js').then(m => m.runAllTests());
}
registerView('auth',       () => initAuthView());
registerView('profile',    () => initProfileView());
registerView('pairing',    () => initPairingView());
registerView('onboarding', () => initOnboarding());

// ── Auth view ──────────────────────────────────────────────────────────────
function initAuthView() {
  const emailIn   = document.getElementById('auth-email');
  const passIn    = document.getElementById('auth-password');
  const submit    = document.getElementById('auth-submit');
  const demoHint  = document.getElementById('auth-demo-hint');

  if (IS_DEMO) {
    if (submit)   submit.textContent   = 'Entrer en démo →';
    if (emailIn)  emailIn.placeholder  = 'votre prénom (ou n\'importe quoi)';
    if (passIn)   passIn.closest('.field')?.style && (passIn.closest('.field').style.display = 'none');
    if (demoHint) demoHint.style.display = 'block';
  }

  async function submitAuth() {
    const email = emailIn?.value?.trim();
    const pass  = passIn?.value ?? '';
    if (!email) { showMsg('auth-error', 'Entre ton adresse e-mail.'); return; }

    if (submit) { submit.disabled = true; submit.textContent = 'Connexion…'; }
    try {
      if (IS_DEMO) {
        // Démo : connexion immédiate via le mock local-db (mot de passe ignoré)
        await supabase.auth.signInWithOtp({ email });
        return;
      }
      if (pass.length < 6) { showMsg('auth-error', 'Mot de passe : 6 caractères minimum.'); return; }
      const mode = await signInOrSignUp(email, pass);
      if (mode === 'confirm') {
        showMsg('auth-error', 'Compte créé, mais la confirmation par e-mail est activée. Désactive-la dans Supabase (Authentication → Sign In → Email → Confirm email), puis réessaie.');
      }
      // 'in' / 'up' → onAuthChange route automatiquement
    } catch (e) {
      showMsg('auth-error', e.message || String(e));
    } finally {
      if (submit) { submit.disabled = false; submit.textContent = IS_DEMO ? 'Entrer en démo →' : 'Se connecter / Créer le compte'; }
    }
  }

  submit?.addEventListener('click', submitAuth);
  emailIn?.addEventListener('keydown', e => { if (e.key === 'Enter') (IS_DEMO ? submitAuth() : passIn?.focus()); });
  passIn?.addEventListener('keydown', e => { if (e.key === 'Enter') submitAuth(); });
}

// Échappe une saisie utilisateur avant injection dans innerHTML.
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ── Profile view (première connexion : prénom + rôle ♀/♂) ───────────────────
function initProfileView() {
  const nameIn = document.getElementById('profile-name');
  if (nameIn) nameIn.value = getProfileName();

  const group = document.getElementById('profile-role');
  const current = getProfileRole();
  group?.querySelectorAll('button[data-role]').forEach(btn => {
    const on = btn.dataset.role === current;
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.addEventListener('click', () => {
      group.querySelectorAll('button[data-role]').forEach(b => {
        const sel = b === btn;
        b.classList.toggle('on', sel);
        b.setAttribute('aria-pressed', sel ? 'true' : 'false');
      });
    });
  });

  document.getElementById('btn-profile-continue')?.addEventListener('click', () => {
    const name = nameIn?.value?.trim();
    const roleBtn = group?.querySelector('button.on[data-role]');
    if (!name) { showMsg('profile-error', 'Entre ton prénom pour continuer.'); return; }
    if (!roleBtn) { showMsg('profile-error', 'Indique si tu es Elle ♀ ou Lui ♂.'); return; }
    saveProfile(name, roleBtn.dataset.role);
    routeAfterAuth();  // enchaîne sur le mode de cycle (Elle) puis l'appairage
  });
}

// La date de règles saisie à l'onboarding est mémorisée en localStorage (la
// membership n'existe pas encore à ce moment). Une fois le couple créé/rejoint,
// on crée le 1er cycle pour ELLE si aucun n'existe.
async function persistOnboardingCycle() {
  try {
    const me = await getMyMembership();
    if (!me?.tracks_cycle) return;                 // seulement ELLE a un cycle
    const date = localStorage.getItem('nc-last-period');
    if (!date) return;
    const { getCurrentCycle } = await import('./cycles.js');
    if (await getCurrentCycle()) return;           // déjà un cycle en cours
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('cycles')
      .insert({ user_id: user.id, period_start: date, period_end: null });
    if (!error) localStorage.removeItem('nc-last-period');
  } catch (e) { console.warn('persistOnboardingCycle:', e.message); }
}

// ── Pairing view ───────────────────────────────────────────────────────────
function initPairingView() {
  const choice        = document.getElementById('pairing-choice');
  const createSection = document.getElementById('pairing-create');
  const joinSection   = document.getElementById('pairing-join');
  const codeSection   = document.getElementById('pairing-code-display');

  // Récap du profil (prénom + rôle), avec lien « Modifier » → écran profil.
  function renderRecap(elId) {
    const el = document.getElementById(elId);
    if (!el) return;
    const role = getProfileRole() === 'elle' ? '♀ Elle' : '♂ Lui';
    el.innerHTML = `<span class="pr-name">${escapeHtml(getProfileName())}</span>
      <span class="pr-role">${role}</span>
      <button type="button" class="pr-edit">Modifier</button>`;
    el.querySelector('.pr-edit')?.addEventListener('click', () => navigate('profile'));
  }

  document.getElementById('btn-create')?.addEventListener('click', () => {
    choice.style.display = 'none'; createSection.style.display = 'block'; renderRecap('create-profile-recap');
  });
  document.getElementById('btn-join')?.addEventListener('click', () => {
    choice.style.display = 'none'; joinSection.style.display = 'block'; renderRecap('join-profile-recap');
  });
  document.getElementById('btn-create-back')?.addEventListener('click', () => {
    createSection.style.display = 'none'; choice.style.display = 'block';
  });
  document.getElementById('btn-join-back')?.addEventListener('click', () => {
    joinSection.style.display = 'none'; choice.style.display = 'block';
  });

  document.getElementById('btn-create-submit')?.addEventListener('click', async () => {
    const name        = getProfileName();
    const tracksCycle = getProfileRole() === 'elle';
    if (!profileComplete()) { navigate('profile'); return; }
    const btn = document.getElementById('btn-create-submit');
    btn.disabled = true; btn.textContent = 'Création…';
    try {
      const { code } = await createCouple(name, tracksCycle);
      await persistOnboardingCycle();
      document.getElementById('generated-code').textContent = code;
      showPairingQR(code);
      createSection.style.display = 'none';
      codeSection.style.display = 'block';
    } catch (e) {
      let diag = '';
      try {
        const { data: { session } } = await supabase.auth.getSession();
        diag = ` · [session ${session ? 'oui' : 'NON'} · token ${session?.access_token ? 'oui' : 'NON'} · uid ${session?.user?.id ? session.user.id.slice(0, 8) : 'NULL'}]`;
      } catch (_) {}
      showMsg('create-error', `Échec : ${e.message || e}${diag}`);
    }
    finally { btn.disabled = false; btn.textContent = 'Créer notre espace'; }
  });

  let currentCoupleId = null;
  document.getElementById('btn-renew-code')?.addEventListener('click', async () => {
    if (!currentCoupleId) { const m = await getMyMembership(); currentCoupleId = m?.couple_id; }
    if (!currentCoupleId) return;
    const newCode = await renewPairingCode(currentCoupleId);
    document.getElementById('generated-code').textContent = newCode;
    showPairingQR(newCode);
  });

  document.getElementById('btn-done')?.addEventListener('click', () => navigate('today'));

  // Copier le code (1 tap)
  document.getElementById('btn-copy-code')?.addEventListener('click', async () => {
    const code = document.getElementById('generated-code')?.textContent?.trim();
    if (!code || code === '------') return;
    await navigator.clipboard.writeText(code).catch(() => {});
    const btn = document.getElementById('btn-copy-code');
    if (btn) { btn.textContent = '✓ Copié'; setTimeout(() => { btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copier'; }, 2000); }
  });

  // Partager via Web Share API
  document.getElementById('btn-share-code')?.addEventListener('click', async () => {
    const code = document.getElementById('generated-code')?.textContent?.trim();
    if (!code || code === '------') return;
    const text = `Rejoins moi sur Notre cycle. Ton code d'invitation : ${code}`;
    if (navigator.share) {
      await navigator.share({ title: 'Notre cycle', text }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(text).catch(() => {});
      const btn = document.getElementById('btn-share-code');
      if (btn) { btn.textContent = '✓ Copié'; setTimeout(() => { btn.textContent = 'Partager'; }, 2000); }
    }
  });

  document.getElementById('btn-join-submit')?.addEventListener('click', async () => {
    const code        = document.getElementById('join-code')?.value?.trim();
    const name        = getProfileName();
    const tracksCycle = getProfileRole() === 'elle';
    if (!profileComplete()) { navigate('profile'); return; }
    if (!code) { showMsg('join-error', 'Saisis le code reçu de ton partenaire.'); return; }
    const btn = document.getElementById('btn-join-submit');
    btn.disabled = true; btn.textContent = 'Vérification…';
    try {
      await joinWithCode(code, name, tracksCycle);
      await persistOnboardingCycle();
      navigate('today');
    } catch (e) { showMsg('join-error', e.message); }
    finally { btn.disabled = false; btn.textContent = 'Rejoindre'; }
  });
}

function showPairingQR(code) {
  const img  = document.getElementById('pairing-qr');
  const wrap = document.getElementById('qr-wrap');
  if (!img || !code || code === '------') return;
  // L'appairage ne se fait qu'en ligne (Supabase requis) → API externe acceptable.
  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=144x144&format=svg&bgcolor=FFFFFF&color=1A1830&data=${encodeURIComponent(code)}`;
  img.onerror = () => { if (wrap) wrap.style.display = 'none'; };
  if (wrap) wrap.style.display = 'flex';
}

// ── Routing ────────────────────────────────────────────────────────────────
async function routeAfterAuth() {
  const membership = await getMyMembership();

  if (!membership) {
    // Première connexion : 1) profil dédié (prénom + rôle), 2) mode de cycle
    // (Elle uniquement — sans objet pour Lui), 3) appairage.
    if (!profileComplete()) { navigate('profile'); return; }
    if (!IS_DEMO && !onboardingDone()) {
      if (getProfileRole() === 'elle') { navigate('onboarding'); return; }
      markOnboardingDone(); // Lui : le mode de cycle ne le concerne pas
    }
    navigate('pairing');
    return;
  }

  const hash = window.location.hash.slice(1);
  const [view, section] = hash.split('/');
  // Si un hash est présent et correspond à une vue, on navigue dessus, sinon 'today'
  if (hash && isRegisteredView(view)) navigate(view, { section });
  else navigate('today');

  if (!IS_DEMO) setTimeout(() => maybeShowNotifBanner(), 2000);
  // Abonnement Web Push si la permission est déjà accordée (#12).
  if (!IS_DEMO && getPermission() === 'granted') {
    import('./push.js').then(({ subscribeToPush }) => subscribeToPush(membership.couple_id, membership.user_id));
  }
}

// ── Install prompt ─────────────────────────────────────────────────────────
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  window.__installPrompt = e;
});

// ── Notif banner ───────────────────────────────────────────────────────────
function maybeShowNotifBanner() {
  const perm = getPermission();
  if (perm === 'granted' || perm === 'denied' || perm === 'unsupported') return;
  if (localStorage.getItem('notif-asked') === 'no') return;
  const banner = document.getElementById('notif-banner');
  if (!banner) return;
  banner.style.display = 'flex';
  document.getElementById('btn-notif-yes')?.addEventListener('click', async () => {
    banner.style.display = 'none';
    await requestPermission();
    // S'abonner au Web Push une fois la permission accordée (#12).
    try {
      const m = await getMyMembership();
      if (m) { const { subscribeToPush } = await import('./push.js'); subscribeToPush(m.couple_id, m.user_id); }
    } catch (_) {}
  }, { once: true });
  document.getElementById('btn-notif-no')?.addEventListener('click', () => {
    banner.style.display = 'none'; declineNotifications();
  }, { once: true });
}


// ── Bootstrap ──────────────────────────────────────────────────────────────
initNavButtons();
document.getElementById('view').innerHTML = '<div class="loading">Chargement…</div>';

onAuthChange(async (event, session) => {
  if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
    if (session?.user) await routeAfterAuth();
    else navigate('auth');
  } else if (event === 'SIGNED_OUT') {
    navigate('auth');
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────
function showMsg(id, text) {
  // Toujours tracer dans la console (visible en devtools même si l'UI échoue)
  console.error('[App]', id, '→', text);

  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    el.className = 'msg error';
    el.style.marginTop = '12px';

    const base = id.replace('-error', '');
    // Plusieurs stratégies d'ancrage, de la plus précise à la plus large
    const anchor =
      document.querySelector(`#${base} button`) ||
      document.querySelector(`#pairing-${base} .card`) ||
      document.querySelector(`#pairing-${base}`) ||
      document.querySelector('#view .app') ||
      document.querySelector('#view');

    if (!anchor) { alert(text); return; }       // dernier recours : jamais silencieux
    if (anchor.matches('.card, .app, #view')) anchor.appendChild(el);
    else anchor.insertAdjacentElement('afterend', el);
  }
  el.textContent = text;
  el.style.display = 'block';
}
