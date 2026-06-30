/**
 * intimacy.js — Orchestrateur du module Intime.
 * Délègue toute la logique aux sous-modules :
 *   intimacy-sessions.js  → sessions, formulaires, fast-track
 *   intimacy-stats.js     → heatmap, courbe, désir, débrief, équité
 *   intimacy-library.js   → bibliothèque de positions
 *   position-suggestions.js → moteur de suggestions
 *   kinks.js              → kinks, wish-list, limites
 *   pin-lock.js           → verrouillage PIN
 */
import { supabase } from './supabase.js';
import { getMyMembership, getPartnerMembership } from './pairing.js';
import { localDateStr, fmtDate, diffDays, daysAgo } from './date-utils.js';
import { renderRecentSessions, openFullSessionSheet, openFastTrack, initSessionSheetListeners, prepareNewSession } from './intimacy-sessions.js';
import { initIntimacyCalendar } from './intimacy-calendar.js';
import { loadRatingData, rankSuggestions } from './position-suggestions.js';
import { renderPositionInsights } from './position-insights.js';
import {
  renderDesireWindow, renderSouvenirDuJour, renderDebriefPostDispute,
  renderEquitePlaisir, renderMonthlyHeatmap, renderSatisfactionCurve,
  renderOrgasmByPhase, renderHealthAlerts,
} from './intimacy-stats.js';
import { renderLibidoParPhase } from './kinks.js';
import { renderLibrary, getSuggestions, getDateNightIdeas, PHASES_LABELS, POSITIONS, posThumb } from './intimacy-library.js';
import { DailyLog } from './cycle-model.js';
import { hasPIN, isLocked, showLockScreen, initQuickHide, initPINSettings } from './pin-lock.js';
import { notifyLibidosAligned } from './notifications.js';
import { cachedQuery, invalidateCache } from './query-cache.js';
import { initCollapsibles } from './collapse.js';
import { toast, confirmDialog, formDialog, friendlyError } from './ui-feedback.js';

// Variable pour garder une référence au listener et pouvoir le supprimer
let handleSessionSaved;

function initSubNav(initialSection = 'journal') {
  const nav = document.getElementById('intime-sub-nav');
  if (!nav) return;

  const navButtons = Array.from(nav.querySelectorAll('.sub-nav-btn'));
  const validSections = navButtons.map(b => b.dataset.section);
  let currentSectionId = initialSection;

  function activateSection(newSectionId) {
    if (!validSections.includes(newSectionId)) newSectionId = 'journal';
    if (newSectionId === currentSectionId) return;

    const oldSection = document.getElementById(`intime-section-${currentSectionId}`);
    const newSection = document.getElementById(`intime-section-${newSectionId}`);
    if (!oldSection || !newSection) return;

    navButtons.forEach(b => {
      const isOn = b.dataset.section === newSectionId;
      b.classList.toggle('on', isOn);
      b.setAttribute('aria-pressed', String(isOn));
    });

    // Bascule synchrone (ne dépend PAS de animationend : les keyframes peuvent
    // être absentes ou désactivées en prefers-reduced-motion). Le fondu est purement
    // cosmétique et n'interrompt jamais le changement de section.
    oldSection.hidden = true;
    newSection.hidden = false;
    newSection.classList.remove('anim-in');
    void newSection.offsetWidth;
    newSection.classList.add('anim-in');

    const newHash = `#/intime/${newSectionId}`;
    if (window.location.hash !== newHash) history.replaceState(null, '', newHash);
    currentSectionId = newSectionId;
  }

  nav.addEventListener('click', (e) => {
    const btn = e.target.closest('.sub-nav-btn');
    if (btn) activateSection(btn.dataset.section);
  });

  // Activer la section initiale au chargement de la vue
  document.querySelectorAll('.intime-section').forEach(s => {
    s.hidden = s.id !== `intime-section-${initialSection}`;
  });
  navButtons.forEach(b => {
    const isOn = b.dataset.section === initialSection;
    b.classList.toggle('on', isOn);
    b.setAttribute('aria-pressed', String(isOn));
  });
  currentSectionId = initialSection;
}

export let st = { me: null, partner: null, coupleId: null };

// ─── Init principal ────────────────────────────────────────────────────────

export async function initIntimacy(params = {}) { // This function is now much cleaner
  // Vérifier le verrou PIN avant tout
  if (hasPIN() && isLocked()) {
    showLockScreen(() => initIntimacy());
    return;
  }

  try {
    st.me = await getMyMembership();
    if (!st.me) return;
    st.coupleId = st.me.couple_id;
    st.partner  = await getPartnerMembership(st.coupleId);
  } catch (e) {
    document.getElementById('intime-error')?.style && (document.getElementById('intime-error').style.display = 'block');
    console.error('initIntimacy:', e.message);
    return;
  }

  document.getElementById('today-date-intime').textContent =
    new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  // Tout en parallèle
  await renderMainSections(st);
  await renderStatsSection(st);

  // §4 — notification libidos alignées (si opt-in)
  notifyLibidosAligned();

  // Calendrier intime (suivi mensuel de la sexualité)
  initIntimacyCalendar(st, (date, mode = 'couple') => {
    prepareNewSession();
    openFullSessionSheet(st);
    const dateEl = document.getElementById('session-date-input');
    if (dateEl) dateEl.value = date;
    // Pré-régler couple/solo selon le bouton cliqué dans le détail du jour.
    const soloEl = document.getElementById('session-solo');
    if (soloEl) { soloEl.checked = mode === 'solo'; soloEl.dispatchEvent(new Event('change')); }
  });

  // Bibliothèque
  renderLibrarySection();

  // Interactions
  initSubNav(params.section);
  // Accordéons de la vue Intime
  initCollapsibles(document.getElementById('view'));

  initQuickAdd();
  initSessionSheetListeners();
  initDarkModeToggle();
  initVoiceInput();
  initKinkSliderGradients();
  initSwipeNav();
  initQuickHide();
  initPINSettings();
  initHealthAdd();
  initFirstTimesSection();

  // Rafraîchissement silencieux des stats quand une séance est enregistrée/supprimée
  // (aligné sur le calendrier et position-insights, qui écoutent le même event sans toast).
  handleSessionSaved = () => {
    renderStatsSection(st).catch(err => console.warn('[intimacy] refresh stats:', err?.message || err));
  };
  document.addEventListener('nc:session-saved', handleSessionSaved);
}

