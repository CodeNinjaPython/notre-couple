/**
 * intimacy.js — Orchestrateur du module Intime.
 * Délègue toute la logique aux sous-modules :
 *   intimacy-sessions.js  → sessions, formulaires, fast-track
 *   intimacy-stats.js     → heatmap, courbe, désir, débrief, équité
 *   intimacy-library.js   → bibliothèque de positions
 *   kinks.js              → kinks, wish-list, limites
 *   pin-lock.js           → verrouillage PIN
 */
import { supabase } from './supabase.js';
import { getMyMembership, getPartnerMembership } from './pairing.js';
import { localDateStr, fmtDate, diffDays } from './date-utils.js';
import { renderRecentSessions, openFullSessionSheet, openFastTrack, initSessionSheetListeners } from './intimacy-sessions.js';
import { initIntimacyCalendar } from './intimacy-calendar.js';
import {
  renderDesireWindow, renderSouvenirDuJour, renderDebriefPostDispute,
  renderEquitePlaisir, renderMonthlyHeatmap, renderSatisfactionCurve,
  renderOrgasmByPhase, renderHealthAlerts,
} from './intimacy-stats.js';
import { renderLibrary, getSuggestions, getDateNightIdeas, PHASES_LABELS, POSITIONS } from './intimacy-library.js';
import { DailyLog } from './cycle-model.js';
import { hasPIN, isLocked, showLockScreen, initQuickHide, initPINSettings } from './pin-lock.js';
import { notifyLibidosAligned } from './notifications.js';
import { cachedQuery, invalidateCache } from './query-cache.js';
import { initCollapsibles } from './collapse.js';
import { toast, confirmDialog, formDialog, friendlyError } from './ui-feedback.js';

export let st = { me: null, partner: null, coupleId: null };

// ─── Init principal ────────────────────────────────────────────────────────

export async function initIntimacy() {
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
  await Promise.all([
    renderDesireWindow(st),
    renderRecentSessions(st),
    renderMatchCount(),
    renderSouvenirDuJour(st.coupleId),
    renderDebriefPostDispute(st.coupleId, st.partner?.display_name),
    renderEquitePlaisir(st),
    renderCycleXIntimite(),
    renderFirstTimes(),
    renderLastHealthEntry(),
    renderHardLimits(),
    renderSafewords(),
    renderAftercare(),
    renderChallenges(),
    renderSuggestions(),
  ]);

  // Stats avancées (chargement différé — section stats)
  // elleId = la personne qui suit son cycle (même logique que nous.js)
  const elleId = st.me?.tracks_cycle ? st.me.user_id : st.partner?.user_id;
  renderMonthlyHeatmap(st.coupleId, elleId);
  renderSatisfactionCurve(st.me?.user_id);
  renderOrgasmByPhase(st);
  renderHealthAlerts(st.me?.user_id);

  // §4 — notification libidos alignées (si opt-in)
  notifyLibidosAligned();

  // Calendrier intime (suivi mensuel de la sexualité)
  initIntimacyCalendar(st.coupleId, (date) => {
    openFullSessionSheet(st);
    const dateEl = document.getElementById('session-date-input');
    if (dateEl) dateEl.value = date;
  });

  // Bibliothèque
  renderLibrarySection();

  // Interactions
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
  initFirstTimeAdd();
}

// ─── Quick add ─────────────────────────────────────────────────────────────

