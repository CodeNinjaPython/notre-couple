/**
 * ring-chart.js — Visualisations SVG du cycle menstruel.
 *   1. renderCycleRing()    — anneau de progression interactif (écran Aujourd'hui)
 *   2. renderHistoryChart() — graphique en barres horizontales (écran Analyse)
 * Vanilla JS + SVG natif, aucune librairie externe.
 */
import { localDateStr, diffDays, addDays } from './date-utils.js';

// ─── Couleurs par phase (cohérentes avec le design system) ─────────────────
const COLORS = {
  menstruelle:  '#E53935',
  fertile:      '#4278C4',
  ovulation:    '#7C5CFC',
  luteale:      '#E84375',
  folliculaire: '#93C5FD',
  default:      'var(--line)',
  today:        '#FFFFFF',
};

// ─── 1. Anneau de progression (Today) ─────────────────────────────────────

/**
 * @param {Element} container  — div recevant le SVG
 * @param {Object}  params     — {
 *   totalDays, currentDay,
 *   periodDays, fertileStart, fertileEnd, ovulationDay,
 *   phaseName,
 *   loggedDays?  : Set<number>  (jours avec données saisies)
 * }
 */
export function renderCycleRing(container, params = {}) {
  if (!container) return;

  const {
    totalDays    = 30,
    currentDay   = 1,
    periodDays   = 5,
    fertileStart = 9,
    fertileEnd   = 15,
    ovulationDay = 14,
    phaseName    = '',
    loggedDays   = new Set(),
  } = params;

  const W = 300, H = 300;
  const CX = 150, CY = 150;
  const R  = 106;   // rayon de l'anneau
  const SW = 20;    // épaisseur de l'anneau
  const TAU = Math.PI * 2;
  const GAP_RAD = 0.05;  // espacement entre segments (radians)

  // ─── Couleur d'un jour de cycle ──────────────────────────────────────────
  function segmentColor(day) {
    if (day <= periodDays)                     return COLORS.menstruelle;
    if (day === ovulationDay)                  return COLORS.ovulation;
    if (day >= fertileStart && day <= fertileEnd) return COLORS.fertile;
    if (day > totalDays - 6)                  return COLORS.luteale;
    return COLORS.default;
  }

  // ─── Path d'un arc de segment ────────────────────────────────────────────
  function arcPath(dayIndex) {
    const startAngle = (dayIndex / totalDays) * TAU - TAU / 4 + GAP_RAD / 2;
    const endAngle   = ((dayIndex + 1) / totalDays) * TAU - TAU / 4 - GAP_RAD / 2;
    const x1 = (CX + R * Math.cos(startAngle)).toFixed(3);
    const y1 = (CY + R * Math.sin(startAngle)).toFixed(3);
    const x2 = (CX + R * Math.cos(endAngle)).toFixed(3);
    const y2 = (CY + R * Math.sin(endAngle)).toFixed(3);
    return `M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2}`;
  }

  // ─── Génération des segments ──────────────────────────────────────────────
  let segments = '';
  for (let i = 0; i < totalDays; i++) {
    const day      = i + 1;
    const isCurrent = day === currentDay;
    const color    = segmentColor(day);
    const sw       = isCurrent ? SW + 6 : SW;
    const opacity  = isCurrent ? '1' : (color === COLORS.default ? '0.35' : '0.80');

    segments += `<path
      d="${arcPath(i)}"
      fill="none"
      stroke="${color}"
      stroke-width="${sw}"
      stroke-linecap="round"
      opacity="${opacity}"
      ${isCurrent ? 'class="ring-day-current"' : ''}
      role="img"
      aria-label="Jour ${day}${isCurrent ? ' (aujourd\'hui)' : ''}"/>`;
  }

  // ─── Pastille du jour actuel ──────────────────────────────────────────────
  const curAngle = ((currentDay - 0.5) / totalDays) * TAU - TAU / 4;
  const dotX = (CX + R * Math.cos(curAngle)).toFixed(2);
  const dotY = (CY + R * Math.sin(curAngle)).toFixed(2);
  const dotColor = segmentColor(currentDay);

  // ─── Textes centraux ──────────────────────────────────────────────────────
  // Jour
  const dayText     = `<text x="${CX}" y="${CY - 20}" text-anchor="middle"
    font-family="'DM Mono',monospace" font-size="52" font-weight="700"
    fill="var(--text)" letter-spacing="-2">${currentDay}</text>`;
  // "Jour X / N"
  const subText     = `<text x="${CX}" y="${CY + 12}" text-anchor="middle"
    font-family="'DM Mono',monospace" font-size="11"
    fill="var(--faint)" letter-spacing=".04em">/ ${totalDays} jours</text>`;
  // Phase
  const phaseText   = `<text x="${CX}" y="${CY + 36}" text-anchor="middle"
    font-family="'DM Sans',sans-serif" font-size="12" font-weight="700"
    fill="${dotColor}">${phaseName}</text>`;

  // ─── Balises de données saisies (petits points intérieurs) ───────────────
  let loggedDots = '';
  const INNER_R = R - SW / 2 - 10;
  loggedDays.forEach(day => {
    const angle = ((day - 0.5) / totalDays) * TAU - TAU / 4;
    const x = (CX + INNER_R * Math.cos(angle)).toFixed(2);
    const y = (CY + INNER_R * Math.sin(angle)).toFixed(2);
    loggedDots += `<circle cx="${x}" cy="${y}" r="3" fill="var(--elle)" opacity=".6"
      aria-label="Données saisies - Jour ${day}"/>`;
  });

  // ─── Assemblage SVG ───────────────────────────────────────────────────────
  const svg = `<svg viewBox="0 0 ${W} ${H}" class="cycle-ring"
    role="img" aria-label="Anneau du cycle - Jour ${currentDay} sur ${totalDays}">
    <defs>
      <filter id="ring-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    ${segments}
    ${loggedDots}

    <!-- Pastille jour actuel -->
    <circle cx="${dotX}" cy="${dotY}" r="14" fill="${dotColor}"
      filter="url(#ring-glow)" opacity=".3"/>
    <circle cx="${dotX}" cy="${dotY}" r="9" fill="${dotColor}"/>
    <circle cx="${dotX}" cy="${dotY}" r="4" fill="white"/>

    <!-- Textes centraux -->
    ${dayText}
    ${subText}
    ${phaseText}
  </svg>`;

  container.innerHTML = svg;
}