/**
 * Charge et rend les sections principales (Journal, Désirs, Cadre).
 */
async function renderMainSections(st) {
  await Promise.all([
    renderDesireWindow(st),
    renderRecentSessions(st),
    renderMatchCount(),
    renderSouvenirDuJour(st.coupleId),
    renderDebriefPostDispute(st.coupleId, st.partner?.display_name),
    renderLastHealthEntry(),
    renderHardLimits(),
    renderSafewords(),
    renderAftercare(),
    renderChallenges(),
    renderSuggestions(),
  ]);

  // La section "Premières fois" a maintenant sa propre logique d'interaction
  renderFirstTimes();
}

/**
 * Charge toutes les données pour la section Stats et appelle les fonctions de rendu.
 */
let _statsRaw = null;      // données brutes (90 j) conservées pour le filtre
let _statsCtx = null;      // { st, elleId, luiId }

async function renderStatsSection(st) {
  const elleId = st.me?.tracks_cycle ? st.me.user_id : st.partner?.user_id;
  if (!elleId) return;
  const luiId = st.me?.tracks_cycle ? st.partner?.user_id : st.me?.user_id;

  const since = daysAgo(90);
  const [sessionsRes, cyclesRes, feedbackRes, ratingsRes, entriesRes] = await Promise.all([
    supabase.from('intimate_sessions').select('id, session_date, duration_min, mood, created_by, details, session_activities(tags)').eq('couple_id', st.coupleId).gte('session_date', since).order('session_date', { ascending: false }),
    supabase.from('cycles').select('period_start').order('period_start', { ascending: false }).limit(6),
    supabase.from('session_feedback').select('session_id, user_id, satisfaction, orgasms, shared, improve_txt, created_at').gte('created_at', since + 'T00:00:00Z'),
    supabase.from('position_ratings').select('position_id, score, pain, too_deep, rated_on, created_by').eq('couple_id', st.coupleId).gte('rated_on', since),
    supabase.from('log_entries').select('log_date, value').eq('user_id', elleId).eq('category_id', 'journal').gte('log_date', since),
  ]);

  _statsRaw = {
    sessions: sessionsRes.data || [],
    cycles: cyclesRes.data || [],
    feedbacks: feedbackRes.data || [],
    ratings: ratingsRes.data || [],
    entries: entriesRes.data || [],
  };
  _statsCtx = { st, elleId, luiId };

  // Filtre Les deux / Elle / Lui (lié une fois — boutons recréés à chaque montage de vue)
  document.querySelectorAll('#stats-filter .cal-filter-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('#stats-filter .cal-filter-btn').forEach(b => b.classList.toggle('on', b === btn));
      renderStatsView(btn.dataset.filter);
    };
  });

  renderStatsView('both');
}

// Filtre les sessions/feedbacks/notes selon la personne (à deux = compte pour les deux).
function filterStatsData(raw, filter, elleId, luiId) {
  if (filter === 'both') return raw;
  const who = filter === 'elle' ? elleId : luiId;
  const sessions = raw.sessions.filter(s => {
    const solo = (s.session_activities || []).flatMap(a => a.tags || []).includes('solo');
    return !solo || s.created_by === who;
  });
  const ids = new Set(sessions.map(s => s.id));
  return {
    ...raw,
    sessions,
    feedbacks: raw.feedbacks.filter(f => f.user_id === who && ids.has(f.session_id)),
    ratings: raw.ratings.filter(r => r.created_by === who),
  };
}

function renderStatsView(filter) {
  if (!_statsRaw || !_statsCtx) return;
  const { st, elleId, luiId } = _statsCtx;
  const data = filterStatsData(_statsRaw, filter, elleId, luiId);

  renderFrequencyTrend(data.sessions);
  renderPracticesInsights(data.sessions);
  renderMonthlyHeatmap(st.coupleId, elleId, data);
  renderSatisfactionCurve(st.me?.user_id, data);
  renderOrgasmByPhase(st, data);
  renderEquitePlaisir(st, data.feedbacks.filter(f => f.shared));
  renderPositionInsights('position-insights', data);
  renderCycleXIntimite(data);
  renderActivityByPhase(data.sessions, data.cycles);
  renderLibidoParPhase(elleId, data);
  renderHealthAlerts(st.me?.user_id, data.feedbacks);
}

// #4 — Fréquence des moments par phase du cycle.
const PHASE_RANGES = [
  ['menstruelle', 'Règles', 1, 5], ['folliculaire', 'Folliculaire', 6, 13],
  ['ovulation', 'Ovulation', 14, 16], ['luteale', 'Lutéale', 17, 35],
];
function renderActivityByPhase(sessions, cycles) {
  const el = document.getElementById('activity-by-phase');
  if (!el) return;
  if (!sessions?.length || !cycles?.length) {
    el.innerHTML = '<p class="intime-empty">Quelques cycles de plus pour ce croisement.</p>';
    return;
  }
  const counts = { menstruelle: 0, folliculaire: 0, ovulation: 0, luteale: 0 };
  let total = 0;
  for (const s of sessions) {
    const cycle = cycles.find(c => c.period_start <= s.session_date);
    if (!cycle) continue;
    const day = diffDays(s.session_date, cycle.period_start) + 1;
    const ph = PHASE_RANGES.find(([, , lo, hi]) => day >= lo && day <= hi);
    if (ph) { counts[ph[0]]++; total++; }
  }
  if (!total) { el.innerHTML = '<p class="intime-empty">Pas assez de données.</p>'; return; }
  const max = Math.max(...Object.values(counts), 1);
  const top = PHASE_RANGES.map(([id, label]) => [label, counts[id]]).sort((a, b) => b[1] - a[1])[0];
  el.innerHTML = PHASE_RANGES.map(([id, label]) => {
    const c = counts[id];
    return `<div class="phase-act-row">
      <span class="phase-act-label">${label}</span>
      <span class="phase-act-bar-wrap"><span class="phase-act-bar" style="width:${Math.round(c / max * 100)}%"></span></span>
      <span class="phase-act-val">${c}</span>
    </div>`;
  }).join('') + `<div class="freq-meta">Plus actifs en phase ${top[0].toLowerCase()}.</div>`;
}

