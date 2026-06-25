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
  let step = 1;
  let tracksCycle = null;  // true = elle, false = lui
  let chosenMode  = 'rules';

  const steps = document.querySelectorAll('.onboard-step');
  const dots   = document.querySelectorAll('.onboard-dot');

  function showStep(n) {
    step = n;
    steps.forEach((s, i) => {
      s.classList.toggle('active', i + 1 === n);
    });
    dots.forEach((d, i) => {
      d.classList.toggle('active', i + 1 === n);
    });
  }

  showStep(1);

  // Step 1 → 2 : Welcome
  document.getElementById('btn-onboard-1')?.addEventListener('click', () => showStep(2));

  // Step 2 → 3 : Disclaimer accepté
  document.getElementById('btn-onboard-2')?.addEventListener('click', () => showStep(3));

  // Step 3 → 4 : Mode cycle
  document.querySelectorAll('[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      chosenMode = btn.dataset.mode;
      document.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  document.getElementById('btn-onboard-3')?.addEventListener('click', () => {
    setCycleMode(chosenMode);
    // Si mode grossesse → saisir la DPA
    if (chosenMode === 'pregnancy') {
      showStep(4);
      const dpaInput = document.getElementById('onboard-period-date');
      const dpaLabel = document.querySelector('[for="onboard-period-date"]');
      const dpaBtn4  = document.getElementById('btn-onboard-4');
      const dpaSkip  = document.getElementById('btn-onboard-4-skip');
      if (dpaLabel) dpaLabel.textContent = 'Date prévue d\'accouchement (DPA)';
      if (dpaInput) { dpaInput.removeAttribute('max'); dpaInput.value = ''; }
      if (dpaBtn4)  dpaBtn4.textContent = 'Commencer le suivi →';
      if (dpaSkip)  dpaSkip.style.display = 'block';
      // Désactiver l'ancien listener et ajouter un spécifique DPA
      document.getElementById('btn-onboard-4')?.addEventListener('click', () => {
        const dpa = dpaInput?.value;
        if (dpa) localStorage.setItem('nc-dpa-date', dpa);
        finishPregnancy();
      }, { once: true });
    } else {
      showStep(4);
    }
  });

  // Step 4 : Date dernières règles
  const dateInput = document.getElementById('onboard-period-date');
  if (dateInput) {
    const today = localDateStr();
    dateInput.max = today;
    // Défaut : il y a 3 jours
    dateInput.value = daysAgo(3);
  }

  document.getElementById('btn-onboard-4')?.addEventListener('click', () => {
    const d = dateInput?.value || null;
    finish(d);
  });
  document.getElementById('btn-onboard-4-skip')?.addEventListener('click', () => finish(null));
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
