import { supabase } from './supabase.js';
import { getMyMembership, getPartnerMembership, renewPairingCode } from './pairing.js';
import { signOut } from './auth.js';
import { navigate } from './router.js';
import {
  getCurrentCycle, getCycleHistory, startPeriod, endPeriod,
  predictNextPeriod, getEnergyByCycleDay, getPartnerEnergyByCycleDay, interpolate,
} from './cycles.js';
import { subscribeToEvents, subscribeToPartnerLogs } from './realtime.js';
import { maybeRemindToLog, checkPartnerLoggedToday, showNotification, checkRulesImminentes, checkFertileWindow } from './notifications.js';
import { localDateStr, daysAgo, fmtDate, diffDays } from './date-utils.js';
import { computeStreak } from './analytics.js';
import { getCycleMode } from './onboarding.js';
import { cachedQuery, invalidateCache } from './query-cache.js';
import { initCollapsibles } from './collapse.js';
import { Cycle, predictNextPeriodAdvanced } from './cycle-model.js';
import { renderCycleRing, renderRingLegend } from './ring-chart.js';
import { toast as showToast, confirmDialog, friendlyError } from './ui-feedback.js';
import { getPregnancyMilestone } from './pregnancy-milestones.js';
import { skeletonFill } from './skeleton.js';

const PHASES_DATA = {
  Menstruelle: {
    range: [1, 5],
    fill: 'rgba(229,57,53,.07)',
    tip: 'Elle est en phase menstruelle. Le repos et la chaleur font souvent du bien — un moment calme peut être apprécié.',
    insight: {
      elle: 'Phase menstruelle — énergie souvent <em>basse</em>, le corps se régénère.',
      lui: 'Ton énergie tend à être <em class="s">stable</em> pendant sa phase menstruelle.'
    }
  },
  Folliculaire: {
    range: [6, 13],
    fill: 'rgba(66,120,196,.05)',
    tip: 'L\'énergie remonte progressivement. Une bonne période pour des sorties et des projets communs.',
    insight: {
      elle: 'Énergie en <em>montée</em> — bonne période pour de nouveaux projets.',
      lui: 'Vos énergies remontent ensemble — <em class="s">synchronie</em> de début de cycle.'
    }
  },
  Ovulation: {
    range: [14, 16],
    fill: 'rgba(124,92,252,.09)',
    tip: 'Pic d\'énergie et de vitalité ces jours-ci. Profitez-en pour partager des activités qui vous tiennent à cœur.',
    insight: {
      elle: 'Pic d\'énergie et de <em>vitalité</em> — moment fort du cycle.',
      lui: 'Période de haute <em class="s">énergie</em> pour tous les deux souvent.'
    }
  },
  Lutéale: {
    range: [17, 35],
    fill: 'rgba(232,67,117,.06)',
    tip: 'Énergie souvent en baisse, sensibilité en hausse ces jours-ci — une soirée tranquille tombe souvent juste.',
    insight: {
      elle: 'Énergie qui redescend, <em>sensibilité</em> plus présente ces jours-ci.',
      lui: 'Ton <em class="s">énergie</em> tend à baisser avec la sienne — phase lutéale.'
    }
  },
};
// Faces = emoji + label chaleureux pour les boutons ronds (humeur / énergie).
const FACES_MOOD = [
  { e: '😣', l: 'Difficile' }, { e: '😔', l: 'Maussade' }, { e: '😐', l: 'Neutre' },
  { e: '🙂', l: 'Bien' }, { e: '😊', l: 'Rayonnant' },
];
const FACES_ENERGY = [
  { e: '🪫', l: 'Vidé' }, { e: '🔋', l: 'Bas' }, { e: '⚡', l: 'Moyen' },
  { e: '🔥', l: 'Plein' }, { e: '🚀', l: 'Survolté' },
];
const METRICS = {
  elle: [
    { id: 'mood',     label: 'Humeur',      type: 'enum',    opts: ['😣','😔','😐','🙂','😊'], faces: FACES_MOOD },
    { id: 'energy',   label: 'Énergie',     type: 'scale',   faces: FACES_ENERGY },
    { id: 'flow',     label: 'Flux',        type: 'enum',    opts: ['·','◦','●','◆'] },
    { id: 'cramps',   label: 'Crampes',     type: 'scale' },
    { id: 'libido',   label: 'Libido',      type: 'scale' },
    { id: 'sleep',    label: 'Sommeil',     type: 'scale' },
    { id: 'bbt',      label: 'Temp. basale',type: 'bbt' },
    { id: 'note',     label: 'Note du jour',type: 'text' },
  ],
  lui: [
    { id: 'mood',     label: 'Humeur',      type: 'enum',    opts: ['😣','😔','😐','🙂','😊'], faces: FACES_MOOD },
    { id: 'energy',   label: 'Énergie',     type: 'scale',   faces: FACES_ENERGY },
    { id: 'stress',   label: 'Stress',      type: 'scale' },
    { id: 'libido',   label: 'Libido',      type: 'scale' },
    { id: 'sleep',    label: 'Sommeil',     type: 'scale' },
    { id: 'exercise', label: 'Sport',       type: 'boolean', opts: ['—', '✓'] },
    { id: 'note',     label: 'Note du jour',type: 'text' },
  ],
};

// Retourne la « face » (emoji+label) correspondant à une valeur sauvegardée.
function faceFor(metric, value) {
  if (!metric.faces || value == null) return null;
  const pos = metric.type === 'scale' ? Number(value) - 1 : Number(value);
  return metric.faces[pos] || null;
}
const EVENT_TYPES = {
  intimacy:   { icon: '❤️', label: 'Intimité' },
  conflict:   { icon: '💬', label: 'Tension' },
  date_night: { icon: '🌙', label: 'Soirée' },
  other:      { icon: '✨', label: 'Moment' },
  reconfort:  { icon: '💛', label: 'Besoin de douceur' },
  presence:   { icon: '🫂', label: 'Besoin de présence' },
  espace:     { icon: '🌿', label: 'Besoin d\'espace' },
};
const CYCLE_LEN = 28;