// #3 — Hall of fame des pratiques + suggestions d'exploration.
const PRACTICES_CATALOG = [
  ['vaginal', '💞 Vaginal'], ['fellation', '💋 Fellation'], ['cunnilingus', '👅 Cunnilingus'],
  ['doigtage', '✌️ Doigtage'], ['masturbation_manuelle', '🤚 Mast. manuelle'], ['anal', '🍑 Anal'],
  ['creampie', '💧 Creampie'], ['bdsm', '⛓️ BDSM'], ['jouet', '🎯 Jouet'],
  ['masturbation', '✨ Masturbation'], ['oral', '👄 Oral'],
];
function renderPracticesInsights(sessions) {
  const el = document.getElementById('practices-insights');
  if (!el) return;
  const counts = {};
  for (const s of (sessions || [])) {
    const d = s.details || {};
    [...(d.practices_performed || []), ...(d.practices_received || [])].forEach(p => { counts[p] = (counts[p] || 0) + 1; });
  }
  const used = PRACTICES_CATALOG.filter(([id]) => counts[id]).sort((a, b) => counts[b[0]] - counts[a[0]]);
  const never = PRACTICES_CATALOG.filter(([id]) => !counts[id]);
  if (!used.length) {
    el.innerHTML = '<p class="intime-empty">Renseigne les pratiques dans un moment pour voir vos préférées et des idées à explorer.</p>';
    return;
  }
  el.innerHTML = `
    <div class="pi-block">
      <div class="pi-title">⭐ Vos pratiques</div>
      ${used.slice(0, 6).map(([id, label]) => `<div class="pi-row">
        <span class="pi-name">${label}</span><span class="pi-sub">${counts[id]}×</span>
      </div>`).join('')}
    </div>
    ${never.length ? `<div class="pi-block">
      <div class="pi-title">🌱 À explorer</div>
      <div class="intime-cal-tags">${never.slice(0, 8).map(([, label]) => `<span class="intime-tag">${label}</span>`).join('')}</div>
    </div>` : ''}`;
}

// #2 — Fréquence des moments sur 12 semaines + tendance.
function renderFrequencyTrend(sessions) {
  const el = document.getElementById('frequency-trend');
  if (!el) return;
  const WEEKS = 12;
  const now = Date.now();
  const buckets = new Array(WEEKS).fill(0);
  for (const s of (sessions || [])) {
    if (!s.session_date) continue;
    const wk = Math.floor((now - new Date(s.session_date + 'T12:00:00').getTime()) / (7 * 864e5));
    if (wk >= 0 && wk < WEEKS) buckets[WEEKS - 1 - wk]++; // ancien à gauche, récent à droite
  }
  const total = buckets.reduce((a, b) => a + b, 0);
  if (!total) { el.innerHTML = '<p class="intime-empty">Pas encore de moments sur la période.</p>'; return; }
  const max = Math.max(1, ...buckets);
  const recent = buckets.slice(-4).reduce((a, b) => a + b, 0);
  const prev = buckets.slice(-8, -4).reduce((a, b) => a + b, 0);
  const trend = recent > prev ? '↗ en hausse' : recent < prev ? '↘ en baisse' : '→ stable';
  el.innerHTML = `
    <div class="freq-bars" aria-hidden="true">${buckets.map(b =>
      `<div class="freq-bar" style="height:${Math.max(6, Math.round(b / max * 100))}%${b ? '' : ';opacity:.3'}" title="${b}"></div>`).join('')}</div>
    <div class="freq-meta">${total} moment${total > 1 ? 's' : ''} · ${trend}</div>`;
}

// ─── Quick add ─────────────────────────────────────────────────────────────

function initQuickAdd() {
  document.getElementById('btn-add-couple-moment')?.addEventListener('click', () => {
    prepareNewSession();
    openFullSessionSheet(st);
    const soloEl = document.getElementById('session-solo');
    if (soloEl) {
      soloEl.checked = false;
      // Trigger event listener manually to update classes
      soloEl.dispatchEvent(new Event('change'));
    }
  });

  document.getElementById('btn-add-solo-moment')?.addEventListener('click', () => {
    prepareNewSession();
    openFullSessionSheet(st);
    const soloEl = document.getElementById('session-solo');
    if (soloEl) {
      soloEl.checked = true;
      // Trigger event listener manually to update classes
      soloEl.dispatchEvent(new Event('change'));
    }
  });
}

// ─── Matchs kinks ──────────────────────────────────────────────────────────

async function renderMatchCount() {
  const el = document.getElementById('kink-match-count');
  if (!el || !st.partner) return;
  try {
    const [mine, theirs] = await Promise.all([
      supabase.from('kink_ratings').select('kink_id').eq('user_id', st.me?.user_id).eq('shared', true),
      supabase.from('kink_ratings').select('kink_id').eq('shared', true),
    ]);
    const mySet   = new Set((mine.data || []).map(r => r.kink_id));
    const matchIds = (theirs.data || []).filter(r => mySet.has(r.kink_id));
    const n = new Set(matchIds.map(r => r.kink_id)).size;
    el.textContent = `${n} désir${n > 1 ? 's' : ''} en commun`;
  } catch (e) { el.textContent = '—'; }
}

// ─── Croisement cycle × intimité ───────────────────────────────────────────

