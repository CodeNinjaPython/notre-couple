/**
 * intimacy-calendar.js — Calendrier mensuel de suivi de la sexualité (onglet Intime).
 * Calqué sur le calendrier de cycle : grille mensuelle, jours marqués selon
 * l'activité (rapport / solo / orgasme), clic d'un jour → détail + ajout d'un moment.
 * Source : intimate_sessions (+ feedback orgasmes, + tags).
 */
import { supabase } from './supabase.js';
import { localDateStr } from './date-utils.js';
import { loadAndEditSession, deleteSession } from './intimacy-sessions.js';

const MONTH_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const DAY_FR = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const cal = { year: 0, month: 0, byDate: {}, st: null, coupleId: null, elleId: null, luiId: null, onAddMoment: null, selected: null, filter: 'both' };
let listenerBound = false;

// Le moment correspond-il au filtre courant ? Un moment « à deux » compte pour
// les deux ; un solo ne compte que pour son auteur.
function sessionMatchesFilter(s) {
  if (cal.filter === 'both') return true;
  if (!s.solo) return true; // à deux → visible dans Elle ET Lui
  return cal.filter === 'elle' ? s.created_by === cal.elleId : s.created_by === cal.luiId;
}

// Drapeaux d'affichage d'un jour, restreints au filtre courant.
function dayFlags(e) {
  const f = { couple: false, soloElle: false, soloLui: false, orgasm: false };
  for (const s of e.sessions) {
    if (!sessionMatchesFilter(s)) continue;
    if (s.solo) { if (s.created_by === cal.elleId) f.soloElle = true; else f.soloLui = true; }
    else f.couple = true;
    if (s.orgasms > 0) f.orgasm = true;
  }
  f.any = f.couple || f.soloElle || f.soloLui;
  return f;
}

export async function initIntimacyCalendar(st, onAddMoment) {
  const grid = document.getElementById('intime-cal-grid');
  if (!grid) return;
  cal.st = st;
  cal.coupleId = st?.coupleId;
  cal.elleId = st?.me?.tracks_cycle ? st.me.user_id : st?.partner?.user_id;
  cal.luiId  = st?.me?.tracks_cycle ? st?.partner?.user_id : st?.me?.user_id;
  cal.onAddMoment = onAddMoment;
  cal.selected = null;
  const now = new Date();
  cal.year = now.getFullYear();
  cal.month = now.getMonth();
  await loadSessions();
  renderGrid();
  bindNav();

  // Rechargement auto après une sauvegarde de session (lié une seule fois).
  if (!listenerBound) {
    listenerBound = true;
    document.addEventListener('nc:session-saved', () => {
      if (document.getElementById('intime-cal-grid')) refreshIntimacyCalendar();
    });
  }
}

// Recharge les sessions et re-rend la grille (+ le détail ouvert le cas échéant).
export async function refreshIntimacyCalendar() {
  if (!cal.coupleId || !document.getElementById('intime-cal-grid')) return;
  await loadSessions();
  renderGrid();
  if (cal.selected) showDay(cal.selected);
}

async function loadSessions() {
  cal.byDate = {};
  if (!cal.coupleId) return;
  const { data } = await supabase.from('intimate_sessions')
    .select('id, session_date, note, duration_min, created_by, session_feedback(orgasms), session_activities(tags)')
    .eq('couple_id', cal.coupleId)
    .order('session_date', { ascending: false });

  for (const s of (data || [])) {
    if (!s.session_date) continue;
    const tags = (s.session_activities || []).flatMap(a => a.tags || []);
    const orgasms = (s.session_feedback || []).reduce((n, f) => n + (f.orgasms || 0), 0);
    const solo = tags.includes('solo');
    const e = cal.byDate[s.session_date] || (cal.byDate[s.session_date] =
      { count: 0, couple: false, soloElle: false, soloLui: false, orgasm: false, sessions: [] });
    e.count++;
    if (solo) {
      if (s.created_by === cal.elleId) e.soloElle = true;
      else e.soloLui = true; // par défaut côté lui si auteur inconnu
    } else {
      e.couple = true;
    }
    e.orgasm = e.orgasm || orgasms > 0;
    e.sessions.push({ ...s, tags, orgasms, solo });
  }

  // Données sexuelles du journal (import Clue / saisie quotidienne) → pseudo-moments,
  // pour que la sexualité apparaisse aussi dans l'agenda Intime (lecture seule :
  // pas d'id de session, donc ni édition ni suppression depuis ici).
  const { data: journals } = await supabase.from('log_entries')
    .select('log_date, user_id, value')
    .eq('category_id', 'journal');

  for (const r of (journals || [])) {
    const j = r.value?.v ?? r.value;
    if (!j) continue;
    const hasCouple = j.rapports && j.rapports !== 'pas_sexe';
    const prat      = Array.isArray(j.libidoPratiques) ? j.libidoPratiques : [];
    const hasSolo   = prat.includes('masturbation');
    const orgasms   = j.orgasme ? 1 : 0;
    if (!hasCouple && !hasSolo && !orgasms) continue;

    const e = cal.byDate[r.log_date] || (cal.byDate[r.log_date] =
      { count: 0, couple: false, soloElle: false, soloLui: false, orgasm: false, sessions: [] });

    if (hasSolo) {
      if (r.user_id === cal.elleId) e.soloElle = true; else e.soloLui = true;
      e.sessions.push({ id: null, fromJournal: true, created_by: r.user_id, solo: true, orgasms, tags: [], note: null });
    }
    if (hasCouple || (orgasms && !hasSolo)) {
      e.couple = true;
      e.sessions.push({ id: null, fromJournal: true, created_by: r.user_id, solo: false, orgasms, tags: [], note: null });
    }
    e.orgasm = e.orgasm || orgasms > 0;
  }
}