let state = {
  me: null, partner: null,
  cur: 'elle',
  currentCycle: null,
  cycleDay: null, phaseName: null,
  savedValues: {},
  coupleId: null,
  prediction: null,
  logDate: localDateStr(),
  logDateOffset: 0,          // 0 = aujourd'hui, -1 = hier, etc.
};

export async function initToday() {
  const el = document.getElementById('today-date');
  if (el) el.textContent = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  // Skeletons de chargement pour les zones lourdes
  skeletonFill([
    { id: 'events-list', type: 'lines', lines: 3 },
    { id: 'insight-body', type: 'lines', lines: 2 }
  ]);

  // Bouton profil (en-tête) → vue Réglages
  document.getElementById('btn-profile')?.addEventListener('click', () => navigate('settings'));

  [state.me] = await Promise.all([getMyMembership()]);
  if (state.me) {
    state.coupleId = state.me.couple_id;
    state.partner = await getPartnerMembership(state.me.couple_id);
  }

  state.cur = state.me?.tracks_cycle ? 'elle' : 'lui';
  document.body.dataset.cur = state.cur;

  // Skeleton pendant le chargement de l'anneau de cycle
  const ringWrap = document.getElementById('cycle-ring');
  if (ringWrap && !ringWrap.innerHTML) {
    ringWrap.innerHTML = '<div class="skeleton" style="width:min(260px,80vw);height:min(260px,80vw);border-radius:50%;margin:12px auto"></div>';
  }

  state.logDate = localDateStr();  // timezone locale, pas UTC
  state.logDateOffset = 0;

  initNeedButtons();
  initDateNav();
  initCopyHier();

  await reloadDataAndRenderToday();

  // Initialiser les accordéons de la vue Today
  initCollapsibles(document.getElementById('view'));

  // Realtime : rafraîchir les moments en temps réel
  if (state.coupleId) {
    subscribeToEvents(state.coupleId, () => renderEvents());
    subscribeToPartnerLogs(state.coupleId, async () => {
      showToast('Ton partenaire vient de saisir sa journée.');
      showNotification('Notre cycle', 'Ton partenaire a saisi sa journée.');
      await reloadDataAndRenderToday();
    });
  }

  // Rappel quotidien + alerte règles imminentes
  maybeRemindToLog();
  if (state.prediction) {
    checkRulesImminentes(state.prediction);
    // En mode conception : alerte à l'approche de la fenêtre fertile.
    if (getCycleMode() === 'conception') checkFertileWindow(state.prediction);
  }

  // Toast si partenaire a déjà saisi aujourd'hui
  if (state.partner) {
    checkPartnerLoggedToday(state.partner.user_id).then(has => {
      if (has) showToast(`${state.partner.display_name} a déjà saisi aujourd'hui.`);
    });
  }
}

export async function reloadDataAndRenderToday() {
  const [cycle, history] = await Promise.all([
    getCurrentCycle(),
    getCycleHistory(),
  ]);
  state.currentCycle = cycle;

  if (cycle) {
    // diffDays() compare en heure locale (T12:00) → pas de décalage d'un jour lié
    // au fuseau. On part de logDate pour refléter le jour consulté, pas seulement aujourd'hui.
    state.cycleDay = diffDays(state.logDate, cycle.period_start) + 1;
    state.phaseName = getPhase(state.cycleDay);
  } else {
    state.cycleDay = null;
    state.phaseName = null;
  }

  state.prediction = predictNextPeriod(history);
  await loadEntriesForDate(state.logDate);

  renderHeader();
  renderMeteoMemo();
  renderPartnerStatus();
  await renderStreak();
  renderRingChart();     // ← anneau SVG interactif
  renderCycleControls();
  renderWhoToggle();
  await renderChart();
  renderMetrics();
  renderInsight();
  renderTip();
  renderPrediction();
  await renderEvents();
}

function getPhase(day) {
  const phaseEntry = Object.entries(PHASES_DATA).find(([, data]) => day >= data.range[0] && day <= data.range[1]);
  return phaseEntry ? phaseEntry[0] : 'Lutéale';
}

async function loadEntriesForDate(dateStr) {
  const { data } = await supabase
    .from('log_entries').select('category_id, value').eq('log_date', dateStr);
  state.savedValues = {};
  (data || []).forEach(r => { state.savedValues[r.category_id] = r.value; });
}

// --- Navigation date (saisie antérieure) -----------------------------------
function initDateNav() {
  const prevBtn = document.getElementById('btn-log-prev');
  const nextBtn = document.getElementById('btn-log-next');
  const label   = document.getElementById('log-date-label');

  function updateDisplay() {
    const isToday = state.logDateOffset === 0;
    nextBtn && (nextBtn.disabled = isToday);
    if (label) {
      if (isToday) {
        label.textContent = "Aujourd'hui";
      } else {
        const d = new Date(state.logDate + 'T12:00:00');
        label.textContent = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
      }
    }
    // Masquer le contrôle cycle sur les jours passés
    const cycleCtrl = document.getElementById('cycle-controls');
    if (cycleCtrl) cycleCtrl.style.display = (!isToday || !state.me?.tracks_cycle) ? 'none' : 'block';
  }

  prevBtn?.addEventListener('click', async () => {
    if (state.logDateOffset > -30) {
      state.logDateOffset--;
      state.logDate = daysAgo(-state.logDateOffset);
      updateDisplay();
      await loadEntriesForDate(state.logDate);
      renderMetrics();
      renderRingChart();  // l'anneau utilise getDayInCycle(logDate) → suivre la date
    }
    if (state.logDateOffset === -30) prevBtn.disabled = true;
  });

  nextBtn?.addEventListener('click', async () => {
    if (state.logDateOffset < 0) {
      state.logDateOffset++;
      state.logDate = daysAgo(-state.logDateOffset);
      updateDisplay();
      await loadEntriesForDate(state.logDate);
      renderMetrics();
      renderRingChart();  // idem : refléter le jour sélectionné
    }
  });

  updateDisplay();
}

