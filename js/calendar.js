import { supabase } from './supabase.js';
import { getMyMembership, getPartnerMembership } from './pairing.js';
import { getCycleHistory, predictNextPeriod } from './cycles.js';
import { localDateStr } from './date-utils.js';
import { renderSymptomTracker } from './symptoms.js';
import { initCollapsibles } from './collapse.js';
import { DailyLog, computeCyclePrediction } from './cycle-model.js';
import { renderLogCategoryAccordion, renderCalendarDaySummary } from './daily-log-ui.js';
import { getCycleMode } from './onboarding.js';
import { confirmDialog, toast } from './ui-feedback.js';

const PHASES = [
  [1,  5,  'Menstruelle',  '#E53935'],
  [6,  13, 'Folliculaire', '#4278C4'],
  [14, 16, 'Ovulation',    '#7C5CFC'],
  [17, 35, 'Lutéale',      '#E84375'],
];
const MONTH_FR = ['Janvier','Février','Mars','Avril','Mai','Juin',
                  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAY_FR   = ['L','M','M','J','V','S','D'];

let calState = {
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
  cycles: [],
  entries: {},     // 'YYYY-MM-DD' → { mood, energy, flow... }
  prediction: null,
  me: null,
};

export async function initCalendar() {
  renderCalendarSkeleton();   // placeholder pendant le chargement des données

  // Les 3 requêtes sont indépendantes → en parallèle (1 aller-retour au lieu de 3).
  const [me, cycles] = await Promise.all([
    getMyMembership(),
    getCycleHistory(12),
    loadMonthEntries(),
  ]);
  calState.me = me;
  calState.cycles = cycles;

  let logs = [];
  if (me && cycles && cycles.length > 0) {
    try {
      const cycleUserId = me.tracks_cycle ? me.user_id : (await getPartnerMembership(me.couple_id))?.user_id;
      if (cycleUserId) {
        const { data } = await supabase
          .from('log_entries')
          .select('*')
          .eq('user_id', cycleUserId)
          .eq('category_id', 'journal')
          .gte('log_date', cycles[0].period_start);
        if (data) logs = data;
      }
    } catch (_) {}
  }
  calState.prediction = predictNextPeriod(cycles, logs);

  document.getElementById('today-date').textContent =
    new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  renderCalendar();
  bindNav();
  bindCycleYear();

  // Saisie DailyLog : ne s'affiche qu'au clic d'un jour (la saisie « live »
  // reste sur l'onglet Aujourd'hui). Invite par défaut.
  const dlWrap = document.getElementById('daily-log-form');
  if (dlWrap) {
    dlWrap.innerHTML = '<p class="intime-empty">Sélectionne un jour ci-dessus pour le consulter ou le modifier.</p>';
  }

  // Symptômes détaillés (Clue)
  const symptWrap = document.getElementById('symptom-tracker');
  if (symptWrap && calState.me) {
    renderSymptomTracker(symptWrap, { me: calState.me, partner: null }, localDateStr());
  }

  // Accordéons de la vue Calendrier
  initCollapsibles(document.getElementById('view'));
}

async function loadMonthEntries() {
  const firstDay = `${calState.year}-${String(calState.month + 1).padStart(2,'0')}-01`;
  const last = new Date(calState.year, calState.month + 1, 0);
  const lastDay = localDateStr(last);

  const { data } = await supabase
    .from('log_entries')
    .select('log_date, category_id, value')
    .gte('log_date', firstDay)
    .lte('log_date', lastDay);

  calState.entries = {};
  (data || []).forEach(r => {
    if (!calState.entries[r.log_date]) calState.entries[r.log_date] = {};
    // 'journal' est le DailyLog complet (JSONB) — on le stocke tel quel
    calState.entries[r.log_date][r.category_id] = r.category_id === 'journal'
      ? (r.value?.v ?? r.value)
      : (r.value?.v ?? r.value);
  });
}

function renderCalendar() {
  renderMonthGrid();
  renderPredictionPanel();
  renderCycleHistory();
}

// Skeleton de la grille (en-têtes réels + cellules grisées) pendant le fetch.
function renderCalendarSkeleton() {
  const grid = document.getElementById('cal-grid');
  if (!grid || grid.querySelector('.cal-cell')) return;
  const headers = DAY_FR.map(d => `<div class="cal-day-header">${d}</div>`).join('');
  const cells = Array.from({ length: 35 }, () =>
    '<div class="cal-cell skeleton" style="border:none"></div>').join('');
  grid.innerHTML = headers + cells;
}

function renderMonthGrid() {
  const grid = document.getElementById('cal-grid');
  const title = document.getElementById('cal-month-title');
  if (!grid || !title) return;

  title.textContent = `${MONTH_FR[calState.month]} ${calState.year}`;

  const today = localDateStr();
  const firstWeekday = (new Date(calState.year, calState.month, 1).getDay() + 6) % 7; // 0=Mon
  const daysInMonth  = new Date(calState.year, calState.month + 1, 0).getDate();

  // Build phase map: date → phase name
  const phaseMap = buildPhaseMap();
  // Build prediction map
  const predMap = buildPredictionMap();

  let html = DAY_FR.map(d => `<div class="cal-day-header">${d}</div>`).join('');

  // Empty cells before month start
  for (let i = 0; i < firstWeekday; i++) html += '<div class="cal-cell empty"></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calState.year}-${String(calState.month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const phase   = phaseMap[dateStr];
    const pred    = predMap[dateStr];
    const entry   = calState.entries[dateStr];
    const isToday = dateStr === today;
    const isFuture = dateStr > today;

    let cls = 'cal-cell';
    if (isToday) cls += ' today';
    if (isFuture) cls += ' future';

    // Puces colorées par catégorie de données saisies
    let dots = '';
    const journal = entry?.journal;
    if (entry) {
      // Flux (rouge) — règles, depuis journal ou ancien 'flow'
      const hasFlux = (journal?.fluxMenstruel && journal.fluxMenstruel !== 'aucun')
                   || (entry.flow != null);
      if (hasFlux) dots += '<span class="cal-dot cal-dot-flux" title="Flux"></span>';

      // Spotting (saignements légers) — distinct du flux, n'entre pas dans le calcul du cycle.
      if (journal?.spotting) dots += '<span class="cal-dot cal-dot-spotting" title="Spotting (saignements légers)"></span>';

      // Douleurs (bleu)
      const hasDouleurs = (journal?.douleursPelviennes?.length || journal?.douleursCorps?.length)
                       || (entry.cramps != null);
      if (hasDouleurs) dots += '<span class="cal-dot cal-dot-douleurs" title="Douleurs"></span>';

      // Humeur/Émotions (orange)
      const hasEmotion = (journal?.emotions?.length || journal?.etatCognitif?.length)
                      || (entry.mood != null);
      if (hasEmotion) dots += '<span class="cal-dot cal-dot-emotions" title="Humeur"></span>';

      // (La sexualité n'est plus affichée ici : elle vit dans l'onglet Intimité,
      //  qui lit aussi les données sexuelles du journal — voir intimacy-calendar.js.)

      // Énergie/Sommeil (ambre)
      if (journal?.niveauEnergie || entry.energy != null)
        dots += '<span class="cal-dot cal-dot-energie" title="Énergie"></span>';

      // Autres symptômes (glaire, sommeil, digestion, peau, cheveux, social, urine…)
      // — surtout présents via l'import Clue, sinon ces jours n'auraient aucun point.
      const hasAutres = !!(journal && (
        journal.glaireCervicale || journal.transit || journal.protectionType ||
        journal.dureeSommeil ||
        journal.symptomesSommeil?.length || journal.fringales?.length ||
        journal.etatPeau?.length || journal.etatCheveux?.length ||
        journal.urineSymptomes?.length || journal.vieSociale?.length
      ));
      if (hasAutres) dots += '<span class="cal-dot cal-dot-symptomes" title="Autres symptômes"></span>';
    }

    let phaseBg = '';
    if (phase) {
      const col = PHASES.find(([a,b,l]) => l === phase)?.[3] || '#D9B36A';
      phaseBg = `style="background: ${hexAlpha(col, isFuture ? .06 : .12)}; border-color: ${hexAlpha(col, .25)};"`;
    } else if (pred === 'period') {
      // Prévision des règles : rouge clair.
      phaseBg = `style="background: rgba(229,57,53,.12); border-color: rgba(229,57,53,.30);" title="Règles prévues"`;
    } else if (pred === 'fertile') {
      // Prévision de l'ovulation / fenêtre fertile : bleu clair.
      phaseBg = `style="background: rgba(66,120,196,.12); border-color: rgba(66,120,196,.30);" title="Ovulation / fenêtre fertile probable"`;
    }

    html += `<div class="${cls}" data-date="${dateStr}" ${phaseBg}>
      <span class="cal-num">${d}</span>
      <div class="cal-dots">${dots}</div>
    </div>`;
  }

  grid.innerHTML = html;

  // Tap on a day → show detail
  grid.querySelectorAll('.cal-cell[data-date]').forEach(cell => {
    cell.addEventListener('click', () => {
      const ds = cell.dataset.date;
      showDayDetail(ds);
      mountDayForm(ds);
      // Le tracker de symptômes suit aussi le jour sélectionné (au lieu de toujours aujourd'hui).
      const symptWrap = document.getElementById('symptom-tracker');
      if (symptWrap && calState.me) renderSymptomTracker(symptWrap, { me: calState.me, partner: null }, ds);
    });
  });
}