// ─── Légende de l'anneau ──────────────────────────────────────────────────

export function renderRingLegend(container) {
  if (!container) return;
  container.innerHTML = `
    <div class="ring-legend">
      <span class="ring-legend-item">
        <i style="background:${COLORS.menstruelle}"></i>Règles
      </span>
      <span class="ring-legend-item">
        <i style="background:${COLORS.fertile}"></i>Fertile
      </span>
      <span class="ring-legend-item">
        <i style="background:${COLORS.ovulation}"></i>Ovulation
      </span>
      <span class="ring-legend-item">
        <i style="background:${COLORS.luteale}"></i>Lutéale
      </span>
    </div>`;
}

// ─── 2. Graphique barres horizontales (Analyse) ───────────────────────────

/**
 * @param {Element} container  — div recevant le SVG
 * @param {Array}   cycles     — tableau de rows Supabase (period_start, period_end)
 * @param {number}  maxDisplay — nombre max de cycles affichés
 */
export function renderHistoryChart(container, cycles = [], maxDisplay = 6) {
  if (!container) return;
  if (!cycles.length) {
    container.innerHTML = '<p class="intime-empty">Pas encore assez de cycles pour afficher l\'historique.</p>';
    return;
  }

  const completed = cycles.filter(c => c.period_start).slice(0, maxDisplay).reverse();
  const W = 340, BAR_H = 26, BAR_GAP = 12, LABEL_W = 68;
  const BAR_MAX_W = W - LABEL_W - 42; // 42px pour le label durée à droite

  const durations = completed.map(c => {
    if (c.period_end) {
      return diffDays(c.period_end, c.period_start) + 1; // durée règles
    }
    return null;
  });

  // Durée du cycle = écart entre deux period_start consécutifs
  const cycleLengths = completed.map((c, i) => {
    const next = completed[i + 1];
    if (!next) return 28; // fallback
    return Math.max(15, Math.min(60, diffDays(c.period_start, next.period_start)));
  });

  const maxCycleLen = Math.max(...cycleLengths, 35);
  const H = completed.length * (BAR_H + BAR_GAP) + 24;

  let bars = '';

  completed.forEach((cycle, i) => {
    const y          = 12 + i * (BAR_H + BAR_GAP);
    const cycleLen   = cycleLengths[i];
    const reglesLen  = durations[i] || 5;
    const totalW     = (cycleLen / maxCycleLen) * BAR_MAX_W;

    const month = new Date(cycle.period_start + 'T12:00:00')
      .toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });

    // Segments dans la barre
    const reglesW    = ((Math.min(reglesLen, cycleLen) / maxCycleLen) * BAR_MAX_W);
    const ovDay      = cycleLen - 14;
    const ovX        = LABEL_W + (ovDay / maxCycleLen) * BAR_MAX_W;
    const fertileX   = LABEL_W + (Math.max(1, ovDay - 5) / maxCycleLen) * BAR_MAX_W;
    const fertileW   = (6 / maxCycleLen) * BAR_MAX_W;

    bars += `
      <!-- Label mois -->
      <text x="${LABEL_W - 6}" y="${y + BAR_H / 2 + 4}" text-anchor="end"
        font-family="'DM Mono',monospace" font-size="10"
        fill="var(--muted)">${month}</text>

      <!-- Barre de fond (durée totale cycle) -->
      <rect x="${LABEL_W}" y="${y}" width="${totalW.toFixed(1)}" height="${BAR_H}"
        rx="8" fill="var(--surface2)"/>

      <!-- Segment règles -->
      <rect x="${LABEL_W}" y="${y}" width="${reglesW.toFixed(1)}" height="${BAR_H}"
        rx="8" fill="${COLORS.menstruelle}" opacity=".85"/>

      <!-- Segment fenêtre fertile -->
      ${fertileX > LABEL_W + reglesW + 2 ? `
      <rect x="${fertileX.toFixed(1)}" y="${y + 3}"
        width="${fertileW.toFixed(1)}" height="${BAR_H - 6}"
        rx="4" fill="${COLORS.fertile}" opacity=".55"/>` : ''}

      <!-- Ligne ovulation -->
      ${ovX > LABEL_W + reglesW && ovX < LABEL_W + totalW ? `
      <rect x="${ovX.toFixed(1)}" y="${y}" width="3" height="${BAR_H}"
        rx="1.5" fill="${COLORS.ovulation}" opacity=".9"/>` : ''}

      <!-- Durée en jours -->
      <text x="${(LABEL_W + totalW + 6).toFixed(1)}" y="${y + BAR_H / 2 + 4}"
        font-family="'DM Mono',monospace" font-size="10"
        fill="var(--faint)">${cycleLen}j</text>`;
  });

  container.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px;overflow:visible"
      role="img" aria-label="Historique des cycles - ${completed.length} cycles">
      ${bars}
    </svg>
    <div class="chart-legend" role="list">
      <span role="listitem"><i style="background:${COLORS.menstruelle}"></i>Règles</span>
      <span role="listitem"><i style="background:${COLORS.fertile}"></i>Fenêtre fertile</span>
      <span role="listitem"><i style="background:${COLORS.ovulation}"></i>Ovulation estimée</span>
    </div>`;
}

// ─── 3. Écran de saisie rapide (DailyLog) ─────────────────────────────────

import {
  REGLES_ENUM, SPOTTING_ENUM, SEXUALITE_ENUM, OPK_ENUM,
  EMOTIONS_LIST, DOULEURS_LIST,
} from './cycle-model.js';

/**
 * Rend le formulaire de saisie rapide DailyLog dans un conteneur.
 * @param {Element}  container
 * @param {DailyLog} log        — état courant (éventuellement pré-rempli)
 * @param {Function} onSave     — callback(log) appelé à l'enregistrement
 */
export function renderDailyLogForm(container, log, onSave) {
  if (!container || !log) return;

  const _section = (id, label, content) => `
    <div class="dl-section" id="dl-sec-${id}">
      <div class="dl-section-label">${label}</div>
      <div class="dl-chips">${content}</div>
    </div>`;

  const _chip = (field, value, icon, label, selected) =>
    `<button type="button" class="dl-chip${selected ? ' sel' : ''}"
      data-field="${field}" data-value="${value}"
      aria-pressed="${selected}"
      aria-label="${label}">
      <span class="dl-chip-icon" aria-hidden="true">${icon}</span>
      <span class="dl-chip-label">${label}</span>
    </button>`;

  const html = `
    <!-- Flux -->
    ${_section('flux', '🩸 Flux menstruel',
      Object.entries(REGLES_ENUM).map(([v, d]) =>
        _chip('regles', v, d.icon, d.label, log.regles === v)
      ).join('')
    )}

    <!-- Spotting -->
    ${_section('spotting', '🔴 Spotting',
      [{ v: null, icon:'—', label:'Aucun' }, ...Object.entries(SPOTTING_ENUM).map(([v,d])=>({v,icon:d.icon,label:d.label}))]
        .map(({ v, icon, label }) =>
          _chip('spotting', v ?? 'null', icon, label, (log.spotting ?? 'null') === (v ?? 'null'))
        ).join('')
    )}

    <!-- Émotions -->
    ${_section('emotions', '😊 Émotions',
      EMOTIONS_LIST.map(e =>
        _chip('emotions', e.id, e.icon, e.label, log.emotions.includes(e.id))
      ).join('')
    )}

    <!-- Douleurs -->
    ${_section('douleurs', '💊 Douleurs',
      DOULEURS_LIST.map(d =>
        _chip('douleurs', d.id, d.icon, d.label, log.douleurs.includes(d.id))
      ).join('')
    )}

    <!-- Sexualité -->
    ${_section('sexualite', '💑 Sexualité',
      Object.entries(SEXUALITE_ENUM).map(([v, d]) =>
        _chip('sexualite', v, d.icon, d.label, log.sexualite === v)
      ).join('')
    )}

    <!-- Mesures -->
    <div class="dl-section">
      <div class="dl-section-label">🌡️ Mesures</div>
      <div class="dl-measures">
        <div class="bbt-input-wrap" style="flex:1">
          <input type="number" id="dl-bbt" class="bbt-input"
            min="35" max="39" step="0.1" placeholder="36.5"
            value="${log.mesures.temperatureBasale ?? ''}"
            aria-label="Température basale en degrés Celsius">
          <span class="bbt-unit">°C</span>
        </div>
        <div class="bbt-input-wrap" style="flex:1">
          <input type="number" id="dl-weight" class="bbt-input"
            min="30" max="200" step="0.1" placeholder="60.0"
            value="${log.mesures.poids ?? ''}"
            aria-label="Poids en kilogrammes">
          <span class="bbt-unit">kg</span>
        </div>
      </div>
    </div>

    <!-- Contraception -->
    <div class="dl-section">
      <div class="dl-section-label">💊 Contraception</div>
      <div class="dl-chips">
        <button type="button" class="dl-chip${log.contraception.pilulePrise ? ' sel' : ''}"
          data-field="pill" data-value="true" aria-pressed="${log.contraception.pilulePrise}"
          aria-label="Pilule prise aujourd'hui">
          <span class="dl-chip-icon" aria-hidden="true">💊</span>
          <span class="dl-chip-label">Pilule prise</span>
        </button>
      </div>
      <div class="dl-section-label" style="margin-top:10px">Test d'ovulation (OPK)</div>
      <div class="dl-chips">
        ${Object.entries(OPK_ENUM).map(([v, d]) =>
          _chip('opk', v, d.icon, d.label, log.contraception.testOvulation === v)
        ).join('')}
        <button type="button" class="dl-chip${!log.contraception.testOvulation ? ' sel' : ''}"
          data-field="opk" data-value="null" aria-pressed="${!log.contraception.testOvulation}"
          aria-label="Pas de test">
          <span class="dl-chip-icon" aria-hidden="true">○</span>
          <span class="dl-chip-label">Pas de test</span>
        </button>
      </div>
    </div>

    <button type="button" id="dl-save" class="btn-primary" style="margin-top:20px">
      Enregistrer
    </button>`;

  container.innerHTML = html;

  // ─── Interactions ──────────────────────────────────────────────────────────
  container.querySelectorAll('.dl-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const { field, value } = btn.dataset;
      const v = value === 'null' ? null : value;

      if (field === 'emotions' || field === 'douleurs') {
        // Toggle multi-select
        const list = field === 'emotions' ? log.emotions : log.douleurs;
        const idx  = list.indexOf(v);
        if (idx >= 0) list.splice(idx, 1); else list.push(v);
        btn.classList.toggle('sel', idx < 0);
        btn.setAttribute('aria-pressed', String(idx < 0));
      } else if (field === 'pill') {
        log.contraception.pilulePrise = !log.contraception.pilulePrise;
        btn.classList.toggle('sel', log.contraception.pilulePrise);
        btn.setAttribute('aria-pressed', String(log.contraception.pilulePrise));
      } else if (field === 'opk') {
        log.contraception.testOvulation = v;
        container.querySelectorAll('[data-field="opk"]').forEach(b => {
          const match = b.dataset.value === (v ?? 'null');
          b.classList.toggle('sel', match);
          b.setAttribute('aria-pressed', String(match));
        });
      } else {
        // Sélection unique (regles, spotting, sexualite)
        log[field] = v;
        container.querySelectorAll(`[data-field="${field}"]`).forEach(b => {
          const match = b.dataset.value === (value);
          b.classList.toggle('sel', match);
          b.setAttribute('aria-pressed', String(match));
        });
      }
    });
  });

  // BBT + poids
  container.querySelector('#dl-bbt')?.addEventListener('change', e => {
    log.mesures.temperatureBasale = parseFloat(e.target.value) || null;
  });
  container.querySelector('#dl-weight')?.addEventListener('change', e => {
    log.mesures.poids = parseFloat(e.target.value) || null;
  });

  // Enregistrer
  container.querySelector('#dl-save')?.addEventListener('click', () => onSave?.(log));
}
