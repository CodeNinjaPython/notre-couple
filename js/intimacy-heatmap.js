/**
 * intimacy-heatmap.js — Grille mensuelle dédiée aux sessions intimes.
 * Dots superposés (rouge=session, rose=libido forte, vert=orgasme couple, or=satisfaction élevée).
 * Tooltip riche au tap. Filtres actifs (Tout / Sessions / Libido / Orgasme / Satisfaction).
 */
import { supabase } from './supabase.js';
import { localDateStr } from './date-utils.js';

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin',
                   'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS_FR   = ['L','M','M','J','V','S','D'];

const FILTERS = [
  { id: 'all',          label: 'Tout' },
  { id: 'session',      label: 'Sessions' },
  { id: 'libido',       label: 'Libido haute' },
  { id: 'orgasme',      label: 'Orgasme ×2' },
  { id: 'satisfaction', label: 'Satisfaction ≥8' },
];

let _state = null;

/**
 * Rend la heatmap dans un conteneur.
 * @param {Element} container
 * @param {{ coupleId: string, elleId: string }} opts
 */
export async function renderIntimacyHeatmap(container, { coupleId, elleId }, data) {
  if (!container) return;
  const now = new Date();
  _state = {
    container, coupleId, elleId,
    year: now.getFullYear(), month: now.getMonth(),
    sessions: {}, entries: {}, filter: 'all', allData: data,
  };
  _processDataForCurrentMonth();
  _mount();
}

// ── Chargement ─────────────────────────────────────────────────────────────

function _processDataForCurrentMonth() {
  const { year, month, allData } = _state;
  const first = `${year}-${String(month + 1).padStart(2,'0')}-01`;
  const last  = localDateStr(new Date(year, month + 1, 0));

  const sessDates = (allData.sessions || []).filter(s => s.session_date >= first && s.session_date <= last);
  const logs = (allData.entries || []).filter(e => e.log_date >= first && e.log_date <= last);
  const feedbacks = (allData.feedbacks || []).filter(f => sessDates.some(s => s.id === f.session_id));

  // Sessions map: session_date → [{...session, feedbacks:[]}]
  const sessMap = {};
  const fbMap   = {};
  (feedbacks || []).forEach(f => {
    if (!fbMap[f.session_id]) fbMap[f.session_id] = [];
    fbMap[f.session_id].push(f);
  });
  (sessDates || []).forEach(s => {
    const dateKey = s.session_date;
    if (!sessMap[dateKey]) sessMap[dateKey] = [];
    sessMap[dateKey].push({ ...s, feedbacks: fbMap[s.id] || [] });
  });
  _state.sessions = sessMap;

  // Entries map: log_date → value (DailyLog serialized)
  const entMap = {};
  (logs || []).forEach(e => { entMap[e.log_date] = e.value ?? {}; });
  _state.entries = entMap;
}

// ── Montage ────────────────────────────────────────────────────────────────

function _mount() {
  const { container } = _state;
  container.innerHTML = `
    <div class="ihm-wrap">
      <div class="ihm-header">
        <button class="ihm-nav-btn" id="ihm-prev" aria-label="Mois précédent">‹</button>
        <h3 class="ihm-title" id="ihm-title"></h3>
        <button class="ihm-nav-btn" id="ihm-next" aria-label="Mois suivant">›</button>
      </div>
      <div class="ihm-filters" role="group" aria-label="Filtres">
        ${FILTERS.map(f =>
          `<button type="button" class="ihm-filter${f.id === 'all' ? ' on' : ''}"
            data-filter="${f.id}">${f.label}</button>`
        ).join('')}
      </div>
      <div class="ihm-legend">
        <span><span class="ihm-dot ihm-dot-session"></span> Session</span>
        <span><span class="ihm-dot ihm-dot-libido"></span> Libido forte</span>
        <span><span class="ihm-dot ihm-dot-orgasme"></span> Orgasme ×2</span>
        <span><span class="ihm-dot ihm-dot-sat"></span> Satisfaction ≥8</span>
      </div>
      <div class="ihm-grid" id="ihm-grid" role="grid"></div>
      <div class="ihm-tooltip" id="ihm-tooltip" role="tooltip" hidden></div>
    </div>`;

  _renderGrid();

  container.querySelector('#ihm-prev').addEventListener('click', async () => {
    _state.month--; if (_state.month < 0) { _state.month = 11; _state.year--; }
    _processDataForCurrentMonth(); _renderGrid();
  });
  container.querySelector('#ihm-next').addEventListener('click', async () => {
    _state.month++; if (_state.month > 11) { _state.month = 0; _state.year++; }
    _processDataForCurrentMonth(); _renderGrid();
  });
  container.querySelectorAll('.ihm-filter').forEach(btn =>
    btn.addEventListener('click', () => {
      _state.filter = btn.dataset.filter;
      container.querySelectorAll('.ihm-filter').forEach(b => b.classList.toggle('on', b === btn));
      _renderGrid();
    })
  );
}

// ── Grille ─────────────────────────────────────────────────────────────────