function renderGrid() {
  const grid = document.getElementById('intime-cal-grid');
  const title = document.getElementById('intime-cal-title');
  if (!grid) return;
  if (title) title.textContent = `${MONTH_FR[cal.month]} ${cal.year}`;

  const today = localDateStr();
  const firstWeekday = (new Date(cal.year, cal.month, 1).getDay() + 6) % 7; // 0 = lundi
  const daysInMonth = new Date(cal.year, cal.month + 1, 0).getDate();

  let html = DAY_FR.map(d => `<div class="cal-day-header">${d}</div>`).join('');
  for (let i = 0; i < firstWeekday; i++) html += '<div class="cal-cell empty"></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${cal.year}-${String(cal.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const e = cal.byDate[dateStr];
    let cls = 'cal-cell';
    if (dateStr === today) cls += ' today';
    if (dateStr > today) cls += ' future';
    if (cal.selected === dateStr) cls += ' cal-cell--sel';

    let dots = '';
    if (e) {
      const f = dayFlags(e);
      if (f.any) {
        dots = '<div class="cal-dots">'
          + (f.couple ? '<i class="cal-dot" style="background:var(--intime-gold)"></i>' : '')      // à deux = or
          + (f.soloElle ? '<i class="cal-dot" style="background:var(--elle)"></i>' : '') // solo elle = rose
          + (f.soloLui ? '<i class="cal-dot" style="background:var(--lui)"></i>' : '')   // solo lui = bleu
          + (f.orgasm ? '<i class="cal-dot" style="background:var(--violet)"></i>' : '')
          + '</div>';
      }
    }
    html += `<div class="${cls}" data-date="${dateStr}"><span class="cal-num">${d}</span>${dots}</div>`;
  }
  grid.innerHTML = html;
  grid.querySelectorAll('.cal-cell[data-date]').forEach(cell => {
    cell.addEventListener('click', () => showDay(cell.dataset.date));
  });
}

function showDay(dateStr) {
  cal.selected = dateStr;
  renderGrid();
  const detail = document.getElementById('intime-cal-detail');
  if (!detail) return;

  const e = cal.byDate[dateStr];
  const human = new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const future = dateStr > localDateStr();

  const visibleSessions = e ? e.sessions.filter(sessionMatchesFilter) : [];
  let body = `<div class="intime-cal-day-title">${human}</div>`;
  if (visibleSessions.length) {
    body += visibleSessions.map(s => {
      const who = s.solo
        ? (s.created_by === cal.elleId ? 'Solo (elle)' : s.created_by === cal.luiId ? 'Solo (lui)' : 'Solo')
        : 'À deux';
      const meta = [who];
      if (s.duration_min) meta.push(`${s.duration_min} min`);
      if (s.orgasms) meta.push(`${s.orgasms} orgasme${s.orgasms > 1 ? 's' : ''}`);
      if (s.fromJournal) meta.push('journal');
      const tagStr = (s.tags || []).filter(t => t !== 'solo').slice(0, 8)
        .map(t => `<span class="intime-tag">${escapeHtml(t)}</span>`).join('');
      // Les pseudo-moments du journal n'ont pas d'id de session → pas d'actions.
      const actions = s.fromJournal ? '' : `
          <div class="intime-cal-session-actions">
            <button type="button" class="cal-sess-edit" data-id="${s.id}" aria-label="Modifier ce moment">✏️</button>
            <button type="button" class="cal-sess-del" data-id="${s.id}" aria-label="Supprimer ce moment">×</button>
          </div>`;
      return `<div class="intime-cal-session"${s.id ? ` data-id="${s.id}"` : ''}>
        <div class="intime-cal-session-head">
          <div class="intime-cal-session-meta">${meta.join(' · ')}</div>${actions}
        </div>
        ${s.note ? `<div class="intime-cal-session-note">${escapeHtml(s.note)}</div>` : ''}
        ${tagStr ? `<div class="intime-cal-tags">${tagStr}</div>` : ''}
      </div>`;
    }).join('');
  } else {
    body += '<p class="intime-empty">Aucun moment ce jour.</p>';
  }
  if (!future) {
    body += '<button type="button" class="btn-secondary" id="intime-cal-add" style="margin-top:12px">+ Noter un moment ce jour</button>';
  }
  detail.innerHTML = body;
  document.getElementById('intime-cal-add')?.addEventListener('click', () => cal.onAddMoment?.(dateStr));

  // Éditer / supprimer un moment directement depuis le calendrier.
  detail.querySelectorAll('.cal-sess-edit').forEach(b =>
    b.addEventListener('click', () => loadAndEditSession(b.dataset.id, cal.st)));
  detail.querySelectorAll('.cal-sess-del').forEach(b =>
    b.addEventListener('click', () => deleteSession(b.dataset.id, cal.st)));
  // (deleteSession émet nc:session-saved → le calendrier se recharge tout seul.)
}

