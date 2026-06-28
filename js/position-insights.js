/**
 * position-insights.js — Bilan des positions (Phase 3).
 * À partir de position_ratings (+ cycles pour la phase) :
 *   - Hall of Fame : positions les mieux notées par le couple.
 *   - À adapter : positions souvent douloureuses / trop profondes.
 *   - Par phase : contraste de note selon la phase (ex. 9/10 ovulation, 4/10 prémenstruel).
 */
import { supabase } from './supabase.js';
import { POSITIONS } from './intimacy-library.js';
import { diffDays } from './date-utils.js';

const PHASE_LABEL = { menstruelle: 'règles', folliculaire: 'folliculaire', ovulation: 'ovulation', luteale: 'lutéale' };
const labelOf = (id) => POSITIONS.find(p => p.id === id)?.label || id;

// Phase du cycle pour une date donnée, d'après l'historique des règles.
function phaseForDate(date, cycles) {
  let start = null;
  for (const c of cycles) {
    if (c.period_start <= date && (!start || c.period_start > start)) start = c.period_start;
  }
  if (!start) return null;
  const day = diffDays(date, start) + 1;
  if (day < 1 || day > 40) return null;
  if (day <= 5) return 'menstruelle';
  if (day <= 13) return 'folliculaire';
  if (day <= 16) return 'ovulation';
  return 'luteale';
}

let _last = null;
let _listenerBound = false;

export async function renderPositionInsights(containerId, coupleId) {
  const el = document.getElementById(containerId);
  if (!el || !coupleId) return;
  _last = { containerId, coupleId };

  // Rechargement auto après une sauvegarde de session (lié une fois).
  if (!_listenerBound) {
    _listenerBound = true;
    document.addEventListener('nc:session-saved', () => {
      if (_last && document.getElementById(_last.containerId)) {
        renderPositionInsights(_last.containerId, _last.coupleId);
      }
    });
  }

  const [ratingsRes, cyclesRes] = await Promise.all([
    supabase.from('position_ratings').select('position_id, score, pain, too_deep, rated_on').eq('couple_id', coupleId),
    supabase.from('cycles').select('period_start').order('period_start', { ascending: false }).limit(24),
  ]);
  const ratings = ratingsRes.data || [];
  const cycles = cyclesRes.data || [];

  if (!ratings.length) {
    el.innerHTML = '<p class="intime-empty">Notez des positions après vos moments pour faire émerger vos favorites et repérer les jours sensibles.</p>';
    return;
  }

  // Agrégat par position (global + par phase).
  const agg = {};
  for (const r of ratings) {
    const a = agg[r.position_id] || (agg[r.position_id] =
      { sum: 0, count: 0, pain: 0, tooDeep: 0, byPhase: {} });
    if (r.score != null) { a.sum += r.score; a.count++; }
    if (r.pain) a.pain++;
    if (r.too_deep) a.tooDeep++;
    const ph = phaseForDate(r.rated_on, cycles);
    if (ph && r.score != null) {
      const p = a.byPhase[ph] || (a.byPhase[ph] = { sum: 0, count: 0 });
      p.sum += r.score; p.count++;
    }
  }

  const rated = Object.entries(agg).filter(([, a]) => a.count > 0)
    .map(([id, a]) => ({ id, avg: a.sum / a.count, ...a }));

  // Hall of Fame
  const top = [...rated].sort((x, y) => y.avg - x.avg).slice(0, 5);
  // À adapter (douleur ou trop profond)
  const sensibles = rated.filter(a => a.pain > 0 || a.tooDeep > 0)
    .sort((x, y) => (y.pain + y.tooDeep) - (x.pain + x.tooDeep)).slice(0, 4);

  // Contraste par phase (positions notées dans ≥ 2 phases, écart ≥ 2 pts)
  const contrasts = [];
  for (const a of rated) {
    const phases = Object.entries(a.byPhase).map(([ph, v]) => ({ ph, avg: v.sum / v.count }));
    if (phases.length < 2) continue;
    phases.sort((x, y) => y.avg - x.avg);
    const best = phases[0], worst = phases[phases.length - 1];
    if (best.avg - worst.avg >= 2) {
      contrasts.push({ id: a.id, best, worst });
    }
  }

  const stars = (avg) => `${avg.toFixed(1)}/10`;
  el.innerHTML = `
    <div class="pi-block">
      <div class="pi-title">🏆 Vos favorites</div>
      ${top.map((a, i) => `<div class="pi-row">
        <span class="pi-rank">${i + 1}</span>
        <span class="pi-name">${labelOf(a.id)}</span>
        <span class="pi-score">${stars(a.avg)}</span>
        <span class="pi-sub">${a.count} fois</span>
      </div>`).join('')}
    </div>
    ${sensibles.length ? `<div class="pi-block">
      <div class="pi-title">🌸 À adapter</div>
      ${sensibles.map(a => `<div class="pi-row">
        <span class="pi-name">${labelOf(a.id)}</span>
        <span class="pi-flags">${a.pain ? `douleur ×${a.pain}` : ''}${a.pain && a.tooDeep ? ' · ' : ''}${a.tooDeep ? `trop profond ×${a.tooDeep}` : ''}</span>
      </div>`).join('')}
    </div>` : ''}
    ${contrasts.length ? `<div class="pi-block">
      <div class="pi-title">🔄 Selon la phase</div>
      ${contrasts.slice(0, 4).map(c => `<div class="pi-phase-row">
        <strong>${labelOf(c.id)}</strong> : ${stars(c.best.avg)} en ${PHASE_LABEL[c.best.ph]}, ${stars(c.worst.avg)} en ${PHASE_LABEL[c.worst.ph]}
      </div>`).join('')}
    </div>` : ''}`;
}