// --- Statut de fertilité (mode conception) ---------------------------------
function computeFertilityStatus(prediction) {
  if (!prediction?.fertileStart || !prediction?.ovulationDate) return null;
  const today = localDateStr();
  const { fertileStart, fertileEnd, ovulationDate } = prediction;
  if (today === ovulationDate)
    return { label: 'Pic de fertilité — ovulation aujourd\'hui', hot: true };
  if (today >= fertileStart && today <= (fertileEnd || ovulationDate))
    return { label: 'Fenêtre fertile en cours', hot: true };
  if (today < fertileStart) {
    const d = diffDays(fertileStart, today);
    return { label: `Fenêtre fertile dans ${d} jour${d > 1 ? 's' : ''}`, hot: false };
  }
  return { label: 'Hors fenêtre fertile', hot: false };
}

// --- Progression de grossesse (mode pregnancy) -----------------------------
function renderPregnancyProgress(container) {
  const dpa = localStorage.getItem('nc-dpa-date');
  let weeks = null, tri = null, pct = 0, remaining = null;
  if (dpa) {
    const daysToDue = diffDays(dpa, localDateStr()); // jours avant terme
    const elapsed   = 280 - daysToDue;               // 40 semaines = 280 j
    weeks     = Math.max(0, Math.floor(elapsed / 7));
    remaining = Math.max(0, 40 - weeks);
    pct       = Math.min(100, Math.max(0, Math.round(elapsed / 280 * 100)));
    tri       = weeks < 13 ? 1 : weeks < 27 ? 2 : 3;
  }
  container.innerHTML = `
    <div class="preg-ring" style="--p:${pct}%" role="img"
      aria-label="${weeks != null ? `Semaine ${weeks} de grossesse` : 'Grossesse'}">
      <div class="preg-ring-inner">
        <div class="preg-week">${weeks != null ? 'S' + weeks : '🤰'}</div>
        <div class="preg-sub">${tri ? 'Trimestre ' + tri : 'Grossesse'}</div>
        ${remaining != null ? `<div class="preg-rem">${remaining} sem. restantes</div>` : ''}
      </div>
    </div>`;
}

// --- Repère de grossesse semaine par semaine -------------------------------
function pregnancyWeeks() {
  const dpa = localStorage.getItem('nc-dpa-date');
  if (!dpa) return null;
  const daysToDue = diffDays(dpa, localDateStr());
  return Math.max(0, Math.floor((280 - daysToDue) / 7));
}

function renderPregnancyMilestone() {
  const card = document.getElementById('preg-milestone');
  if (!card) return;
  const weeks = pregnancyWeeks();
  if (getCycleMode() !== 'pregnancy' || weeks == null) {
    card.style.display = 'none';
    card.innerHTML = '';
    return;
  }
  const m = getPregnancyMilestone(weeks);
  const appt = m.nextAppointment
    ? `<div class="preg-appt">📅 ${m.nextAppointment.label} ${
        m.nextAppointment.inWeeks <= 0 ? '· cette semaine'
        : `· dans ~${m.nextAppointment.inWeeks} sem.`}</div>`
    : '';
  card.innerHTML = `
    <div class="preg-ms-head">
      <span class="preg-ms-fruit" aria-hidden="true">🍃</span>
      <div>
        <h2>Semaine ${m.week} · grand comme ${m.fruit}</h2>
        <p class="preg-ms-note">${m.note}</p>
      </div>
    </div>
    ${appt}`;
  card.style.display = 'block';
}

// --- Anneau SVG du cycle ---------------------------------------------------
function renderRingChart() {
  const ring   = document.getElementById('cycle-ring');
  const legend = document.getElementById('ring-legend');
  if (!ring) return;

  // Mode grossesse : l'anneau de cycle n'a pas de sens → progression de grossesse
  if (getCycleMode() === 'pregnancy') {
    renderPregnancyProgress(ring);
    if (legend) legend.innerHTML = '';
    renderPregnancyMilestone();
    return;
  }

  renderPregnancyMilestone(); // masque la carte hors mode grossesse

  const cycleObj = state.currentCycle
    ? new Cycle(state.currentCycle)
    : null;

  const day         = cycleObj?.getDayInCycle(state.logDate) ?? 1;
  const totalDays   = cycleObj?.dureeCycle ?? 28;
  const fertile     = cycleObj?.getFertileWindow() ?? { start:9, end:15, ovulation:14 };
  const phaseName   = cycleObj ? Cycle.phaseName(day, totalDays) : '';

  // Jours avec données saisies dans le cycle en cours
  const loggedSet = new Set(
    Object.keys(state.savedValues).length ? [day] : []
  );

  renderCycleRing(ring, {
    totalDays,
    currentDay:   day,
    periodDays:   cycleObj?.dureeRegles ?? 5,
    fertileStart: fertile.start,
    fertileEnd:   fertile.end,
    ovulationDay: fertile.ovulation,
    phaseName,
    loggedDays:   loggedSet,
  });

  renderRingLegend(legend);
}