function initQuickAdd() {
  document.getElementById('btn-quick-add')?.addEventListener('click', () => openFullSessionSheet(st));
  document.getElementById('btn-fast-track-open')?.addEventListener('click', () => openFastTrack(st));
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

async function renderCycleXIntimite() {
  const el = document.getElementById('cycle-x-intimite');
  if (!el) return;
  try {
    const [sessionsRes, cyclesRes, feedbackRes] = await Promise.all([
      supabase.from('intimate_sessions').select('id, session_date').eq('couple_id', st.coupleId),
      supabase.from('cycles').select('period_start').order('period_start', { ascending: false }).limit(6),
      supabase.from('session_feedback').select('session_id, satisfaction').eq('user_id', st.me?.user_id),
    ]);

    const sessions  = sessionsRes.data  || [];
    const cycles    = cyclesRes.data    || [];
    const feedbacks = feedbackRes.data  || [];
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

async function renderLibrarySection() {
  const grid = document.getElementById('library-grid');
  if (!grid) return;

  // Taper une position l'ajoute à la saisie du jour (délégation, liée une fois).
  if (!grid._posLoggerBound) {
    grid._posLoggerBound = true;
    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.pos-card');
      if (card?.dataset.id) logPositionToday(card.dataset.id, card);
    });
    grid.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.pos-card');
      if (card?.dataset.id) { e.preventDefault(); logPositionToday(card.dataset.id, card); }
    });
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
        const phase = btn.dataset.phase || undefined;
        renderLibrary(grid, collectFilters(phase));
      });
    });

    // Afficher la phase actuelle par défaut
    renderLibrary(grid, { phase: currentPhase });
  } else {
    phaseBtnWrap && (phaseBtnWrap.style.display = 'none');
    renderLibrary(grid);
  }

  // Filtres select (intensité, confort, catégorie)
  ['intensity', 'comfort', 'category'].forEach(key => {
    document.getElementById(`filter-${key}`)?.addEventListener('change', () => {
      const activePhase = phaseBtnWrap?.querySelector('.phase-filter-pill.active')?.dataset.phase;
      renderLibrary(grid, collectFilters(activePhase || undefined));
    });
  });
}

// Ajoute une position de la bibliothèque à la saisie du jour (positionsPersonnalisees).
async function logPositionToday(posId, card) {
  const pos = POSITIONS.find(p => p.id === posId);
  if (!pos || !st.me) return;
  const today = localDateStr();
  try {
    const { data } = await supabase.from('log_entries')
      .select('*').eq('user_id', st.me.user_id).eq('log_date', today).eq('category_id', 'journal').maybeSingle();
    const log = data ? DailyLog.fromDB(data) : new DailyLog({ date: today, userId: st.me.user_id });
    if (!Array.isArray(log.positionsPersonnalisees)) log.positionsPersonnalisees = [];

    if (log.positionsPersonnalisees.includes(pos.label)) {
      toast(`« ${pos.label} » déjà notée aujourd'hui`, 'info');
      return;
    }
    log.positionsPersonnalisees.push(pos.label);
    const { error } = await supabase.from('log_entries').upsert(
      { ...log.toDBEntry(), user_id: st.me.user_id },
      { onConflict: 'user_id,log_date,category_id' }
    );
    if (error) throw error;
    invalidateCache('log_entries');
    card?.classList.add('pos-card--logged');
    toast(`« ${pos.label} » ajoutée à aujourd'hui ✓`);
  } catch (e) {
    toast(friendlyError(e), 'error');
  }
}

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

// ─── Suggestions contextuelles ─────────────────────────────────────────────

