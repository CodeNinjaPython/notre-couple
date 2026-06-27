import { supabase, IS_DEMO } from './supabase.js';
import { sendMagicLink, onAuthChange } from './auth.js';
import { getMyMembership, createCouple, joinWithCode, renewPairingCode } from './pairing.js';
import { navigate, registerView, initNavButtons } from './router.js';
import { initToday } from './today.js';
import { initCalendar } from './calendar.js';
import { initNous } from './nous.js';
import { requestPermission, getPermission, declineNotifications } from './notifications.js';
import { onboardingDone, initOnboarding, markOnboardingDone } from './onboarding.js';
import { initIntimacy } from './intimacy.js';
import { initKinks } from './kinks.js';
import { initQuickHide } from './pin-lock.js';
import { initQuickLogBar } from './quick-log-bar.js';

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

// Service worker (prod seulement — en démo le SW ne sert pas le réseau)
if ('serviceWorker' in navigator && !IS_DEMO) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// ── Register view inits ────────────────────────────────────────────────────
registerView('today',      () => initToday());
registerView('calendar',   () => initCalendar());
registerView('nous',       () => initNous());
registerView('intime',     () => { initIntimacy(); initKinks(); });
// Tests accessibles depuis la console du navigateur en dev
if (window.location.search.includes('run-tests')) {
  import('./intimacy-tests.js').then(m => m.runAllTests());
}
registerView('auth',       () => initAuthView());
registerView('pairing',    () => initPairingView());
registerView('onboarding', () => initOnboarding());

// ── Auth view ──────────────────────────────────────────────────────────────
function initAuthView() {
  const form         = document.getElementById('auth-form');
  const sent         = document.getElementById('auth-sent');
  const emailIn      = document.getElementById('auth-email');
  const submit       = document.getElementById('auth-submit');
  const resend       = document.getElementById('auth-resend');
  const emailDisplay = document.getElementById('auth-email-display');
  const demoHint     = document.getElementById('auth-demo-hint');

  if (IS_DEMO) {
    // Adapter l'UX : pas d'e-mail réel envoyé
    if (submit)   submit.textContent   = 'Entrer en démo →';
    if (emailIn)  emailIn.placeholder  = 'votre prénom (ou n\'importe quoi)';
    if (demoHint) demoHint.style.display = 'block';
  }

  async function sendLink() {
    const email = emailIn?.value?.trim();
    if (!email) return;
    if (submit) { submit.disabled = true; submit.textContent = IS_DEMO ? 'Connexion…' : 'Envoi…'; }
    try {
      await sendMagicLink(email);
      if (IS_DEMO) {
        // Connexion immédiate — onAuthChange va se déclencher automatiquement
        return;
      }
      if (emailDisplay) emailDisplay.textContent = email;
      if (form) form.style.display = 'none';
      if (sent) sent.style.display = 'block';
    } catch (e) {
      showMsg('auth-error', e.message);
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = IS_DEMO ? 'Entrer en démo →' : 'Envoyer le lien';
      }
    }
  }

  submit?.addEventListener('click', sendLink);
  emailIn?.addEventListener('keydown', e => { if (e.key === 'Enter') sendLink(); });
  resend?.addEventListener('click', () => {
    if (form) form.style.display = 'block';
    if (sent) sent.style.display = 'none';
  });
}

// ── Pairing view ───────────────────────────────────────────────────────────
function initPairingView() {
  const choice        = document.getElementById('pairing-choice');
  const createSection = document.getElementById('pairing-create');
  const joinSection   = document.getElementById('pairing-join');
  const codeSection   = document.getElementById('pairing-code-display');

  document.getElementById('btn-create')?.addEventListener('click', () => {
    choice.style.display = 'none'; createSection.style.display = 'block';
  });
  document.getElementById('btn-join')?.addEventListener('click', () => {
    choice.style.display = 'none'; joinSection.style.display = 'block';
  });
  document.getElementById('btn-create-back')?.addEventListener('click', () => {
    createSection.style.display = 'none'; choice.style.display = 'block';
  });
  document.getElementById('btn-join-back')?.addEventListener('click', () => {
    joinSection.style.display = 'none'; choice.style.display = 'block';
  });

  document.getElementById('btn-create-submit')?.addEventListener('click', async () => {
    const name       = document.getElementById('create-name')?.value?.trim();
    const tracksCycle = document.getElementById('create-tracks')?.checked ?? false;
    if (!name) { showMsg('create-error', 'Entre ton prénom pour continuer.'); return; }
    const btn = document.getElementById('btn-create-submit');
    btn.disabled = true; btn.textContent = 'Création…';
    try {
      const { code } = await createCouple(name, tracksCycle);
      document.getElementById('generated-code').textContent = code;
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
    const text = `Rejoins moi sur Notre rythme. Ton code d'invitation : ${code}`;
    if (navigator.share) {
      await navigator.share({ title: 'Notre rythme', text }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(text).catch(() => {});
      const btn = document.getElementById('btn-share-code');
      if (btn) { btn.textContent = '✓ Copié'; setTimeout(() => { btn.textContent = 'Partager'; }, 2000); }
    }
  });

  document.getElementById('btn-join-submit')?.addEventListener('click', async () => {
    const code       = document.getElementById('join-code')?.value?.trim();
    const name       = document.getElementById('join-name')?.value?.trim();
    const tracksCycle = document.getElementById('join-tracks')?.checked ?? false;
    if (!code || !name) return;
    const btn = document.getElementById('btn-join-submit');
    btn.disabled = true; btn.textContent = 'Vérification…';
    try {
      await joinWithCode(code, name, tracksCycle);
      navigate('today');
    } catch (e) { showMsg('join-error', e.message); }
    finally { btn.disabled = false; btn.textContent = 'Rejoindre'; }
  });
}

// ── Routing ────────────────────────────────────────────────────────────────
async function routeAfterAuth() {
  // Onboarding si pas encore vu (sauf en mode démo — seed déjà configuré)
  if (!IS_DEMO && !onboardingDone()) {
    navigate('onboarding');
    return;
  }
  const membership = await getMyMembership();
  if (!membership) {
    navigate('pairing');
  } else {
    navigate('today');
    initQuickLogBar();
    if (!IS_DEMO) setTimeout(() => maybeShowNotifBanner(), 2000);
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
    banner.style.display = 'none'; await requestPermission();
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