function buildPhaseMap() {
  const map = {};
  // On ne colore QUE les règles (rouge) et la fenêtre fertile / ovulation (violet).
  // L'ovulation d'un cycle passé est déduite du cycle SUIVANT : phase lutéale ≈ 14 j,
  // donc ovulation ≈ (début des règles suivantes) − 14 j. On évite ainsi le moignon
  // « folliculaire » de 3 jours collé après les règles qui se lisait comme une ovulation.
  const sorted = [...calState.cycles]
    .filter(c => c.period_start)
    .sort((a, b) => a.period_start.localeCompare(b.period_start));

  sorted.forEach((cycle, i) => {
    // 1. Jours de règles (rouge) — de period_start à period_end inclus.
    const start = new Date(cycle.period_start + 'T12:00:00');
    const end   = new Date((cycle.period_end || cycle.period_start) + 'T12:00:00');
    for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 864e5)) {
      const s = localDateStr(d);
      if (!map[s]) map[s] = 'Menstruelle';
    }

    // 2. Fenêtre fertile / ovulation (violet) — seulement si le cycle suivant est connu.
    //    Le cycle en cours (sans suivant) est géré par buildPredictionMap.
    const next = sorted[i + 1];
    if (next?.period_start) {
      const ov = new Date(new Date(next.period_start + 'T12:00:00').getTime() - 14 * 864e5);
      for (let k = -5; k <= 1; k++) {
        const s = localDateStr(new Date(ov.getTime() + k * 864e5));
        if (!map[s]) map[s] = 'Ovulation';
      }
    }
  });
  return map;
}