// --- État d'appairage : confirmation « lié » + bandeau solo ----------------
const PARTNER_SEEN_KEY = 'nc-partner-seen';

function renderPartnerStatus() {
  // Confirmation une seule fois quand le partenaire vient de rejoindre.
  if (state.partner) {
    if (!localStorage.getItem(PARTNER_SEEN_KEY)) {
      localStorage.setItem(PARTNER_SEEN_KEY, '1');
      showToast(`💜 ${state.partner.display_name} a rejoint votre espace`);
    }
  } else {
    // Re-célébrer si le couple est délié puis relié plus tard.
    localStorage.removeItem(PARTNER_SEEN_KEY);
  }

  const banner = document.getElementById('solo-banner');
  if (!banner) return;
  // Bandeau solo : couple existant, mais partenaire pas encore lié.
  if (!state.coupleId || state.partner) { banner.style.display = 'none'; return; }
  banner.style.display = 'flex';

  document.getElementById('btn-invite-partner')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-invite-partner');
    if (btn) { btn.disabled = true; btn.textContent = 'Génération…'; }
    try {
      const code = await renewPairingCode(state.coupleId);
      const share = await confirmDialog({
        title: 'Code d\'invitation',
        message: `Transmettez ce code à votre partenaire (valable 24 h) : ${code}`,
        confirmLabel: 'Partager',
        cancelLabel: 'Fermer',
      });
      if (share) {
        const text = `Rejoins-moi sur Notre cycle. Ton code d'invitation : ${code}`;
        if (navigator.share) await navigator.share({ title: 'Notre cycle', text }).catch(() => {});
        else { await navigator.clipboard.writeText(text).catch(() => {}); showToast('Code copié ✓'); }
      }
    } catch (e) {
      showToast(friendlyError(e), 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Inviter mon partenaire'; }
    }
  });
}

// #6 — SOS réconfort : signaler un besoin (douceur / présence / espace) en 1 tap.
function initNeedButtons() {
  const card = document.getElementById('sos-card');
  if (!card) return;
  if (!state.coupleId || !state.partner) { card.style.display = 'none'; return; }
  card.style.display = 'block';
  card.querySelectorAll('.sos-btn').forEach(btn => {
    btn.onclick = async () => {
      const type = btn.dataset.need;
      btn.disabled = true;
      try {
        const { error } = await supabase.from('couple_events').insert({
          couple_id: state.coupleId, created_by: state.me?.user_id,
          event_date: localDateStr(), event_type: type, note: null,
        });
        if (error) throw error;
        showToast(`${EVENT_TYPES[type]?.icon || '💛'} Signal envoyé à ${state.partner.display_name || 'ton partenaire'}`);
        // Push au partenaire (#12, best-effort si abonné).
        import('./push.js').then(({ sendPushToPartner }) =>
          sendPushToPartner(state.partner.user_id, 'Notre cycle',
            `${EVENT_TYPES[type]?.icon || '💛'} ${state.partner.display_name ? '' : ''}${EVENT_TYPES[type]?.label || 'Un besoin'} de ${state.me?.display_name || 'ton partenaire'}`));
        await renderEvents();
      } catch (e) {
        showToast(friendlyError(e), 'error');
      } finally {
        btn.disabled = false;
      }
    };
  });
}

// #5 — Météo-mémo : état d'elle, glanceable pour le partenaire.
const PHASE_METEO = {
  Menstruelle:  { emoji: '🌧️', etat: 'Énergie basse · besoin de cocooning' },
  Folliculaire: { emoji: '🌤️', etat: 'Énergie en montée' },
  Ovulation:    { emoji: '☀️', etat: 'Pleine vitalité' },
  Lutéale:      { emoji: '🌥️', etat: 'Sensibilité accrue · douceur bienvenue' },
};
function renderMeteoMemo() {
  const card = document.getElementById('meteo-memo');
  if (!card) return;
  // Visible seulement pour le partenaire (celui qui ne suit pas le cycle), avec un cycle en cours.
  if (!state.me || state.me.tracks_cycle || !state.partner || !state.phaseName || !PHASE_METEO[state.phaseName]) {
    card.style.display = 'none';
    return;
  }
  const m = PHASE_METEO[state.phaseName];
  const tip = PHASES_DATA[state.phaseName]?.tip || '';
  const name = state.partner.display_name || 'Elle';
  card.innerHTML = `
    <div class="meteo-head">
      <span class="meteo-emoji" aria-hidden="true">${m.emoji}</span>
      <div>
        <div class="meteo-title">Météo de ${name}</div>
        <div class="meteo-etat">${state.phaseName} · ${m.etat}</div>
      </div>
    </div>
    <p class="meteo-tip">${tip}</p>`;
  card.style.display = 'block';

  // #8 — notification douce du conseil de phase pour le partenaire (1×/jour, si opt-in).
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && tip) {
      if (localStorage.getItem('nc-phase-tip-last') !== localDateStr()) {
        localStorage.setItem('nc-phase-tip-last', localDateStr());
        showNotification('Notre cycle', tip, 'phase-tip');
      }
    }
  } catch (_) { /* notifications indisponibles */ }
}