async function renderSuggestions() {
  const el = document.getElementById('suggestions-contextuelles');
  if (!el || !st.me) return;

  try {
    const elleId   = st.me.tracks_cycle ? st.me.user_id : st.partner?.user_id;
    const luiId    = st.me.tracks_cycle ? st.partner?.user_id : st.me.user_id;
    const today    = localDateStr();

    const [cycleRes, moodRes] = await Promise.all([
      supabase.from('cycles').select('period_start').order('period_start', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('log_entries').select('value').eq('user_id', luiId).eq('category_id', 'mood').eq('log_date', today).maybeSingle(),
    ]);

    let phase = 'folliculaire';
    if (cycleRes.data?.period_start) {
      const day = diffDays(today, cycleRes.data.period_start) + 1;
      if (day <= 5)  phase = 'menstruelle';
      else if (day <= 13) phase = 'folliculaire';
      else if (day <= 16) phase = 'ovulation';
      else phase = 'luteale';
    }

    const luiMood    = Number(moodRes.data?.value?.v ?? moodRes.data?.value ?? 3);
    const positions  = getSuggestions(phase, luiMood);
    const dateIdeas  = getDateNightIdeas(phase);
    const phaseLabel = PHASES_LABELS[phase]?.label || phase;

    el.innerHTML = `
      <div class="suggestion-phase">Phase ${phaseLabel}</div>
      <div class="suggestion-label">Positions idéales</div>
      <div class="suggestion-positions">
        ${positions.map(p => `<div class="suggestion-pos">
          <div class="suggestion-pos-svg">${p.svg}</div>
          <span>${p.label}</span>
        </div>`).join('')}
      </div>
      <div class="suggestion-label" style="margin-top:14px">Idées Date Night</div>
      <div class="suggestion-dates">
        ${dateIdeas.map(idea => `<div class="suggestion-idea">✨ ${idea}</div>`).join('')}
      </div>`;
  } catch (e) {
    console.error('renderSuggestions:', e.message);
  }
}

// ─── Fonctions extraites de l'ancien intimacy.js ───────────────────────────

async function renderFirstTimes() {
  const el = document.getElementById('first-times-list');
  if (!el) return;
  try {
    const { data, error } = await supabase.from('first_times')
      .select('*').eq('couple_id', st.coupleId).order('date', { ascending: false }).limit(10);
    if (error) throw error;
    if (!data?.length) { el.innerHTML = '<p class="intime-empty">Notez vos premières fois ensemble.</p>'; return; }
    el.innerHTML = data.map(f => `<div class="first-item">
      <div class="first-date">${fmtDate(f.date, { day:'numeric', month:'short', year:'numeric' })}</div>
      <div class="first-desc">${f.description}</div>
      ${f.note ? `<div class="first-note">${f.note}</div>` : ''}
    </div>`).join('');
  } catch (e) {
    el.innerHTML = '<div class="msg error">Impossible de charger les premières fois. Vérifiez votre connexion.</div>';
  }
}

function initFirstTimeAdd() {
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
    el.innerHTML = (data?.length ? data.map(sw => `<div class="safeword-chip"><strong>${sw.word}</strong>${sw.meaning ? ` — ${sw.meaning}` : ''}</div>`).join('') : '<p class="intime-empty">Aucun safeword enregistré.</p>') + addBtn;
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
    el.innerHTML = data.map(h => `<div class="health-row">
      <span class="health-icon" aria-hidden="true">${TYPES[h.type] || '📋'}</span>
      <div><div class="health-label">${h.label}</div>
      <div class="health-date">${fmtDate(h.entry_date, { day:'numeric', month:'short', year:'numeric' })}${h.shared ? ' · partagé' : ' · privé'}</div></div>
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
        { name: 'note', label: 'Note (optionnel)', type: 'textarea' },
        { name: 'shared', label: 'Partager avec mon partenaire', type: 'checkbox' },
      ],
    });
    if (!res) return;
    try {
      await supabase.from('sexual_health').insert({
        user_id: st.me?.user_id, entry_date: localDateStr(),
        type: res.type, label: res.label, note: res.note || null, shared: res.shared,
      });
      await renderLastHealthEntry();
    } catch (e) { toast(friendlyError(e), 'error'); }
  });
}

async function renderChallenges() {
  const el = document.getElementById('challenges-list');
  if (!el) return;
  try {
    const { data, error } = await supabase.from('challenges').select('*').eq('couple_id', st.coupleId).order('created_at', { ascending: false }).limit(3);
    if (error) throw error;
    if (!data?.length) {
      el.innerHTML = '<p class="intime-empty">Aucun défi en cours. <button type="button" id="btn-add-challenge" class="btn-inline">+ Proposer</button></p>';
    } else {
      el.innerHTML = data.map(c => `<div class="challenge-row${c.completed ? ' done' : ''}">
        <button type="button" class="challenge-check" data-id="${c.id}" aria-label="${c.completed ? 'Marquer non terminé' : 'Marquer terminé'}">${c.completed ? '✅' : '⬜'}</button>
        <div><div class="challenge-title">${c.title}</div></div>
      </div>`).join('') + '<button type="button" id="btn-add-challenge" class="btn-inline" style="margin-top:10px">+ Proposer un défi</button>';
      el.querySelectorAll('.challenge-check').forEach(btn =>
        btn.addEventListener('click', async () => {
          const done = btn.textContent === '✅';
          try { await supabase.from('challenges').update({ completed: !done }).eq('id', btn.dataset.id); await renderChallenges(); }
          catch (e) { console.error('challenge update:', e.message); }
        })
      );
    }
    document.getElementById('btn-add-challenge')?.addEventListener('click', async () => {
      const res = await formDialog({
        title: 'Proposer un défi',
        fields: [{ name: 'title', label: 'Défi du mois', required: true }],
      });
      if (!res) return;
      try { await supabase.from('challenges').insert({ couple_id: st.coupleId, title: res.title, created_by: st.me?.user_id }); await renderChallenges(); }
      catch (e) { toast(friendlyError(e), 'error'); }
    });
  } catch (e) { el.innerHTML = '<div class="msg error">Impossible de charger les défis. Vérifiez votre connexion.</div>'; }
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
