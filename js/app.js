import { supabase } from './supabase.js';
import { sendMagicLink, onAuthChange } from './auth.js';
import { getMyMembership, createCouple, joinWithCode, renewPairingCode } from './pairing.js';
import { navigate, registerView, initNavButtons } from './router.js';
import { initToday } from './today.js';
import { initCalendar } from './calendar.js';
import { initNous } from './nous.js';
import { requestPermission, getPermission, declineNotifications } from './notifications.js';

// --- Register service worker -----------------------------------------------
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// --- Register view inits ---------------------------------------------------
registerView('today',    () => initToday());
registerView('calendar', () => initCalendar());
registerView('nous',     () => initNous());
registerView('auth',     () => initAuthView());
registerView('pairing',  () => initPairingView());

// ---------------------------------------------------------------------------
// Auth view
// ---------------------------------------------------------------------------
function initAuthView() {
  const form    = document.getElementById('auth-form');
  const sent    = document.getElementById('auth-sent');
  const emailIn = document.getElementById('auth-email');
  const submit  = document.getElementById('auth-submit');
  const resend  = document.getElementById('auth-resend');
  const emailDisplay = document.getElementById('auth-email-display');

  async function sendLink() {
    const email = emailIn?.value?.trim();
    if (!email) return;
    if (submit) { submit.disabled = true; submit.textContent = 'Envoi…'; }
    try {
      await sendMagicLink(email);
      if (emailDisplay) emailDisplay.textContent = email;
      if (form) form.style.display = 'none';
      if (sent) sent.style.display = 'block';
    } catch (e) {
      showMsg('auth-error', e.message);
    } finally {
      if (submit) { submit.disabled = false; submit.textContent = 'Envoyer le lien'; }
    }
  }

  submit?.addEventListener('click', sendLink);
  emailIn?.addEventListener('keydown', e => { if (e.key === 'Enter') sendLink(); });
  resend?.addEventListener('click', () => {
    if (form) form.style.display = 'block';
    if (sent) sent.style.display = 'none';
  });
}

// ---------------------------------------------------------------------------
// Pairing view
// ---------------------------------------------------------------------------
function initPairingView() {
  const choice       = document.getElementById('pairing-choice');
  const createSection = document.getElementById('pairing-create');
  const joinSection  = document.getElementById('pairing-join');
  const codeSection  = document.getElementById('pairing-code-display');

  document.getElementById('btn-create')?.addEventListener('click', () => {
    choice.style.display = 'none';
    createSection.style.display = 'block';
  });

  document.getElementById('btn-join')?.addEventListener('click', () => {
    choice.style.display = 'none';
    joinSection.style.display = 'block';
  });

  // Back buttons
  document.getElementById('btn-create-back')?.addEventListener('click', () => {
    createSection.style.display = 'none';
    choice.style.display = 'block';
  });
  document.getElementById('btn-join-back')?.addEventListener('click', () => {
    joinSection.style.display = 'none';
    choice.style.display = 'block';
  });

  // Create couple
  document.getElementById('btn-create-submit')?.addEventListener('click', async () => {
    const name = document.getElementById('create-name')?.value?.trim();
    const tracksCycle = document.getElementById('create-tracks')?.checked ?? false;
    if (!name) return;

    const btn = document.getElementById('btn-create-submit');
    btn.disabled = true; btn.textContent = 'Création…';
    try {
      const { code } = await createCouple(name, tracksCycle);
      document.getElementById('generated-code').textContent = code;
      createSection.style.display = 'none';
      codeSection.style.display = 'block';
    } catch (e) {
      showMsg('create-error', e.message);
    } finally {
      btn.disabled = false; btn.textContent = 'Créer notre espace';
    }
  });

  // Renew code
  let currentCoupleId = null;
  document.getElementById('btn-renew-code')?.addEventListener('click', async () => {
    if (!currentCoupleId) {
      const m = await getMyMembership();
      currentCoupleId = m?.couple_id;
    }
    if (!currentCoupleId) return;
    const newCode = await renewPairingCode(currentCoupleId);
    document.getElementById('generated-code').textContent = newCode;
  });

  // Partner joined — continue
  document.getElementById('btn-done')?.addEventListener('click', () => navigate('today'));

  // Join with code
  document.getElementById('btn-join-submit')?.addEventListener('click', async () => {
    const code = document.getElementById('join-code')?.value?.trim();
    const name = document.getElementById('join-name')?.value?.trim();
    const tracksCycle = document.getElementById('join-tracks')?.checked ?? false;
    if (!code || !name) return;

    const btn = document.getElementById('btn-join-submit');
    btn.disabled = true; btn.textContent = 'Vérification…';
    try {
      await joinWithCode(code, name, tracksCycle);
      navigate('today');
    } catch (e) {
      showMsg('join-error', e.message);
    } finally {
      btn.disabled = false; btn.textContent = 'Rejoindre';
    }
  });
}

// ---------------------------------------------------------------------------
// Routing logic
// ---------------------------------------------------------------------------
async function routeAfterAuth() {
  const membership = await getMyMembership();
  if (!membership) {
    navigate('pairing');
  } else {
    navigate('today');
    // Proposer les notifications après la première navigation
    setTimeout(() => maybeShowNotifBanner(), 2000);
  }
}

// ---------------------------------------------------------------------------
// Bannière opt-in notifications (affichée une seule fois)
// ---------------------------------------------------------------------------
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  // On expose l'événement pour que le bouton "Installer" dans Nous puisse l'utiliser
  window.__installPrompt = e;
});

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
  }, { once: true });

  document.getElementById('btn-notif-no')?.addEventListener('click', () => {
    banner.style.display = 'none';
    declineNotifications();
  }, { once: true });
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
initNavButtons();

// Show loading
document.getElementById('view').innerHTML = '<div class="loading">Chargement…</div>';

onAuthChange(async (event, session) => {
  if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
    if (session?.user) {
      await routeAfterAuth();
    } else {
      navigate('auth');
    }
  } else if (event === 'SIGNED_OUT') {
    navigate('auth');
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function showMsg(id, text) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    el.className = 'msg error';
    const btn = document.querySelector(`#${id.replace('-error', '')} button`);
    if (btn) btn.insertAdjacentElement('afterend', el);
  }
  el.textContent = text;
}