function buildPredictionMap() {
  const map = {};
  const p = calState.prediction;
  if (!p) return map;
  // Mode grossesse : aucune prédiction de règles / fertilité
  if (getCycleMode() === 'pregnancy') return map;

  // Règles prévues : 5 jours à partir de nextPeriodDate
  const nextPeriod = new Date(p.nextPeriodDate + 'T12:00:00');
  for (let i = 0; i < 5; i++) {
    const d = new Date(nextPeriod.getTime() + i * 864e5);
    map[localDateStr(d)] = 'period';
  }
  // Fenêtre fertile : 5 jours avant ovulation jusqu'à ovulation
  const fertile = new Date(p.fertileStart + 'T12:00:00');
  const ovul    = new Date(p.ovulationDate + 'T12:00:00');
  for (let d = fertile; d <= ovul; d = new Date(d.getTime() + 864e5)) {
    const s = localDateStr(d);
    if (!map[s]) map[s] = 'fertile';
  }
  return map;
}

function renderPredictionPanel() {
  const panel = document.getElementById('cal-prediction');
  if (!panel) return;
  const p = calState.prediction;
  if (!p || p.cyclesUsed < 2) {
    panel.innerHTML = `<div class="msg info">Encore quelques cycles à enregistrer pour activer la prédiction.</div>`;
    return;
  }
  const fmt = d => new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  const margin = p.stdDev >= 1 ? ` ± ${Math.round(p.stdDev)} j` : '';
  panel.innerHTML = `
    <div class="pred-row">
      <div class="pred-item">
        <div class="pred-label">Prochaines règles</div>
        <div class="pred-val" style="color:var(--rose)">${fmt(p.nextPeriodDate)}${margin}</div>
      </div>
      <div class="pred-item">
        <div class="pred-label">Ovulation estimée</div>
        <div class="pred-val" style="color:var(--gold)">${fmt(p.ovulationDate)}</div>
      </div>
      <div class="pred-item">
        <div class="pred-label">Cycle moyen</div>
        <div class="pred-val">${p.avgCycleLength} jours${p.predictabilityScore != null ? `<br><span style="font-size:0.7em;opacity:0.7">${p.predictabilityScore}% régulier</span>` : ''}</div>
      </div>
    </div>
    <div class="pred-disclaimer">Basé sur ${p.cyclesUsed} cycles · indicatif, pas un outil contraceptif.</div>`;
}