function renderCycleXIntimite({ sessions, cycles, feedbacks }) {
  const el = document.getElementById('cycle-x-intimite');
  if (!el) return;
  try {
    const fbMap     = Object.fromEntries(feedbacks.map(f => [f.session_id, f.satisfaction]));

    if (!sessions.length || !cycles.length || !feedbacks.length) {
      el.innerHTML = '<p class="intime-empty">Quelques cycles et feedbacks de plus pour voir ce croisement.</p>';
      return;
    }

    const PHASES = [
      { id:'menstruelle',  label:'Menstruelle',  range:[1,5],   color:'#E53935' },
      { id:'folliculaire', label:'Folliculaire',  range:[6,13],  color:'#4278C4' },
      { id:'ovulation',    label:'Ovulation',     range:[14,16], color:'#7C5CFC' },
      { id:'luteale',      label:'Lutéale',       range:[17,35], color:'#E84375' },
    ];

    const byPhase = {};
    PHASES.forEach(p => { byPhase[p.id] = []; });

    sessions.forEach(s => {
      const sat = fbMap[s.id];
      if (sat == null) return;
      const cycle = cycles.find(c => c.period_start <= s.session_date);
      if (!cycle) return;
      const day   = diffDays(s.session_date, cycle.period_start) + 1;
      const phase = PHASES.find(p => day >= p.range[0] && day <= p.range[1]);
      if (phase) byPhase[phase.id].push(sat);
    });

    const maxAvg = Math.max(...PHASES.map(p => byPhase[p.id].length ? byPhase[p.id].reduce((a,b)=>a+b)/byPhase[p.id].length : 0), 1);

    el.innerHTML = PHASES.map(phase => {
      const arr = byPhase[phase.id];
      if (!arr.length) return `<div class="phase-sat-row"><span class="phase-sat-label">${phase.label}</span><span style="color:var(--faint);font-size:12px">—</span></div>`;
      const avg = arr.reduce((a,b)=>a+b)/arr.length;
      const pct = (avg / maxAvg * 100).toFixed(0);
      return `<div class="phase-sat-row">
        <span class="phase-sat-label">${phase.label}</span>
        <div class="phase-sat-bar-wrap"><div class="phase-sat-bar" style="width:${pct}%;background:${phase.color}"></div></div>
        <span class="phase-sat-val">${avg.toFixed(1)}/10</span>
      </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = '<div class="msg error">Impossible de charger le croisement cycle × intimité.</div>';
    console.error('renderCycleXIntimite:', e.message);
  }
}

// ─── Bibliothèque de positions ─────────────────────────────────────────────

// §4 — filtre phase actuelle automatique
const PHASE_FROM_DAY = (day) => {
  if (day <=  5) return 'menstruelle';
  if (day <= 13) return 'folliculaire';
  if (day <= 16) return 'ovulation';
  return 'luteale';
};
const PHASE_LABEL = {
  menstruelle: 'Menstruelle', folliculaire: 'Folliculaire',
  ovulation: 'Ovulation',    luteale: 'Lutéale',
};

async function togglePositionLog(pos, loggedTodaySet) {
  if (!st.me) return;
  const today = localDateStr();
  try {
    const { data } = await supabase.from('log_entries')
      .select('*').eq('user_id', st.me.user_id).eq('log_date', today).eq('category_id', 'journal').maybeSingle();
    const log = data ? DailyLog.fromDB(data) : new DailyLog({ date: today, userId: st.me.user_id });
    if (!Array.isArray(log.positionsPersonnalisees)) log.positionsPersonnalisees = [];

    const isLogged = log.positionsPersonnalisees.includes(pos.label);
    if (isLogged) {
      log.positionsPersonnalisees = log.positionsPersonnalisees.filter(p => p !== pos.label);
      loggedTodaySet.delete(pos.label);
      toast(`« ${pos.label} » retirée ✓`);
    } else {
      log.positionsPersonnalisees.push(pos.label);
      loggedTodaySet.add(pos.label);
      toast(`« ${pos.label} » ajoutée à aujourd'hui ✓`);
    }

    const { error } = await supabase.from('log_entries').upsert(
      { ...log.toDBEntry(), user_id: st.me.user_id },
      { onConflict: 'user_id,log_date,category_id' }
    );
    if (error) throw error;
    invalidateCache('log_entries');

    const logBtn = document.getElementById('btn-toggle-pos-log');
    if (logBtn) {
      const nowLogged = loggedTodaySet.has(pos.label);
      logBtn.textContent = nowLogged ? "Retirer de la saisie d'aujourd'hui" : "Noter pour aujourd'hui";
      logBtn.className = nowLogged ? 'btn-secondary' : 'btn-primary';
    }

    const cards = document.querySelectorAll(`.pos-card[data-id="${pos.id}"]`);
    cards.forEach(card => {
      card.classList.toggle('pos-card--logged', loggedTodaySet.has(pos.label));
    });
  } catch (e) {
    toast(friendlyError(e), 'error');
  }
}

function showPositionDetails(posId, loggedTodaySet) {
  const pos = POSITIONS.find(p => p.id === posId);
  if (!pos) return;

  const intensityMap = { 1: '🌸 Doux', 2: '✨ Modéré', 3: '🔥 Intense' };
  const comfortMap = { 1: '🛋️ Confortable', 2: '⚡ Moyen', 3: '💪 Exigeant' };
  const phaseTranslations = {
    menstruelle: '🌸 Menstruelle',
    folliculaire: '⚡ Folliculaire',
    ovulation: '🔥 Ovulation',
    luteale: '✨ Lutéale'
  };

  const isLogged = loggedTodaySet.has(pos.label);

  const detailContent = document.getElementById('pos-detail-content');
  if (detailContent) {
    detailContent.innerHTML = `
      <div class="pos-detail-svg">${posThumb(pos)}</div>
      <h4>${escapeHtml(pos.label)}</h4>
      <p class="desc">${escapeHtml(pos.desc)}</p>
      <div class="pos-detail-tags">
        <span class="pos-detail-tag">${intensityMap[pos.intensity] || 'Intensité : ' + pos.intensity}</span>
        <span class="pos-detail-tag">${comfortMap[pos.comfort] || 'Confort : ' + pos.comfort}</span>
        ${(pos.phases || []).map(ph => `<span class="pos-detail-tag highlight">${phaseTranslations[ph] || ph}</span>`).join('')}
      </div>
    `;
  }

  const logBtn = document.getElementById('btn-toggle-pos-log');
  if (logBtn) {
    logBtn.textContent = isLogged ? "Retirer de la saisie d'aujourd'hui" : "Noter pour aujourd'hui";
    logBtn.className = isLogged ? 'btn-secondary' : 'btn-primary';
    logBtn.onclick = async () => {
      await togglePositionLog(pos, loggedTodaySet);
    };
  }

  // Navigation entre cartes : on suit l'ordre exact affiché dans la grille filtrée.
  const grid  = document.getElementById('library-grid');
  const order = grid ? [...grid.querySelectorAll('.pos-card')].map(c => c.dataset.id) : [];
  const idx   = order.indexOf(posId);
  const counter = document.getElementById('pos-detail-counter');
  const prevBtn = document.getElementById('btn-pos-prev');
  const nextBtn = document.getElementById('btn-pos-next');
  if (counter) counter.textContent = order.length ? `${idx + 1} / ${order.length}` : '';
  const goTo = (delta) => {
    if (!order.length) return;
    const nextId = order[(idx + delta + order.length) % order.length];
    showPositionDetails(nextId, loggedTodaySet);
  };
  if (prevBtn) { prevBtn.disabled = order.length < 2; prevBtn.onclick = () => goTo(-1); }
  if (nextBtn) { nextBtn.disabled = order.length < 2; nextBtn.onclick = () => goTo(1); }

  const sheet = document.getElementById('position-detail-sheet');
  if (sheet) {
    sheet.classList.add('open');
    sheet.removeAttribute('aria-hidden');

    const closeSheet = () => {
      sheet.classList.remove('open');
      sheet.setAttribute('aria-hidden', 'true');
      document.removeEventListener('keydown', onKey);
    };
    // Flèches clavier ← / → pour naviguer, Échap pour fermer.
    const onKey = (e) => {
      if (e.key === 'ArrowLeft')  goTo(-1);
      else if (e.key === 'ArrowRight') goTo(1);
      else if (e.key === 'Escape') closeSheet();
    };
    document.addEventListener('keydown', onKey);

    // Swipe horizontal (mobile) pour passer d'une position à l'autre.
    const panel = sheet.querySelector('.sheet');
    if (panel && !panel._posSwipeBound) {
      panel._posSwipeBound = true;
      let x0 = null;
      panel.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
      panel.addEventListener('touchend', (e) => {
        if (x0 === null) return;
        const dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 60) (panel._posGoTo || (() => {}))(dx < 0 ? 1 : -1);
        x0 = null;
      }, { passive: true });
    }
    if (panel) panel._posGoTo = goTo;

    document.getElementById('btn-close-pos-detail').onclick = closeSheet;
    document.getElementById('btn-close-pos-sheet').onclick = closeSheet;
    sheet.onclick = (e) => { if (e.target === sheet) closeSheet(); };
  }
}