function _renderGrid() {
  const { container, year, month, sessions, entries, filter } = _state;
  const grid = container.querySelector('#ihm-grid');
  const title = container.querySelector('#ihm-title');
  if (!grid) return;

  title.textContent = `${MONTHS_FR[month]} ${year}`;

  const today        = localDateStr();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth  = new Date(year, month + 1, 0).getDate();

  let html = DAYS_FR.map(d => `<div class="ihm-day-header">${d}</div>`).join('');
  for (let i = 0; i < firstWeekday; i++) html += '<div class="ihm-cell empty"></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    const ds    = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const sess  = sessions[ds] || [];
    const entry = entries[ds]  || {};

    const hasSession = sess.length > 0;
    const highLibido = (entry.libidoScale ?? 0) >= 4;
    const bothOrgasm = sess.some(s => {
      const e = s.feedbacks.find(f => f.user_id === _state.elleId);
      const l = s.feedbacks.find(f => f.user_id !== _state.elleId);
      return (e?.orgasms ?? 0) > 0 && (l?.orgasms ?? 0) > 0;
    });
    const highSat = sess.some(s => {
      const fb = s.feedbacks.find(f => f.user_id === _state.elleId);
      return (fb?.satisfaction ?? 0) >= 8;
    });

    const show = filter === 'all'
      || (filter === 'session'      && hasSession)
      || (filter === 'libido'       && highLibido)
      || (filter === 'orgasme'      && bothOrgasm)
      || (filter === 'satisfaction' && highSat);

    let dots = '';
    if (show) {
      if (hasSession)  dots += '<span class="ihm-dot ihm-dot-session"></span>';
      if (highLibido)  dots += '<span class="ihm-dot ihm-dot-libido"></span>';
      if (bothOrgasm)  dots += '<span class="ihm-dot ihm-dot-orgasme"></span>';
      if (highSat)     dots += '<span class="ihm-dot ihm-dot-sat"></span>';
    }

    const intensity = Math.min(sess.length, 3);

    html += `<div
      class="ihm-cell${ds === today ? ' today' : ''}${hasSession ? ` has-session intensity-${intensity}` : ''}"
      data-date="${ds}" role="gridcell" tabindex="0"
      aria-label="${d} ${MONTHS_FR[month]}${hasSession ? ' — session' : ''}">
      <span class="ihm-day-num">${d}</span>
      <div class="ihm-dots">${dots}</div>
    </div>`;
  }

  grid.innerHTML = html;

  grid.querySelectorAll('.ihm-cell[data-date]').forEach(cell => {
    const show = () => _showTooltip(cell.dataset.date);
    cell.addEventListener('click', show);
    cell.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') show(); });
  });
}

// ── Tooltip ────────────────────────────────────────────────────────────────

function _showTooltip(dateStr) {
  const { container, sessions, entries } = _state;
  const tt    = container.querySelector('#ihm-tooltip');
  if (!tt || !dateStr) return;

  const sess  = sessions[dateStr] || [];
  const entry = entries[dateStr]  || {};
  const dateDisplay = new Date(dateStr + 'T12:00:00')
    .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  if (!sess.length && !Object.keys(entry).length) { tt.hidden = true; return; }

  let html = `<div class="ihm-tt-header">
    <span class="ihm-tt-date">${dateDisplay}</span>
    <button type="button" class="ihm-tt-close" aria-label="Fermer">×</button>
  </div>`;

  sess.forEach(s => {
    const eleFb = s.feedbacks.find(f => f.user_id === _state.elleId);
    html += `<div class="ihm-tt-session">
      <span class="ihm-tt-icon">❤️</span>
      <div class="ihm-tt-body">
        ${s.duration_min ? `<div>Durée : <strong>${s.duration_min} min</strong></div>` : ''}
        ${s.mood        ? `<div>Humeur : <strong>${s.mood}</strong></div>` : ''}
        ${eleFb?.satisfaction ? `<div>Satisfaction : <strong>${eleFb.satisfaction}/10</strong></div>` : ''}
        ${(eleFb?.orgasms ?? 0) > 0 ? `<div>Orgasmes (toi) : <strong>${eleFb.orgasms}</strong></div>` : ''}
      </div>
    </div>`;
  });

  if (entry.libidoScale) {
    html += `<div class="ihm-tt-row">Libido : <strong>${'●'.repeat(entry.libidoScale)}${'○'.repeat(5 - entry.libidoScale)}</strong></div>`;
  }
  if (entry.stressCouple && entry.stressCouple !== 'aucun') {
    const labels = { tension:'Tensions', dispute:'Dispute', reconciliation:'Réconciliation', bonne_ambiance:'Super bien' };
    html += `<div class="ihm-tt-row">Couple : <strong>${labels[entry.stressCouple] || entry.stressCouple}</strong></div>`;
  }
  if (entry.emotions?.length) {
    html += `<div class="ihm-tt-row">Humeur : <strong>${entry.emotions.slice(0,3).join(', ')}</strong></div>`;
  }

  tt.innerHTML = html;
  tt.hidden = false;

  tt.querySelector('.ihm-tt-close').addEventListener('click', () => { tt.hidden = true; }, { once: true });
  // Fermer si clic en dehors du tooltip
  const outside = e => {
    if (!tt.contains(e.target) && !e.target.closest('.ihm-cell')) {
      tt.hidden = true; document.removeEventListener('click', outside);
    }
  };
  setTimeout(() => document.addEventListener('click', outside), 50);
}