// --- Header ----------------------------------------------------------------
function renderHeader() {
  const eyebrow   = document.getElementById('eyebrow');
  const phaseName = document.getElementById('phase-name');
  const mode      = getCycleMode();

  if (mode === 'pregnancy') {
    const dpa = localStorage.getItem('nc-dpa-date');
    if (dpa) {
      // Semaines de grossesse écoulées (cohérent avec l'anneau et la carte repère).
      const elapsed = Math.max(0, 280 - diffDays(dpa, localDateStr()));
      const weeks = Math.floor(elapsed / 7);
      const days  = elapsed % 7;
      if (eyebrow)   eyebrow.textContent   = `Semaine ${weeks} · Grossesse`;
      if (phaseName) phaseName.textContent = `S${weeks}+${days}`;
    } else {
      if (eyebrow)   eyebrow.textContent   = 'Mode grossesse';
      if (phaseName) phaseName.textContent = 'Grossesse';
    }
    return;
  }

  // Mode conception : mettre en avant le statut de fertilité
  if (mode === 'conception') {
    const fert = computeFertilityStatus(state.prediction);
    if (state.cycleDay && state.phaseName) {
      if (eyebrow)   eyebrow.textContent   = fert ? `🌱 ${fert.label}` : `Jour ${state.cycleDay} · ${state.phaseName}`;
      if (phaseName) phaseName.textContent = fert?.hot ? 'Fenêtre fertile' : state.phaseName;
    } else {
      if (eyebrow)   eyebrow.textContent   = '🌱 Mode conception';
      if (phaseName) phaseName.textContent = 'Conception';
    }
    return;
  }

  if (state.cycleDay && state.phaseName) {
    if (eyebrow)   eyebrow.textContent   = `Jour ${state.cycleDay} · ${state.phaseName}`;
    if (phaseName) phaseName.textContent = state.phaseName;
  } else {
    if (eyebrow)   eyebrow.textContent   = 'Pas de cycle en cours';
    if (phaseName) phaseName.textContent = 'Notre cycle';
  }
}

// --- Streak ----------------------------------------------------------------
async function renderStreak() {
  const streakEl = document.getElementById('streak-badge');
  if (!streakEl) return;
  const { data } = await supabase.from('log_entries')
    .select('log_date').order('log_date', { ascending: false }).limit(60);
  const streak = computeStreak(data || []);
  if (streak >= 3) {
    streakEl.textContent = `🔥 ${streak} jours`;
    streakEl.style.display = 'inline-flex';
  } else {
    streakEl.style.display = 'none';
  }
}

// --- Comme hier ------------------------------------------------------------
function initCopyHier() {
  document.getElementById('btn-comme-hier')?.addEventListener('click', async () => {
    const hier = daysAgo(1);
    const { data } = await supabase.from('log_entries')
      .select('category_id,value').eq('log_date', hier);
    if (!data?.length) { showToast('Aucune saisie hier'); return; }
    const today = localDateStr();
    await Promise.all(data.map(e =>
      supabase.from('log_entries').upsert(
        { log_date: today, category_id: e.category_id, value: e.value, shared: true },
        { onConflict: 'user_id,log_date,category_id' }
      )
    ));
    await reloadDataAndRenderToday();
    showToast(`Saisie de ${fmtDate(hier, { weekday: 'long' })} copiée ✓`);
  });
}

// --- Cycle controls (elle uniquement) --------------------------------------
function renderCycleControls() {
  const wrap = document.getElementById('cycle-controls');
  if (!wrap) return;

  const elleIsMe = state.me?.tracks_cycle;
  if (!elleIsMe) { wrap.style.display = 'none'; return; }

  wrap.style.display = 'block';
  const btn = document.getElementById('btn-cycle-toggle');
  if (!btn) return;

  const hasOpenCycle = state.currentCycle && !state.currentCycle.period_end;

  if (hasOpenCycle) {
    btn.textContent = 'Mes règles se terminent';
    btn.dataset.action = 'end';
    btn.className = 'btn-secondary';
  } else {
    btn.textContent = 'Mes règles commencent';
    btn.dataset.action = 'start';
    btn.className = 'btn-primary';
  }

  btn.onclick = async () => {
    btn.disabled = true;
    try {
      if (btn.dataset.action === 'start') {
        state.currentCycle = await startPeriod();
        state.cycleDay = 1;
        state.phaseName = 'Menstruelle';
      } else {
        await endPeriod(state.currentCycle.id);
        state.currentCycle = { ...state.currentCycle, period_end: localDateStr() };
      }
      renderHeader();
      renderCycleControls();
      renderTip();
      await renderChart();
    } catch (e) {
      console.error(e);
    } finally {
      btn.disabled = false;
    }
  };
}

// --- Who toggle ------------------------------------------------------------
function renderWhoToggle() {
  document.getElementById('who-toggle')?.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => switchPerson(btn.dataset.p));
    btn.classList.toggle('on', btn.dataset.p === state.cur);
  });
}

function switchPerson(p) {
  state.cur = p;
  document.body.dataset.cur = p;
  document.getElementById('who-toggle')?.querySelectorAll('button')
    .forEach(btn => btn.classList.toggle('on', btn.dataset.p === p));
  const logTitle = document.getElementById('log-title');
  if (logTitle) logTitle.textContent = `Aujourd'hui — ${p === 'elle' ? 'Elle' : 'Lui'}`;
  renderMetrics();
  renderInsight();
  const tip = document.getElementById('tip-card');
  if (tip) tip.style.display = p === 'lui' ? 'block' : 'none';
}