async function renderLibrarySection() {
  const grid = document.getElementById('library-grid');
  if (!grid) return;

  let loggedToday = new Set();

  function collectFilters(phase) {
    const intensity = document.getElementById('filter-intensity')?.value;
    const comfort   = document.getElementById('filter-comfort')?.value;
    const category  = document.getElementById('filter-category')?.value;
    return {
      phase:     phase || undefined,
      intensity: intensity ? parseInt(intensity) : undefined,
      comfort:   comfort   ? parseInt(comfort)   : undefined,
      category:  category  || undefined,
    };
  }

  function applyFilters() {
    const phaseBtnWrap = document.getElementById('library-phase-filter');
    const activePhase = phaseBtnWrap?.querySelector('.phase-filter-pill.active')?.dataset.phase;
    const filters = collectFilters(activePhase || undefined);
    renderLibrary(grid, filters, loggedToday);
  }

  // Cliquer une position ouvre la fiche de détails (délégation, liée une fois).
  if (!grid._posLoggerBound) {
    grid._posLoggerBound = true;
    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.pos-card');
      if (card?.dataset.id) showPositionDetails(card.dataset.id, loggedToday);
    });
    grid.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.pos-card');
      if (card?.dataset.id) { e.preventDefault(); showPositionDetails(card.dataset.id, loggedToday); }
    });
  }

  // Fetch logged positions for today to apply the 'logged' style
  try {
    const { data } = await supabase.from('log_entries')
      .select('value').eq('user_id', st.me.user_id).eq('log_date', localDateStr()).eq('category_id', 'journal').maybeSingle();
    loggedToday = new Set(data?.value?.positionsPersonnalisees || []);
  } catch(e) {
    console.error("Failed to fetch today's logged positions", e);
    loggedToday = new Set();
  }

  // Détecter la phase courante pour pré-filtrer
  let currentPhase = null;
  try {
    const { data: cycle } = await supabase
      .from('cycles').select('period_start')
      .order('period_start', { ascending: false }).limit(1).maybeSingle();
    if (cycle?.period_start) {
      const day = diffDays(localDateStr(), cycle.period_start) + 1;
      currentPhase = PHASE_FROM_DAY(day);
    }
  } catch (_) { /* pas de cycle → pas de filtre auto */ }

  // Bouton "Phase actuelle" au-dessus des filtres
  const phaseBtnWrap = document.getElementById('library-phase-filter');
  if (phaseBtnWrap && currentPhase) {
    phaseBtnWrap.innerHTML = `
      <button type="button" class="phase-filter-pill active" data-phase="${currentPhase}"
        aria-pressed="true" aria-label="Filtrer pour la phase ${PHASE_LABEL[currentPhase]}">
        ✨ Phase ${PHASE_LABEL[currentPhase]} · maintenant
      </button>
      <button type="button" class="phase-filter-pill" data-phase=""
        aria-pressed="false" aria-label="Afficher toutes les positions">
        Toutes
      </button>`;
    phaseBtnWrap.style.display = 'flex';

    phaseBtnWrap.querySelectorAll('.phase-filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        phaseBtnWrap.querySelectorAll('.phase-filter-pill').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        applyFilters();
      });
    });
  } else {
    phaseBtnWrap && (phaseBtnWrap.style.display = 'none');
  }

  // Filtres select (intensité, confort, catégorie)
  ['intensity', 'comfort', 'category'].forEach(key => {
    document.getElementById(`filter-${key}`)?.addEventListener('change', applyFilters);
  });

  // Initial render
  applyFilters();
}

// ─── Suggestions contextuelles ─────────────────────────────────────────────