function renderCycleHistory() {
  const list = document.getElementById('cal-history');
  if (!list) return;
  const completed = calState.cycles.filter(c => c.period_start && c.period_end);
  if (!completed.length) {
    list.innerHTML = '<div style="color:var(--faint);font-size:13px">Aucun cycle complété.</div>';
    return;
  }
  list.innerHTML = completed.slice(0, 6).map(c => {
    const start    = new Date(c.period_start);
    const end      = new Date(c.period_end);
    const duration = Math.round((end - start) / 864e5) + 1;
    const fmt = d => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    return `<div class="history-row">
      <span class="history-date">${fmt(start)} → ${fmt(end)}</span>
      <span class="history-len">${duration} j règles</span>
    </div>`;
  }).join('');
}

// Monte le formulaire DailyLog éditable pour le jour sélectionné.
async function mountDayForm(dateStr) {
  const dlWrap = document.getElementById('daily-log-form');
  const title  = document.getElementById('daily-log-title');
  if (!dlWrap || !calState.me) return;

  if (title) {
    title.textContent = dateStr === localDateStr()
      ? 'Modifier aujourd\'hui'
      : `Modifier · ${new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`;
  }

  const { data: existing } = await supabase.from('log_entries')
    .select('*').eq('user_id', calState.me.user_id).eq('log_date', dateStr).eq('category_id', 'journal').maybeSingle();
  const log = existing ? DailyLog.fromDB(existing) : new DailyLog({ date: dateStr, userId: calState.me.user_id });

  renderLogCategoryAccordion(dlWrap, log, async (updatedLog) => {
    await supabase.from('log_entries').upsert(
      { ...updatedLog.toDBEntry(), user_id: calState.me.user_id },
      { onConflict: 'user_id,log_date,category_id' }
    );
    let toast = document.getElementById('toast');
    if (!toast) { toast = document.createElement('div'); toast.id = 'toast'; toast.className = 'toast'; document.body.appendChild(toast); }
    toast.textContent = 'Enregistré ✓';
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('show'), 2500);
  });
}

async function showDayDetail(dateStr) {
  const detail = document.getElementById('day-detail');
  const title  = document.getElementById('day-detail-date');
  const body   = document.getElementById('day-detail-body');
  if (!detail) return;

  title.textContent = new Date(dateStr + 'T12:00:00')
    .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  // Chercher le journal DailyLog du jour (category_id = 'journal').
  // Filtrer par user_id : sans ça, Elle + Lui renvoient 2 lignes → maybeSingle échoue.
  let log = null;
  try {
    const { data } = await supabase.from('log_entries')
      .select('*').eq('user_id', calState.me.user_id)
      .eq('log_date', dateStr).eq('category_id', 'journal').maybeSingle();
    if (data) log = DailyLog.fromDB(data);
  } catch (_) {}

  // Calculer le jour et la phase dans le cycle
  const pred = computeCyclePrediction(calState.cycles || [], [], dateStr);
  const cycleDay   = pred?.jourDuCycleActuel ?? null;
  const phaseName  = pred?.phaseDuCycle     ?? null;

  renderCalendarDaySummary(body, log, cycleDay, phaseName, dateStr);

  // Actions : Modifier (aller au formulaire de saisie) / Supprimer (effacer le journal du jour).
  const actions = document.createElement('div');
  actions.className = 'day-detail-actions';
  actions.innerHTML = `
    <button type="button" class="btn-secondary" id="btn-day-edit">✏️ Modifier</button>
    <button type="button" class="btn-secondary btn-danger" id="btn-day-delete"${log ? '' : ' disabled'}>🗑️ Supprimer</button>`;
  body.appendChild(actions);

  document.getElementById('btn-day-edit')?.addEventListener('click', () => {
    detail.classList.remove('open');
    document.getElementById('daily-log-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, { once: true });

  document.getElementById('btn-day-delete')?.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Supprimer la saisie du jour ?',
      message: 'Le journal (symptômes, humeur, notes…) de ce jour sera effacé. Irréversible.',
      confirmLabel: 'Supprimer', danger: true,
    });
    if (!ok) return;
    try {
      const { error } = await supabase.from('log_entries').delete()
        .eq('user_id', calState.me.user_id).eq('log_date', dateStr).eq('category_id', 'journal');
      if (error) throw error;
      toast('Saisie supprimée.');
      detail.classList.remove('open');
      await loadMonthEntries();
      renderCalendar();
    } catch (e) {
      toast(e.message || 'Échec de la suppression', 'error');
    }
  }, { once: true });

  detail.classList.add('open');
  document.getElementById('btn-detail-close')?.addEventListener('click', () => {
    detail.classList.remove('open');
  }, { once: true });
}