// --- Chart (vraies données) ------------------------------------------------
async function renderChart() {
  const cycleStart = state.currentCycle?.period_start;
  const totalDays  = CYCLE_LEN;
  const todayIdx   = state.cycleDay ? Math.min(state.cycleDay - 1, totalDays - 1) : null;

  let elleArr, luiArr;

  if (cycleStart && state.me?.user_id) {
    // Charger les énergies des deux en parallèle
    const myEnergyProm = getEnergyByCycleDay(state.me.user_id, cycleStart, totalDays);
    const partnerEnergyProm = state.partner
      ? getPartnerEnergyByCycleDay(state.partner.user_id, cycleStart, totalDays)
      : Promise.resolve(new Array(totalDays).fill(null));

    const [myEnergy, partnerEnergy] = await Promise.all([myEnergyProm, partnerEnergyProm]);

    const elleIsMe = state.me?.tracks_cycle;
    elleArr = interpolate(elleIsMe ? myEnergy : partnerEnergy);
    luiArr  = interpolate(elleIsMe ? partnerEnergy : myEnergy);
  } else {
    // Pas de cycle — courbe plate à 0.5
    elleArr = new Array(totalDays).fill(0.5);
    luiArr  = new Array(totalDays).fill(0.5);
  }

  drawChart(elleArr, luiArr, totalDays, todayIdx);
}

function drawChart(elleData, luiData, totalDays, todayIdx) {
  const svg = document.getElementById('chart');
  if (!svg) return;
  const W = 340, H = 148, PAD = 6;
  const xP = i => PAD + (i / (totalDays - 1)) * (W - PAD * 2);
  const yP = v => H - PAD - v * (H - PAD * 2 - 10) - 5;

  function smooth(d) {
    let p = `M ${xP(0)} ${yP(d[0])}`;
    for (let i = 0; i < d.length - 1; i++) {
      const cx = (xP(i) + xP(i + 1)) / 2;
      p += ` C ${cx} ${yP(d[i])}, ${cx} ${yP(d[i + 1])}, ${xP(i + 1)} ${yP(d[i + 1])}`;
    }
    return p;
  }

  let s = '';
  Object.entries(PHASES_DATA).forEach(([, data]) => {
    const [a, b] = data.range;
    const xa = xP(Math.min(a - 1, totalDays - 1));
    const xb = xP(Math.min(b - 1, totalDays - 1));
    s += `<rect x="${xa}" y="0" width="${Math.max(0, xb - xa)}" height="${H}" fill="${data.fill}"/>`;
  });

  if (todayIdx != null) {
    const tx = xP(todayIdx);
    s += `<line x1="${tx}" y1="4" x2="${tx}" y2="${H-4}" stroke="#E84375" stroke-width="1.5" stroke-dasharray="3 3" opacity=".4"/>`;
  }

  s += `<path d="${smooth(luiData)}"  fill="none" stroke="#4278C4" stroke-width="2"   opacity=".85"/>`;
  s += `<path d="${smooth(elleData)}" fill="none" stroke="#E84375" stroke-width="2.5"/>`;

  if (todayIdx != null) {
    s += `<circle cx="${xP(todayIdx)}" cy="${yP(elleData[todayIdx])}" r="4" fill="#E84375"/>`;
    s += `<circle cx="${xP(todayIdx)}" cy="${yP(luiData[todayIdx])}"  r="3.5" fill="#4278C4"/>`;
  }
  svg.innerHTML = s;
}

// --- Metrics ---------------------------------------------------------------

/**
 * Gère le clic sur une "chip" de métrique via délégation d'événement.
 * @param {MouseEvent} event
 */
async function handleMetricClick(event) {
  const chip = event.target.closest('.chip');
  if (!chip) return;

  const { id: metricId, v: value } = chip.dataset;
  const metric = METRICS[state.cur].find(m => m.id === metricId);
  if (!metric) return;

  // 1. Mettre à jour l'UI de manière optimiste
  chip.closest('.chips').querySelectorAll('.chip').forEach(c => c.classList.remove('sel'));
  chip.classList.add('sel');

  const face = faceFor(metric, value);
  const displayValue = face ? face.e
    : (metric.type === 'enum' || metric.type === 'boolean') ? (metric.opts[value] ?? value)
    : value;
  chip.closest('.metric').querySelector('.val').textContent = displayValue;

  // 2. Sauvegarder la donnée et mettre à jour l'état local
  await saveEntry(metricId, value);
  state.savedValues[metricId] = { v: value };

  // 3. Effet de bord : rafraîchir le graphique si l'énergie est modifiée
  if (metricId === 'energy') {
    await renderChart();
  }
}

/**
 * Retourne la chaîne de caractères à afficher pour une valeur de métrique.
 * @param {object} metric
 * @param {string|number|null} value
 * @returns {string}
 */
function getMetricDisplayValue(metric, value) {
  if (value == null) return '—';
  if (metric.faces) { const f = faceFor(metric, value); return f ? f.e : '—'; }
  if (metric.type === 'enum' || metric.type === 'boolean') return metric.opts[value] ?? value;
  if (metric.type === 'bbt')  return value ? `${value}°C` : '—';
  if (metric.type === 'text') return value ? String(value).slice(0, 22) + (String(value).length > 22 ? '…' : '') : '—';
  return value;
}

function getMetricChipsHTML(metric, savedValue) {
  if (metric.type === 'bbt') {
    return `<div class="bbt-input-wrap">
      <input type="number" class="bbt-input" data-id="${metric.id}"
        min="35.0" max="38.5" step="0.1" placeholder="36.5"
        value="${savedValue || ''}" aria-label="Température basale">
      <span class="bbt-unit">°C</span>
    </div>`;
  }
  if (metric.type === 'text') {
    return `<textarea class="note-input" data-id="${metric.id}"
      placeholder="Écris quelque chose…" rows="2">${savedValue || ''}</textarea>`;
  }
  const isSelected = (v) => String(savedValue) === String(v) ? ' sel' : '';
  const options = (metric.type === 'enum' || metric.type === 'boolean')
    ? metric.opts : Array.from({ length: 5 }, (_, i) => i + 1);
  return options.map((opt, i) => {
    const value = (metric.type === 'enum' || metric.type === 'boolean') ? i : opt;
    // Boutons ronds emoji + label (humeur / énergie)
    if (metric.faces) {
      const f = metric.faces[i] || { e: opt, l: '' };
      return `<button type="button" class="chip facechip${isSelected(value)}" data-id="${metric.id}" data-v="${value}">
        <span class="facechip-e">${f.e}</span><span class="facechip-l">${f.l}</span></button>`;
    }
    const chipClass = metric.type === 'scale' ? 'chip scalechip' : 'chip';
    return `<div class="${chipClass}${isSelected(value)}" data-id="${metric.id}" data-v="${value}">${opt}</div>`;
  }).join('');
}