async function renderSuggestions() {
  const el = document.getElementById('suggestions-contextuelles');
  if (!el || !st.me) return;

  el.innerHTML = '<div class="skeleton skeleton-card" style="height:160px"></div>';

  try {
    const elleId = st.me.tracks_cycle ? st.me.user_id : st.partner?.user_id;
    if (!elleId) {
      el.innerHTML = '<p class="intime-empty">Le suivi de cycle doit être activé pour les suggestions.</p>';
      return;
    }

    const today = localDateStr();

    const { data: cycle } = await supabase
      .from('cycles').select('period_start')
      .order('period_start', { ascending: false }).limit(1).maybeSingle();

    const phase = cycle?.period_start ? PHASE_FROM_DAY(diffDays(today, cycle.period_start) + 1) : 'folliculaire';
    const phaseLabel = PHASE_LABEL[phase] || phase;

    const dateIdeas = getDateNightIdeas(phase);

    // Suggestions enrichies : notes du couple + douleurs + anti-routine (Phase 2).
    const { agg, recentPain } = await loadRatingData(st.coupleId);
    const painfulDay = phase === 'menstruelle' || recentPain;
    const positions = rankSuggestions({ phase, painfulDay, agg, today, limit: 4 });

    if (!positions.length && !dateIdeas.length) {
      el.innerHTML = '<p class="intime-empty">Pas de suggestions pour le moment. Continuez à noter vos moments !</p>';
      return;
    }

    el.innerHTML = `
      <div class="suggestion-phase">Phase ${phaseLabel}${painfulDay ? ' · jour sensible 🌸' : ''}</div>
      ${positions.length > 0 ? `
        <div class="suggestion-label">Suggérées pour vous</div>
        <div class="suggestion-positions">
          ${positions.map(p => `<div class="suggestion-pos">
            <div class="suggestion-pos-svg">${posThumb(p)}</div>
            <span>${p.label}</span>
            <span class="suggestion-reason">${p.reason}</span>
          </div>`).join('')}
        </div>
      ` : ''}
      ${dateIdeas.length > 0 ? `
        <div class="suggestion-label" style="margin-top:14px">Idées Date Night</div>
        <div class="suggestion-dates">
          ${dateIdeas.map(idea => `<div class="suggestion-idea">✨ ${idea}</div>`).join('')}
        </div>
      ` : ''}
    `;
  } catch (e) {
    console.error('renderSuggestions:', e.message);
    el.innerHTML = '<div class="msg error">Impossible de charger les suggestions.</div>';
  }
}

// ─── Fonctions extraites de l'ancien intimacy.js ───────────────────────────

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function renderFirstTimes() {
  const el = document.getElementById('first-times-list');
  if (!el) return;
  try {
    const { data, error } = await supabase.from('first_times')
      .select('*').eq('couple_id', st.coupleId).order('date', { ascending: false }).limit(10);
    if (error) throw error;
    if (!data?.length) {
      el.innerHTML = '<p class="intime-empty">Notez vos premières fois ensemble.</p>';
      return;
    }
    el.innerHTML = data.map(f => `
      <div class="first-item" data-id="${f.id}" data-desc="${escapeHtml(f.description)}" data-note="${escapeHtml(f.note || '')}" data-date="${f.date}">
        <div class="first-header">
          <div class="first-date">${fmtDate(f.date, { day:'numeric', month:'short', year:'numeric' })}</div>
          <div class="first-actions">
            <button type="button" class="btn-icon btn-edit-first" aria-label="Modifier">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button type="button" class="btn-icon btn-delete-first" aria-label="Supprimer">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          </div>
        </div>
        <div class="first-desc">${f.description}</div>
        ${f.note ? `<div class="first-note">${f.note}</div>` : ''}
      </div>`).join('');
  } catch (e) {
    el.innerHTML = '<div class="msg error">Impossible de charger les premières fois. Vérifiez votre connexion.</div>';
  }
}

function initFirstTimesSection() {
  // Bouton d'ajout
  document.getElementById('btn-add-first')?.addEventListener('click', async () => {
    const res = await formDialog({
      title: 'Une première fois',
      fields: [
        { name: 'description', label: 'Votre première fois', placeholder: 'ex. Voyage en amoureux à Paris', required: true },
        { name: 'date', label: 'Date', type: 'date', value: localDateStr() },
        { name: 'note', label: 'Note (optionnel)', type: 'textarea' },
      ],
    });
    if (!res) return;
    try {
      await supabase.from('first_times').insert({
        couple_id: st.coupleId, created_by: st.me?.user_id,
        description: res.description, date: res.date || localDateStr(), note: res.note || null,
      });
      await renderFirstTimes();
    } catch (e) { toast(friendlyError(e), 'error'); }
  });

  // Délégation d'événement pour l'édition et la suppression
  const listEl = document.getElementById('first-times-list');
  if (!listEl) return;

  listEl.addEventListener('click', async (e) => {
    const item = e.target.closest('.first-item');
    if (!item) return;
    const firstId = item.dataset.id;

    // Gérer la suppression
    if (e.target.closest('.btn-delete-first')) {
      const ok = await confirmDialog({ title: 'Supprimer cette première fois ?', message: 'Ce souvenir sera effacé.', confirmLabel: 'Supprimer', danger: true });
      if (!ok) return;
      try { await supabase.from('first_times').delete().eq('id', firstId); toast('Souvenir supprimé.'); await renderFirstTimes(); }
      catch (err) { toast(friendlyError(err), 'error'); }
    }

    // Gérer l'édition
    if (e.target.closest('.btn-edit-first')) {
      const res = await formDialog({
        title: 'Modifier une première fois',
        fields: [
          { name: 'description', label: 'Votre première fois', value: item.dataset.desc, required: true },
          { name: 'date', label: 'Date', type: 'date', value: item.dataset.date },
          { name: 'note', label: 'Note (optionnel)', type: 'textarea', value: item.dataset.note },
        ],
      });
      if (!res) return;
      try {
        await supabase.from('first_times').update({ description: res.description, date: res.date || localDateStr(), note: res.note || null }).eq('id', firstId);
        toast('Souvenir mis à jour.');
        await renderFirstTimes();
      } catch (err) { toast(friendlyError(err), 'error'); }
    }
  });
}

async function renderHardLimits() {
  const el = document.getElementById('hard-limits-display');
  if (!el) return;
  try {
    const { data, error } = await supabase.from('consent_limits').select('practice, level, note, user_id').eq('level', 'hard');
    if (error) throw error;
    if (!data?.length) { el.innerHTML = '<p class="intime-empty">Aucune hard limit enregistrée.</p>'; return; }
    el.innerHTML = data.map(l => {
      const who = l.user_id === st.me?.user_id ? (st.me?.display_name || 'Moi') : (st.partner?.display_name || 'Partenaire');
      return `<div class="limit-row hard"><span class="limit-who">${who}</span><span class="limit-practice">${l.practice}</span>${l.note ? `<span class="limit-note">${l.note}</span>` : ''}</div>`;
    }).join('');
  } catch (e) { el.innerHTML = '<div class="msg error">Impossible de charger les limites.</div>'; }
}