function bindNav() {
  document.getElementById('cal-prev')?.addEventListener('click', async () => {
    calState.month--;
    if (calState.month < 0) { calState.month = 11; calState.year--; }
    await loadMonthEntries();
    renderCalendar();
  });
  document.getElementById('cal-next')?.addEventListener('click', async () => {
    calState.month++;
    if (calState.month > 11) { calState.month = 0; calState.year++; }
    await loadMonthEntries();
    renderCalendar();
  });
}

// ── Vue année du cycle (overlay) : uniquement les règles, en rouge ──────────
let cycleYearShown = new Date().getFullYear();

function buildPeriodDaysSet() {
  const set = new Set();
  for (const c of (calState.cycles || [])) {
    if (!c.period_start) continue;
    const s = new Date(c.period_start + 'T12:00:00');
    const e = c.period_end ? new Date(c.period_end + 'T12:00:00') : s;
    for (let d = new Date(s); d <= e; d = new Date(d.getTime() + 864e5)) set.add(localDateStr(d));
  }
  return set;
}

function renderCycleYearGrid() {
  const list  = document.getElementById('cycle-year-months-list');
  const title = document.getElementById('cycle-yr-title');
  if (!list || !title) return;
  title.textContent = String(cycleYearShown);
  const periodDays = buildPeriodDaysSet();
  const today = localDateStr();

  let html = '';
  for (let m = 0; m < 12; m++) {
    const daysInMonth  = new Date(cycleYearShown, m + 1, 0).getDate();
    const firstWeekday = (new Date(cycleYearShown, m, 1).getDay() + 6) % 7; // 0 = lundi
    const dayHeaders = DAY_FR.map(d => `<div class="intime-year-day-header">${d}</div>`).join('');
    let cells = '';
    for (let i = 0; i < firstWeekday; i++) cells += '<span class="yr-cell empty"></span>';
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${cycleYearShown}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      let cls = 'yr-cell';
      if (periodDays.has(ds)) cls += ' period';
      if (ds === today) cls += ' today';
      cells += `<span class="${cls}"></span>`;
    }
    html += `<div class="intime-year-grid-item">
      <div class="intime-year-month-title">${MONTH_FR[m]}</div>
      <div class="intime-year-month-grid">${dayHeaders}${cells}</div>
    </div>`;
  }
  list.innerHTML = html;
}

function openCycleYear() {
  const o = document.getElementById('cycle-year-overlay');
  if (o) { o.classList.add('open'); o.setAttribute('aria-hidden', 'false'); }
  renderCycleYearGrid();
}

function closeCycleYear() {
  const o = document.getElementById('cycle-year-overlay');
  if (o) { o.classList.remove('open'); o.setAttribute('aria-hidden', 'true'); }
  document.querySelectorAll('#toggle-cycle-view button').forEach(b =>
    b.classList.toggle('on', b.dataset.view === 'month'));
}

function bindCycleYear() {
  document.querySelectorAll('#toggle-cycle-view button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#toggle-cycle-view button').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      if (btn.dataset.view === 'year') openCycleYear(); else closeCycleYear();
    });
  });
  document.getElementById('btn-close-cycle-year')?.addEventListener('click', closeCycleYear);
  document.getElementById('cycle-year-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'cycle-year-overlay') closeCycleYear();
  });
  document.getElementById('cycle-yr-prev')?.addEventListener('click', () => { cycleYearShown--; renderCycleYearGrid(); });
  document.getElementById('cycle-yr-next')?.addEventListener('click', () => { cycleYearShown++; renderCycleYearGrid(); });
}

function hexAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}