let yearShown = new Date().getFullYear();
let cyclePeriods = [];

async function loadCyclePeriods() {
  if (!cal.coupleId) return;
  const { data } = await supabase.from('cycles')
    .select('period_start, period_end')
    .order('period_start', { ascending: false });
  cyclePeriods = data || [];
}

function renderYearGrid() {
  const listContainer = document.getElementById('intime-year-months-list');
  const titleContainer = document.getElementById('intime-yr-title');
  if (!listContainer || !titleContainer) return;

  titleContainer.textContent = String(yearShown);

  const periodDays = new Set();
  for (const c of cyclePeriods) {
    if (!c.period_start) continue;
    const s = new Date(c.period_start + 'T12:00:00');
    const e = c.period_end ? new Date(c.period_end + 'T12:00:00') : s;
    for (let d = new Date(s); d <= e; d = new Date(d.getTime() + 864e5)) {
      periodDays.add(localDateStr(d));
    }
  }

  const intimacyDays = new Set(Object.keys(cal.byDate));
  const today = localDateStr();

  let html = '';
  for (let m = 0; m < 12; m++) {
    const daysInMonth = new Date(yearShown, m + 1, 0).getDate();
    const firstWeekday = (new Date(yearShown, m, 1).getDay() + 6) % 7; // 0 = Lundi

    let dayHeaders = DAY_FR.map(d => `<div class="intime-year-day-header">${d}</div>`).join('');
    let cells = '';
    
    for (let i = 0; i < firstWeekday; i++) {
      cells += '<span class="yr-cell empty"></span>';
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${yearShown}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      let cls = 'yr-cell';
      if (periodDays.has(ds)) cls += ' period';
      if (intimacyDays.has(ds)) cls += ' intimacy';
      if (ds === today) cls += ' today';
      cells += `<span class="${cls}"></span>`;
    }

    html += `
      <div class="intime-year-grid-item">
        <div class="intime-year-month-title">${MONTH_FR[m]}</div>
        <div class="intime-year-month-grid">
          ${dayHeaders}
          ${cells}
        </div>
      </div>
    `;
  }
  listContainer.innerHTML = html;
}

async function openYearOverlay() {
  const overlay = document.getElementById('intime-year-overlay');
  if (overlay) {
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
  }
  await loadCyclePeriods();
  renderYearGrid();
}

function closeYearOverlay() {
  const overlay = document.getElementById('intime-year-overlay');
  if (overlay) {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
  }
  const toggleButtons = document.querySelectorAll('#toggle-intime-view button');
  toggleButtons.forEach(btn => {
    btn.classList.toggle('on', btn.dataset.view === 'month');
  });
}

function bindNav() {
  document.getElementById('intime-cal-prev')?.addEventListener('click', () => shiftMonth(-1));
  document.getElementById('intime-cal-next')?.addEventListener('click', () => shiftMonth(1));

  // Toggle Mois / Année
  const toggleButtons = document.querySelectorAll('#toggle-intime-view button');
  toggleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      toggleButtons.forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      const view = btn.dataset.view;
      if (view === 'year') {
        openYearOverlay();
      } else {
        closeYearOverlay();
      }
    });
  });

  // Fermer la vue Année
  document.getElementById('btn-close-intime-year')?.addEventListener('click', closeYearOverlay);
  document.getElementById('intime-year-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'intime-year-overlay') closeYearOverlay();
  });

  // Navigation par année dans la vue Année
  document.getElementById('intime-yr-prev')?.addEventListener('click', () => {
    yearShown--;
    renderYearGrid();
  });
  document.getElementById('intime-yr-next')?.addEventListener('click', () => {
    yearShown++;
    renderYearGrid();
  });

  // Filtre Les deux / Elle / Lui
  document.querySelectorAll('#intime-cal-filter .cal-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      cal.filter = btn.dataset.filter;
      document.querySelectorAll('#intime-cal-filter .cal-filter-btn')
        .forEach(b => b.classList.toggle('on', b === btn));
      renderGrid();
      if (cal.selected) showDay(cal.selected);
    });
  });
}

function shiftMonth(delta) {
  cal.month += delta;
  if (cal.month < 0) { cal.month = 11; cal.year--; }
  else if (cal.month > 11) { cal.month = 0; cal.year++; }
  renderGrid();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