async function renderSafewords() {
  const el = document.getElementById('safewords-display');
  if (!el) return;
  try {
    const { data, error } = await supabase.from('safewords').select('*').eq('couple_id', st.coupleId);
    if (error) throw error;
    const addBtn = '<button type="button" id="btn-add-safeword" class="btn-inline">+ Ajouter</button>';
    // Quand la liste est vide, on propose le système « feu tricolore » en 1 tap (référence universelle).
    const presetBtn = data?.length ? '' :
      '<button type="button" id="btn-safeword-preset" class="btn-inline" style="margin-left:8px">🚦 Système feu tricolore</button>';
    el.innerHTML = (data?.length
      ? data.map(sw => `<div class="safeword-chip"><strong>${sw.word}</strong>${sw.meaning ? ` — ${sw.meaning}` : ''}</div>`).join('')
      : '<p class="intime-empty">Aucun safeword enregistré.</p>') + addBtn + presetBtn;
    document.getElementById('btn-add-safeword')?.addEventListener('click', async () => {
      const res = await formDialog({
        title: 'Ajouter un safeword',
        fields: [
          { name: 'word', label: 'Safeword', required: true },
          { name: 'meaning', label: 'Signification', placeholder: 'ex. stop immédiat' },
        ],
      });
      if (!res) return;
      try { await supabase.from('safewords').insert({ couple_id: st.coupleId, word: res.word, meaning: res.meaning || null }); await renderSafewords(); }
      catch (e) { toast(friendlyError(e), 'error'); }
    });
    document.getElementById('btn-safeword-preset')?.addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: 'Système feu tricolore',
        message: 'Ajouter les trois safewords universels : Vert (tout va bien), Orange (ralentis / on approche d\'une limite) et Rouge (stop immédiat) ?',
        confirmLabel: 'Ajouter',
      });
      if (!ok) return;
      try {
        await supabase.from('safewords').insert([
          { couple_id: st.coupleId, word: 'Vert',   meaning: 'Tout va bien, continue' },
          { couple_id: st.coupleId, word: 'Orange', meaning: 'Ralentis, on approche d\'une limite' },
          { couple_id: st.coupleId, word: 'Rouge',  meaning: 'Stop immédiat' },
        ]);
        await renderSafewords();
      } catch (e) { toast(friendlyError(e), 'error'); }
    });
  } catch (e) { el.innerHTML = '<div class="msg error">Impossible de charger les safewords.</div>'; }
}

function renderAftercare() {
  const inp = document.getElementById('aftercare-input');
  if (!inp) return;
  const saved = localStorage.getItem('nc-aftercare') || '';
  inp.value = saved;
  inp.addEventListener('input', () => localStorage.setItem('nc-aftercare', inp.value));
}

async function renderLastHealthEntry() {
  const el = document.getElementById('health-summary');
  if (!el) return;
  try {
    const { data, error } = await supabase.from('sexual_health').select('*').order('entry_date', { ascending: false }).limit(3);
    if (error) throw error;
    const TYPES = { contraception:'💊', test_ist:'🧪', vaccination:'💉', symptom:'💬' };
    if (!data?.length) { el.innerHTML = '<p class="intime-empty">Aucune entrée santé. Tes données restent privées par défaut.</p>'; return; }
    el.innerHTML = data.map(h => `
      <div class="health-row">
        <span class="health-icon" aria-hidden="true">${TYPES[h.type] || '📋'}</span>
        <div>
          <div class="health-label">${h.label}${h.value ? ` : <strong>${h.value}</strong>` : ''}</div>
          <div class="health-date">${fmtDate(h.entry_date, { day:'numeric', month:'short', year:'numeric' })}${h.shared ? ' · partagé' : ' · privé'}</div>
        </div>
      </div>`).join('');
  } catch (e) { el.innerHTML = '<div class="msg error">Impossible de charger les données santé.</div>'; }
}

function initHealthAdd() {
  document.getElementById('btn-add-health')?.addEventListener('click', async () => {
    const res = await formDialog({
      title: 'Entrée santé',
      fields: [
        { name: 'type', label: 'Type', type: 'select', options: [
          { value: 'contraception', label: 'Contraception' },
          { value: 'test_ist', label: 'Test IST' },
          { value: 'vaccination', label: 'Vaccination' },
          { value: 'symptom', label: 'Symptôme' },
        ] },
        { name: 'label', label: 'Détail', required: true },
        { name: 'value', label: 'Valeur (optionnel)', placeholder: 'ex. Positif, Négatif, 5/10...' },
        { name: 'note', label: 'Note (optionnel)', type: 'textarea' },
        { name: 'shared', label: 'Partager avec mon partenaire', type: 'checkbox' },
      ],
    });
    if (!res) return;
    try {
      const payload = {
        user_id: st.me?.user_id, entry_date: localDateStr(),
        ...res
      };
      await supabase.from('sexual_health').insert(payload);
      await renderLastHealthEntry();
    } catch (e) { toast(friendlyError(e), 'error'); }
  });
}

