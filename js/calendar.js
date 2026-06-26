import { supabase } from './supabase.js';
import { getMyMembership } from './pairing.js';
import { getCycleHistory, predictNextPeriod } from './cycles.js';
import { localDateStr } from './date-utils.js';
import { renderSymptomTracker } from './symptoms.js';
import { initCollapsibles } from './collapse.js';
import { DailyLog, computeCyclePrediction } from './cycle-model.js';
import { renderLogCategoryAccordion, renderCalendarDaySummary } from './daily-log-ui.js';
import { getCycleMode } from './onboarding.js';

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
  calState.me = await getMyMembership();
  calState.cycles = await getCycleHistory(12);
  calState.prediction = predictNextPeriod(calState.cycles);

  document.getElementById('today-date').textContent =
    new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  await loadMonthEntries();
  renderCalendar();
  bindNav();

  // Saisie DailyLog — accordéon complet
  const dlWrap = document.getElementById('daily-log-form');
  if (dlWrap && calState.me) {
    const today = localDateStr();
    const { data: existing } = await supabase.from('log_entries')
      .select('*').eq('log_date', today).eq('category_id', 'journal').maybeSingle();
    const log = existing ? DailyLog.fromDB(existing) : new DailyLog({ date: today, userId: calState.me.user_id });

    renderLogCategoryAccordion(dlWrap, log, async (updatedLog) => {
      await supabase.from('log_entries').upsert(
        { ...updatedLog.toDBEntry(), user_id: calState.me.user_id },
        { onConflict: 'user_id,log_date,category_id' }
      );
      // Toast
      let toast = document.getElementById('toast');
      if (!toast) { toast = document.createElement('div'); toast.id = 'toast'; toast.className = 'toast'; document.body.appendChild(toast); }
      toast.textContent = 'Enregistré ✓';
      toast.classList.add('show');
      clearTimeout(toast._t);
      toast._t = setTimeout(() => toast.classList.remove('show'), 2500);
    });
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
      // Flux (rouge) — depuis journal ou ancien 'flow'
      const hasFlux = (journal?.fluxMenstruel && journal.fluxMenstruel !== 'aucun')
                   || (entry.flow != null);
      if (hasFlux) dots += '<span class="cal-dot cal-dot-flux" title="Flux"></span>';

      // Douleurs (bleu)
      const hasDouleurs = (journal?.douleursPelviennes?.length || journal?.douleursCorps?.length)
                       || (entry.cramps != null);
      if (hasDouleurs) dots += '<span class="cal-dot cal-dot-douleurs" title="Douleurs"></span>';

      // Humeur/Émotions (orange)
      const hasEmotion = (journal?.emotions?.length || journal?.etatCognitif?.length)
                      || (entry.mood != null);
      if (hasEmotion) dots += '<span class="cal-dot cal-dot-emotions" title="Humeur"></span>';

      // Sexualité (vert)
      const hasSexu = journal?.rapports && journal.rapports !== 'pas_sexe';
      if (hasSexu) dots += '<span class="cal-dot cal-dot-sexu" title="Sexualité"></span>';

      // Énergie/Sommeil (ambre)
      if (journal?.niveauEnergie || entry.energy != null)
        dots += '<span class="cal-dot cal-dot-energie" title="Énergie"></span>';
    }

    let phaseBg = '';
    if (phase) {
      const col = PHASES.find(([a,b,l]) => l === phase)?.[3] || '#D9B36A';
      phaseBg = `style="background: ${hexAlpha(col, isFuture ? .06 : .12)}; border-color: ${hexAlpha(col, .25)};"`;
    } else if (pred === 'period') {
      phaseBg = `style="background: rgba(201,138,106,.06); border-color: rgba(201,138,106,.2);" title="Règles prévues"`;
    } else if (pred === 'fertile') {
      phaseBg = `style="background: rgba(217,179,106,.05); border-color: rgba(217,179,106,.18);" title="Fenêtre fertile probable"`;
    }

    html += `<div class="${cls}" data-date="${dateStr}" ${phaseBg}>
      <span class="cal-num">${d}</span>
      <div class="cal-dots">${dots}</div>
    </div>`;
  }

  grid.innerHTML = html;

  // Tap on a day → show detail
  grid.querySelectorAll('.cal-cell[data-date]').forEach(cell => {
    cell.addEventListener('click', () => showDayDetail(cell.dataset.date));
  });
}

function buildPhaseMap() {
  const map = {};
  calState.cycles.forEach(cycle => {
    const start = new Date(cycle.period_start);
    const end   = cycle.period_end
      ? new Date(cycle.period_end)
      : new Date(); // cycle ouvert → jusqu'à aujourd'hui

    // Jour 1 = period_start
    for (let d = 0; d <= 90; d++) {
      const date = new Date(start.getTime() + d * 864e5);
      const dateStr = localDateStr(date);
      if (date > end && d > 7) break; // au-delà de la fin des règles, pas de marqueur flow
      const cycleDay = d + 1;
      const phase = PHASES.find(([a,b]) => cycleDay >= a && cycleDay <= b);
      if (phase && !map[dateStr]) map[dateStr] = phase[2];
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
  const nextPeriod = new Date(p.nextPeriodDate);
  for (let i = 0; i < 5; i++) {
    const d = new Date(nextPeriod.getTime() + i * 864e5);
    map[localDateStr(d)] = 'period';
  }
  // Fenêtre fertile : 5 jours avant ovulation jusqu'à ovulation
  const fertile = new Date(p.fertileStart);
  const ovul    = new Date(p.ovulationDate);
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
  const fmt = d => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  panel.innerHTML = `
    <div class="pred-row">
      <div class="pred-item">
        <div class="pred-label">Prochaines règles</div>
        <div class="pred-val" style="color:var(--rose)">${fmt(p.nextPeriodDate)}</div>
      </div>
      <div class="pred-item">
        <div class="pred-label">Ovulation estimée</div>
        <div class="pred-val" style="color:var(--gold)">${fmt(p.ovulationDate)}</div>
      </div>
      <div class="pred-item">
        <div class="pred-label">Cycle moyen</div>
        <div class="pred-val">${p.avgCycleLength} jours</div>
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

async function showDayDetail(dateStr) {
  const detail = document.getElementById('day-detail');
  const title  = document.getElementById('day-detail-date');
  const body   = document.getElementById('day-detail-body');
  if (!detail) return;

  title.textContent = new Date(dateStr + 'T12:00:00')
    .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  // Chercher le journal DailyLog du jour (category_id = 'journal')
  let log = null;
  try {
    const { data } = await supabase.from('log_entries')
      .select('*').eq('log_date', dateStr).eq('category_id', 'journal').maybeSingle();
    if (data) log = DailyLog.fromDB(data);
  } catch (_) {}

  // Calculer le jour et la phase dans le cycle
  const pred = computeCyclePrediction(calState.cycles || []);
  const cycleDay   = pred?.jourDuCycleActuel ?? null;
  const phaseName  = pred?.phaseDuCycle     ?? null;

  renderCalendarDaySummary(body, log, cycleDay, phaseName, dateStr);

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

function hexAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}
