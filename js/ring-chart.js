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
    // Contenu central (style « prédiction » comme l'app de référence).
    centerTop    = '',
    centerMain   = '',
    centerToggleLabel = '',
    centerAlt    = '',
  } = params;

  const W = 300, H = 300;
  const CX = 150, CY = 150;
  const R  = 116;   // rayon de la ligne médiane de l'anneau
  const TRACK_SW = 13;  // épaisseur du rail gris
  const ARC_SW   = 19;  // épaisseur des arcs colorés

  // Point sur le cercle à `deg` degrés (0 = haut/midi, sens horaire).
  const pol = (deg, r = R) => {
    const a = (deg - 90) * Math.PI / 180;
    return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
  };
  const dayCenterDeg = (d) => ((d - 0.5) / totalDays) * 360;
  const dayStartDeg  = (d) => ((d - 1)   / totalDays) * 360;
  const dayEndDeg    = (d) => (d         / totalDays) * 360;

  // Arc épais entre deux angles (sens horaire), bouts arrondis.
  function arc(startDeg, endDeg, sw, stroke, opacity = 1, extra = '') {
    const [x1, y1] = pol(startDeg);
    const [x2, y2] = pol(endDeg);
    const large = ((endDeg - startDeg + 360) % 360) > 180 ? 1 : 0;
    return `<path d="M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}"
      fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" opacity="${opacity}" ${extra}/>`;
  }

  function segmentColor(day) {
    if (day <= periodDays)                        return COLORS.menstruelle;
    if (day === ovulationDay)                     return COLORS.ovulation;
    if (day >= fertileStart && day <= fertileEnd) return COLORS.fertile;
    if (day > totalDays - 6)                      return COLORS.luteale;
    return COLORS.default;
  }
  function segmentPhase(day) {
    if (day <= periodDays)                        return 'Règles';
    if (day === ovulationDay)                     return 'Ovulation';
    if (day >= fertileStart && day <= fertileEnd) return 'Fenêtre fertile';
    if (day > totalDays - 6)                      return 'Lutéale';
    return 'Folliculaire';
  }

  // ─── Arcs colorés (règles + fenêtre fertile) sur le rail gris ─────────────
  const GAP = 2; // petit retrait pour des bouts arrondis nets
  const periodArc = periodDays > 0
    ? arc(dayStartDeg(1) + GAP, dayEndDeg(periodDays) - GAP, ARC_SW, 'url(#grad-period)', 1)
    : '';
  const fertileArc = (fertileEnd >= fertileStart)
    ? arc(dayStartDeg(fertileStart) + GAP, dayEndDeg(fertileEnd) - GAP, ARC_SW, 'url(#grad-fertile)', 1)
    : '';

  // ─── Points des jours (zones grises) + données saisies (couleurs) ─────────
  const inArc = (d) => (d <= periodDays) || (d >= fertileStart && d <= fertileEnd);
  let dayDots = '', dataDots = '';
  const DATA_COLORS = ['#F5A623', '#4278C4', '#27AE60'];
  for (let d = 1; d <= totalDays; d++) {
    const [x, y] = pol(dayCenterDeg(d));
    if (loggedDays.has(d)) {
      const c = DATA_COLORS[d % DATA_COLORS.length];
      dataDots += `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="3.2" fill="${c}"/>`;
    } else if (!inArc(d)) {
      dayDots += `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="2.1" fill="var(--faint)" opacity=".5"/>`;
    }
  }

  // ─── Poignée lumineuse au début des règles (jour 1) ───────────────────────
  const [hx, hy] = pol(dayCenterDeg(1));
  const handle = `
    <g filter="url(#ring-glow)">
      <circle cx="${hx.toFixed(2)}" cy="${hy.toFixed(2)}" r="13" fill="#fff"/>
    </g>
    <path transform="translate(${hx.toFixed(2)},${hy.toFixed(2)})"
      d="M -4 4 L 4 -4 M 0.5 -4 L 4 -4 L 4 -0.5"
      stroke="#9A98B8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;

  // ─── Badge « Jour N » posé sur l'arc, au jour courant ─────────────────────
  const [bx, by] = pol(dayCenterDeg(currentDay));
  const badgeColor = segmentColor(currentDay);
  const badge = `
    <g transform="translate(${bx.toFixed(2)},${by.toFixed(2)})" class="ring-day-current">
      <circle r="25" fill="var(--surface)" stroke="${badgeColor}" stroke-width="2.5"/>
      <text y="-5" text-anchor="middle" font-family="'DM Sans',sans-serif"
        font-size="9" font-weight="700" fill="var(--faint)" letter-spacing=".06em">Jour</text>
      <text y="13" text-anchor="middle" font-family="'DM Mono',monospace"
        font-size="18" font-weight="700" fill="var(--text)">${currentDay}</text>
    </g>`;

  // Segments invisibles cliquables (interaction tap/clavier conservée).
  let hit = '';
  for (let d = 1; d <= totalDays; d++) {
    hit += arc(dayStartDeg(d), dayEndDeg(d), ARC_SW + 6, 'transparent', 1,
      `class="ring-seg" data-day="${d}" data-phase="${segmentPhase(d)}" data-logged="${loggedDays.has(d) ? '1' : '0'}" tabindex="0" role="button" aria-label="Jour ${d} · ${segmentPhase(d)}"`);
  }

  const svg = `<svg viewBox="0 0 ${W} ${H}" class="cycle-ring"
    role="img" aria-label="Anneau du cycle — jour ${currentDay} sur ${totalDays}">
    <defs>
      <filter id="ring-glow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="4" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <linearGradient id="grad-period" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#E53935"/><stop offset="100%" stop-color="#FF7A6E"/>
      </linearGradient>
      <linearGradient id="grad-fertile" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#3A6FB5"/><stop offset="100%" stop-color="#6FB0FF"/>
      </linearGradient>
    </defs>

    <!-- Rail gris -->
    <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="var(--line)"
      stroke-width="${TRACK_SW}" opacity=".5"/>

    ${periodArc}
    ${fertileArc}
    ${dayDots}
    ${dataDots}
    ${hit}
    ${handle}
    ${badge}
  </svg>`;

  // ─── Centre HTML (prédiction) superposé à l'anneau ────────────────────────
  const hasToggle = !!centerToggleLabel && !!centerAlt;
  const centerHtml = `
    <div class="ring-center">
      ${centerTop  ? `<div class="ring-center-top">${centerTop}</div>` : ''}
      <div class="ring-center-main" id="ring-center-main">${centerMain || (phaseName ? `Jour ${currentDay} · ${phaseName}` : `Jour ${currentDay}`)}</div>
      ${hasToggle ? `<button type="button" class="ring-center-toggle" id="ring-center-toggle" aria-expanded="false">
        <span>${centerToggleLabel}</span>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
      </button>` : ''}
    </div>`;

  container.innerHTML =
    `<div class="ring-stage">${svg}${centerHtml}</div>` +
    `<div class="ring-caption" id="ring-caption" aria-live="polite"></div>`;

  // ─── Toggle prédiction règles ↔ fenêtre fertile ───────────────────────────
  if (hasToggle) {
    const toggle = container.querySelector('#ring-center-toggle');
    const mainEl = container.querySelector('#ring-center-main');
    let alt = false;
    toggle?.addEventListener('click', () => {
      alt = !alt;
      mainEl.textContent = alt ? centerAlt : centerMain;
      toggle.setAttribute('aria-expanded', String(alt));
      toggle.classList.toggle('open', alt);
    });
  }

  // ─── Interaction : tap/clavier sur un jour → légende sous l'anneau ─────────
  const caption = container.querySelector('#ring-caption');
  const select = (seg) => {
    if (!seg) return;
    container.querySelectorAll('.ring-seg.ring-seg--active')
      .forEach(s => s.classList.remove('ring-seg--active'));
    seg.classList.add('ring-seg--active');
    const day    = seg.dataset.day;
    const phase  = seg.dataset.phase;
    const logged = seg.dataset.logged === '1';
    if (caption) {
      caption.textContent = `Jour ${day} · ${phase}`
        + (Number(day) === currentDay ? " · aujourd'hui" : '')
        + (logged ? ' · données saisies ✓' : '');
    }
  };
  container.querySelectorAll('.ring-seg').forEach(seg => {
    seg.addEventListener('click', () => select(seg));
    seg.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(seg); }
    });
  });
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

