/**
 * onboarding.js — Flow 4 étapes première ouverture.
 * Stockage : localStorage nc-onboarding-v1, nc-cycle-mode, nc-last-period
 */
import { navigate } from './router.js';
import { getCurrentCycle, startPeriod } from './cycles.js';
import { localDateStr, daysAgo } from './date-utils.js';

const KEY = 'nc-onboarding-v1';
const MODE_KEY = 'nc-cycle-mode';
const PERIOD_KEY = 'nc-last-period';
const PROFILE_NAME_KEY = 'nc-profile-name';
const PROFILE_ROLE_KEY = 'nc-profile-role';   // 'elle' | 'lui'

// --- Profil de première connexion (prénom + rôle) --------------------------
// Stocké côté client : la ligne couple_members n'existe qu'après création/
// jointure du couple. On applique ces valeurs au moment du pairing.
export function profileComplete() {
  return !!localStorage.getItem(PROFILE_NAME_KEY) && !!localStorage.getItem(PROFILE_ROLE_KEY);
}
export function getProfileName() {
  return localStorage.getItem(PROFILE_NAME_KEY) || '';
}
export function getProfileRole() {
  return localStorage.getItem(PROFILE_ROLE_KEY) || '';
}
export function saveProfile(name, role) {
  localStorage.setItem(PROFILE_NAME_KEY, name);
  localStorage.setItem(PROFILE_ROLE_KEY, role);
}

export function onboardingDone() {
  return localStorage.getItem(KEY) === 'done';
}

export function markOnboardingDone() {
  localStorage.setItem(KEY, 'done');
}

export function getCycleMode() {
  return localStorage.getItem(MODE_KEY) || 'rules';
}

export function setCycleMode(mode) {
  localStorage.setItem(MODE_KEY, mode);
}

// ---------------------------------------------------------------------------
// Init l'écran onboarding
// ---------------------------------------------------------------------------
export function initOnboarding() {
  const TOTAL = 4;
  let step = 1;
  let chosenMode = 'rules';

  const steps    = document.querySelectorAll('.onboard-step');
  const dots     = document.querySelectorAll('.onboard-dot');
  const dotsWrap = document.querySelector('.onboard-dots');
  const backBtn  = document.getElementById('btn-onboard-back');
  const progress = document.getElementById('onboard-progress-label');

  function showStep(n, { focus = true } = {}) {
    step = n;
    steps.forEach((s, i) => s.classList.toggle('active', i + 1 === n));
    dots.forEach((d, i) => d.classList.toggle('active', i + 1 === n));
    dotsWrap?.setAttribute('aria-valuenow', String(n));
    if (progress) progress.textContent = `Étape ${n} sur ${TOTAL}`;
    if (backBtn) backBtn.style.visibility = n > 1 ? 'visible' : 'hidden';
    // A11Y : déplacer le focus sur le titre de l'étape pour les lecteurs d'écran
    if (focus) steps[n - 1]?.querySelector('.onboard-title')?.focus();
  }

  showStep(1, { focus: false });

  // Retour à l'étape précédente
  backBtn?.addEventListener('click', () => { if (step > 1) showStep(step - 1); });

  // Step 1 → 2 : Welcome
  document.getElementById('btn-onboard-1')?.addEventListener('click', () => showStep(2));

  // Step 2 : consentement explicite avant d'activer le bouton
  const consent = document.getElementById('onboard-consent');
  const accept  = document.getElementById('btn-onboard-2');
  if (consent && accept) {
    accept.disabled = !consent.checked;
    consent.addEventListener('change', () => { accept.disabled = !consent.checked; });
  }
  accept?.addEventListener('click', () => {
    if (consent && !consent.checked) return;
    showStep(3);
  });

  // Step 3 : choix du mode (radiogroup)
  document.querySelectorAll('[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      chosenMode = btn.dataset.mode;
      document.querySelectorAll('[data-mode]').forEach(b => {
        const sel = b === btn;
        b.classList.toggle('active', sel);
        b.setAttribute('aria-pressed', sel ? 'true' : 'false');
      });
    });
  });

  const dateInput = document.getElementById('onboard-period-date');
  const dateLabel = document.querySelector('[for="onboard-period-date"]');
  const btn4      = document.getElementById('btn-onboard-4');
  const skip4     = document.getElementById('btn-onboard-4-skip');

  // Step 3 → 4 : adapter l'étape 4 au mode choisi
  document.getElementById('btn-onboard-3')?.addEventListener('click', () => {
    setCycleMode(chosenMode);
    if (chosenMode === 'pregnancy') {
      if (dateLabel) dateLabel.textContent = 'Date prévue d\'accouchement (DPA)';
      if (dateInput) { dateInput.removeAttribute('max'); dateInput.value = ''; }
      if (btn4)  btn4.textContent = 'Commencer le suivi →';
      if (skip4) skip4.style.display = 'block';
    } else {
      if (dateLabel) dateLabel.textContent = 'Date de début';
      if (dateInput) { dateInput.max = localDateStr(); dateInput.value = daysAgo(3); }
      if (btn4)  btn4.textContent = 'Terminer →';
      if (skip4) skip4.style.display = '';
    }
    showStep(4);
  });

  // Step 4 : un seul handler qui dispatche selon le mode (évite le double finish)
  btn4?.addEventListener('click', () => {
    if (chosenMode === 'pregnancy') {
      if (dateInput?.value) localStorage.setItem('nc-dpa-date', dateInput.value);
      finishPregnancy();
    } else {
      finish(dateInput?.value || null);
    }
  });
  skip4?.addEventListener('click', () => {
    if (chosenMode === 'pregnancy') finishPregnancy();
    else finish(null);
  });
}

async function finishPregnancy() {
  markOnboardingDone();
  const { getMyMembership } = await import('./pairing.js');
  const me = await getMyMembership();
  navigate(me ? 'today' : 'pairing');
}

async function finish(periodDate) {
  markOnboardingDone();

  if (periodDate) {
    localStorage.setItem(PERIOD_KEY, periodDate);
    // Créer le cycle si aucun n'existe
    try {
      const existing = await getCurrentCycle();
      if (!existing) {
        const { supabase } = await import('./supabase.js');
        const { data: { user } } = await supabase.auth.getUser();
        const { getMyMembership } = await import('./pairing.js');
        const me = await getMyMembership();
        if (user && me?.tracks_cycle) {
          await supabase.from('cycles').insert({
            user_id: user.id,
            couple_id: me.couple_id,
            period_start: periodDate,
            period_end: null,
          });
        }
      }
    } catch (e) {
      console.warn('Onboarding cycle init:', e.message);
    }
  }

  // Naviguer vers pairing ou today selon l'état du couple
  const { getMyMembership } = await import('./pairing.js');
  const me = await getMyMembership();
  navigate(me ? 'today' : 'pairing');
}