function renderMetrics() {
  const wrap = document.getElementById('metrics');
  if (!wrap) return;

  wrap.innerHTML = METRICS[state.cur].map(metric => {
    const savedRaw   = state.savedValues[metric.id];
    const savedValue = savedRaw != null ? (savedRaw.v ?? savedRaw) : null;
    return `
      <div class="metric">
        <div class="ml">
          <span class="name">${metric.label}</span>
          <span class="val" id="val-${metric.id}">${getMetricDisplayValue(metric, savedValue)}</span>
        </div>
        <div class="chips">${getMetricChipsHTML(metric, savedValue)}</div>
      </div>`;
  }).join('');

  wrap.removeEventListener('click', handleMetricClick);
  wrap.addEventListener('click', handleMetricClick);

  // BBT — input number avec debounce
  wrap.querySelectorAll('.bbt-input').forEach(input => {
    let timer;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const val = parseFloat(input.value);
        if (isNaN(val) || val < 35 || val > 39) return;
        const id = input.dataset.id;
        document.getElementById(`val-${id}`).textContent = `${val.toFixed(1)}°C`;
        await saveEntry(id, String(val.toFixed(1)));
        state.savedValues[id] = { v: String(val.toFixed(1)) };
      }, 800);
    });
  });

  // Note libre — textarea avec debounce
  wrap.querySelectorAll('.note-input').forEach(ta => {
    let timer;
    ta.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const id  = ta.dataset.id;
        const val = ta.value.trim();
        document.getElementById(`val-${id}`).textContent = val
          ? val.slice(0, 22) + (val.length > 22 ? '…' : '') : '—';
        await saveEntry(id, val);
        state.savedValues[id] = { v: val };
      }, 900);
    });
  });
}

async function saveEntry(categoryId, value) {
  const { error } = await supabase.from('log_entries').upsert(
    { log_date: state.logDate, category_id: categoryId, value: { v: value }, shared: true },
    { onConflict: 'user_id,log_date,category_id' }
  );
  if (error) console.error('saveEntry:', error.message);
  else {
    showToast('Sauvegardé ✓');
    invalidateCache(`log-entries-${state.logDate}`); // invalide le cache du jour
    // Pas de reload complet ici : il reconstruirait #metrics (innerHTML) et
    // détruirait le textarea/BBT en cours de frappe (perte de focus), en plus
    // d'un re-fetch réseau à chaque tap de chip. Les mises à jour ciblées sont
    // déjà faites par les appelants (renderChart pour l'énergie, .val pour
    // note/BBT). Le reload reste réservé à init / realtime partenaire / copie d'hier.
  }
}

// --- Insight ---------------------------------------------------------------
function renderInsight() {
  const body = document.getElementById('insight-body');
  const meta = document.getElementById('insight-meta');
  if (!body) return;
  const phase = state.phaseName || 'Lutéale';
  const insightData = PHASES_DATA[phase]?.insight;

  if (insightData) {
    body.innerHTML = insightData[state.cur] || '';
  }
  if (meta && state.prediction) {
    meta.textContent = `Basé sur ${state.prediction.cyclesUsed} cycles · cycle moyen ${state.prediction.avgCycleLength} j`;
  }
}

function renderTip() {
  const card = document.getElementById('tip-card');
  const txt  = document.getElementById('tip-text');
  if (!card) return;
  card.style.display = state.cur === 'lui' ? 'block' : 'none';
  if (txt) txt.textContent = PHASES_DATA[state.phaseName || 'Lutéale']?.tip || '';
}

// --- Prédiction ------------------------------------------------------------
function renderPrediction() {
  const card = document.getElementById('prediction-card');
  if (!card) return;

  // Mode grossesse : pas de prédiction de règles
  if (getCycleMode() === 'pregnancy') {
    card.style.display = 'none';
    return;
  }

  const p = state.prediction;
  const history = p?.cyclesUsed;

  if (!p || !history || history < 2) {
    card.style.display = 'none';
    return;
  }

  card.style.display = 'block';
  const nextDate = new Date(p.nextPeriodDate);
  const oDate    = new Date(p.ovulationDate);
  const today    = new Date();
  const daysUntil = Math.round((nextDate - today) / 864e5);

  const fmt = d => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  document.getElementById('pred-next').textContent =
    daysUntil > 0 ? `dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}` :
    daysUntil === 0 ? "aujourd'hui" : `il y a ${-daysUntil} j`;
  const margin = p.stdDev >= 1 ? ` ± ${Math.round(p.stdDev)} j` : '';
  document.getElementById('pred-next-date').textContent = fmt(nextDate) + margin;
  document.getElementById('pred-ovulation').textContent = fmt(oDate);
  document.getElementById('pred-avg').textContent =
    `${p.avgCycleLength} j${p.cyclesUsed >= 4 ? (p.regular ? ' · régulier' : ' · irrégulier') : ''}`;
}

// --- Toast in-app ----------------------------------------------------------
// showToast est fourni par ui-feedback.js (import en tête de fichier).

// --- Events ----------------------------------------------------------------
const REACTION_EMOJIS = ['❤️', '✨', '😊', '💪'];