async function renderChallenges() {
  const listEl = document.getElementById('challenges-list');
  const progressEl = document.getElementById('challenge-progress');
  if (!listEl || !progressEl) return;

  try {
    const { data, error } = await supabase.from('challenges')
      .select('*')
      .eq('couple_id', st.coupleId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    // Barre de progression
    const completed = data.filter(c => c.completed).length;
    const total = data.length;
    if (total > 0) {
      const progressPct = (completed / total) * 100;
      progressEl.innerHTML = `
        <div class="challenge-progress">
          <div class="progress-bar-track">
            <div class="progress-bar-fill" style="width: ${progressPct}%"></div>
          </div>
          <div class="progress-label">${completed} / ${total} défi(s) complété(s)</div>
        </div>`;
    } else {
      progressEl.innerHTML = '';
    }

    // Liste des défis
    if (!data?.length) {
      listEl.innerHTML = '<p class="intime-empty">Aucun défi en cours. <button type="button" id="btn-add-challenge" class="btn-inline">+ Proposer</button></p>';
    } else {
      listEl.innerHTML = data.map(c => `
        <div class="challenge-row${c.completed ? ' done' : ''}">
          <button type="button" class="challenge-check" data-id="${c.id}" aria-label="${c.completed ? 'Marquer non terminé' : 'Marquer terminé'}">${c.completed ? '✅' : '⬜'}</button>
          <div>
            <div class="challenge-title">${c.title}</div>
            ${c.description ? `<div class="challenge-desc">${c.description}</div>` : ''}
            ${c.due_date ? `<div class="challenge-date">Avant le ${fmtDate(c.due_date, {day:'numeric', month:'long'})}</div>` : ''}
          </div>
        </div>`).join('') + '<button type="button" id="btn-add-challenge" class="btn-inline" style="margin-top:10px">+ Proposer un défi</button>';
      listEl.querySelectorAll('.challenge-check').forEach(btn =>
        btn.addEventListener('click', async () => {
          const done = btn.textContent === '✅';
          try { await supabase.from('challenges').update({ completed: !done }).eq('id', btn.dataset.id); await renderChallenges(); }
          catch (e) { console.error('challenge update:', e.message); }
        })
      );
    }

    // Bouton d'ajout
    document.getElementById('btn-add-challenge')?.addEventListener('click', async () => {
      const res = await formDialog({
        title: 'Proposer un défi',
        fields: [
          { name: 'title', label: 'Titre du défi', required: true },
          { name: 'description', label: 'Description (optionnel)', type: 'textarea' },
          { name: 'due_date', label: 'Échéance (optionnel)', type: 'date' }
        ],
      });
      if (!res) return;
      try {
        await supabase.from('challenges').insert({
          couple_id: st.coupleId,
          title: res.title,
          description: res.description || null,
          due_date: res.due_date || null,
          created_by: st.me?.user_id
        });
        await renderChallenges();
      }
      catch (e) { toast(friendlyError(e), 'error'); }
    });
  } catch (e) {
    listEl.innerHTML = '<div class="msg error">Impossible de charger les défis. Vérifiez votre connexion.</div>';
    progressEl.innerHTML = '';
  }
}

// ─── Dark mode dédié section intime ────────────────────────────────────────
function initDarkModeToggle() {
  const btn = document.getElementById('btn-intime-dark');
  if (!btn) return;

  // Restaurer la préférence
  if (localStorage.getItem('nc-intime-dark') === '1') {
    document.body.classList.add('intime-dark');
    btn.setAttribute('aria-pressed', 'true');
  }

  btn.addEventListener('click', () => {
    const dark = document.body.classList.toggle('intime-dark');
    localStorage.setItem('nc-intime-dark', dark ? '1' : '0');
    btn.setAttribute('aria-pressed', dark);
    btn.title = dark ? 'Mode clair' : 'Mode sombre';
  });
}

// Nettoyer le dark mode quand on quitte la vue intime
export function cleanupIntimacy() {
  document.body.classList.remove('intime-dark');
  if (handleSessionSaved) {
    document.removeEventListener('nc:session-saved', handleSessionSaved);
    handleSessionSaved = null;
  }
}

// ─── Voice input (Web Speech API) ──────────────────────────────────────────
function initVoiceInput() {
  const btn = document.getElementById('btn-voice-feedback');
  if (!btn) return;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { btn.style.display = 'none'; return; }

  const recognition = new SR();
  recognition.lang = 'fr-FR';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  let listening = false;

  btn.addEventListener('click', () => {
    if (listening) { recognition.stop(); return; }
    try {
      recognition.start();
    } catch (e) {
      console.warn('Speech recognition:', e.message);
    }
  });

  recognition.addEventListener('start', () => {
    listening = true;
    btn.classList.add('listening');
    btn.setAttribute('aria-label', 'Arrêter la dictée');
    btn.textContent = '🔴';
  });

  recognition.addEventListener('result', (e) => {
    const text = e.results[0][0].transcript;
    ['fb-improve', 'fb-loved', 'session-note-input'].forEach(id => {
      const el = document.getElementById(id);
      // Remplir le premier champ visible non vide ou vide en priorité
      if (el && document.getElementById('feedback-sheet')?.classList.contains('open')) {
        el.value = el.value ? el.value + ' ' + text : text;
      }
    });
  });

  recognition.addEventListener('end', () => {
    listening = false;
    btn.classList.remove('listening');
    btn.setAttribute('aria-label', 'Dicter le feedback');
    btn.textContent = '🎙️';
  });

  recognition.addEventListener('error', (e) => {
    listening = false;
    btn.classList.remove('listening');
    btn.textContent = '🎙️';
    if (e.error !== 'aborted') console.error('Speech error:', e.error);
  });
}

// ─── Slider kinks : gradient dynamique ─────────────────────────────────────
export function initKinkSliderGradients() {
  document.querySelectorAll('.kink-slider').forEach(slider => {
    function update() {
      const pct = (Number(slider.value) / 5 * 100).toFixed(1);
      slider.style.setProperty('--fill', `${pct}%`);
    }
    update(); // initialiser au chargement
    slider.addEventListener('input', update);
  });
}

// ─── Swipe navigation entre sections du dashboard ──────────────────────────
function initSwipeNav() {
  const container = document.querySelector('.app');
  if (!container) return;

  let startX = 0, startY = 0;
  const THRESHOLD = 60; // px minimum pour déclencher

  container.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  container.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = Math.abs(e.changedTouches[0].clientY - startY);

    // Ne déclencher que pour des swipes horizontaux nets (ratio dx/dy > 1.5)
    if (Math.abs(dx) < THRESHOLD || dy > Math.abs(dx) * 0.7) return;

    // Swipe gauche → vue suivante, swipe droite → vue précédente
    const NAV = ['today', 'calendar', 'nous', 'intime'];
    const hash = window.location.hash.replace('#', '') || 'today';
    const idx  = NAV.indexOf(hash);
    if (idx < 0) return;

    if (dx < 0 && idx < NAV.length - 1) {
      import('./router.js').then(({ navigate }) => navigate(NAV[idx + 1]));
    } else if (dx > 0 && idx > 0) {
      import('./router.js').then(({ navigate }) => navigate(NAV[idx - 1]));
    }
  }, { passive: true });
}

// ─── Export état pour kinks.js ─────────────────────────────────────────────
export function getIntimacyState() { return st; }