async function renderEvents() {
  const wrap = document.getElementById('events-list');
  if (!wrap || !state.coupleId) return;

  const { data } = await supabase
    .from('couple_events')
    .select('*')
    .eq('couple_id', state.coupleId)
    .order('event_date', { ascending: false })
    .limit(7);

  wrap.innerHTML = '';

  if (!data?.length) {
    wrap.innerHTML = `<div class="empty-state-inline">
      <div class="es-icon">🌸</div>
      <p>Aucun moment noté ensemble.<br>Commencez par en ajouter un !</p>
    </div>`;
  } else {
    data.forEach(ev => {
      const diff = Math.round((Date.now() - new Date(ev.event_date)) / 864e5);
      const when = diff === 0 ? "Aujourd'hui" : diff === 1 ? 'Hier' : `Il y a ${diff} jours`;
      const reactions = ev.reactions || {};
      const myReaction = reactions[state.me?.user_id];
      const allReactions = Object.values(reactions);
      const reactionSummary = [...new Set(allReactions)].map(e => {
        const count = allReactions.filter(x => x === e).length;
        return `<span class="ev-reaction${e === myReaction ? ' mine' : ''}">${e}${count > 1 ? ` ${count}` : ''}</span>`;
      }).join('');

      const eventInfo = EVENT_TYPES[ev.event_type] || EVENT_TYPES.other;
      const div = document.createElement('div');
      div.className = 'ev';
      div.dataset.id = ev.id;
      div.innerHTML = `
        <div class="ico">${eventInfo.icon}</div>
        <div class="ev-body">
          <div class="et">${ev.note || eventInfo.label}</div>
          <div class="ed">${when}</div>
          ${reactionSummary ? `<div class="ev-reactions">${reactionSummary}</div>` : ''}
        </div>
        <div class="ev-actions">
          <button type="button" class="ev-react-btn" data-id="${ev.id}" aria-label="Réagir">${myReaction || '🫶'}</button>
          <button type="button" class="ev-delete-btn" data-id="${ev.id}" aria-label="Supprimer">×</button>
        </div>`;
      wrap.appendChild(div);
    });
  }

  // Listeners réactions + suppression
  wrap.querySelectorAll('.ev-react-btn').forEach(btn => {
    btn.addEventListener('click', () => openReactionPicker(btn.dataset.id, btn));
  });
  wrap.querySelectorAll('.ev-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: 'Supprimer ce moment ?',
        message: 'Il disparaîtra de votre journal partagé.',
        confirmLabel: 'Supprimer',
        danger: true,
      });
      if (!ok) return;
      try {
        const { error } = await supabase.from('couple_events').delete().eq('id', btn.dataset.id);
        if (error) throw error;
        await renderEvents();
      } catch (e) {
        showToast(friendlyError(e), 'error');
      }
    });
  });

  document.getElementById('btn-addev')?.addEventListener('click', openEventSheet);
}

function openReactionPicker(eventId, anchorBtn) {
  // Fermer tout picker existant
  document.querySelectorAll('.reaction-picker').forEach(p => p.remove());

  const picker = document.createElement('div');
  picker.className = 'reaction-picker';
  picker.innerHTML = REACTION_EMOJIS.map(e =>
    `<button class="reaction-opt" data-emoji="${e}">${e}</button>`
  ).join('');
  anchorBtn.insertAdjacentElement('afterend', picker);

  picker.querySelectorAll('.reaction-opt').forEach(btn => {
    btn.addEventListener('click', async () => {
      picker.remove();
      await likeEvent(eventId, btn.dataset.emoji);
    });
  });

  // Fermer au clic extérieur
  const close = e => { if (!picker.contains(e.target) && e.target !== anchorBtn) { picker.remove(); document.removeEventListener('click', close, true); } };
  setTimeout(() => document.addEventListener('click', close, true), 10);
}

async function likeEvent(eventId, emoji) {
  const userId = state.me?.user_id;
  if (!userId) return;

  // Lire la réaction actuelle
  const { data: ev } = await supabase
    .from('couple_events').select('reactions').eq('id', eventId).single();
  const current = ev?.reactions || {};

  // Toggle : même emoji → retirer, sinon → mettre le nouveau
  const newReactions = { ...current };
  if (current[userId] === emoji) {
    delete newReactions[userId];
  } else {
    newReactions[userId] = emoji;
  }

  await supabase.from('couple_events')
    .update({ reactions: newReactions }).eq('id', eventId);
  // Le realtime channel va déclencher renderEvents()
}

function openEventSheet() {
  const sheet = document.getElementById('event-sheet');
  if (!sheet) return;
  sheet.classList.add('open');
  document.getElementById('event-note').value = '';
  document.querySelectorAll('.ev-type-btn').forEach(b => b.classList.remove('sel'));

  document.getElementById('btn-sheet-cancel')?.addEventListener('click', closeEventSheet, { once: true });
  document.getElementById('btn-sheet-save')?.addEventListener('click', saveEvent, { once: true });
  document.querySelectorAll('.ev-type-btn').forEach(b =>
    b.addEventListener('click', () => {
      document.querySelectorAll('.ev-type-btn').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
    })
  );
}

function closeEventSheet() {
  document.getElementById('event-sheet')?.classList.remove('open');
}

async function saveEvent() {
  const typeBtn = document.querySelector('.ev-type-btn.sel');
  const type = typeBtn?.dataset.type || 'other';
  const note = document.getElementById('event-note')?.value.trim() || null;
  const today = localDateStr();
  await supabase.from('couple_events').insert({
    couple_id: state.coupleId, event_date: today, event_type: type, note,
    created_by: state.me?.user_id,
    reactions: {},
  });
  closeEventSheet();
  await renderEvents();
}
