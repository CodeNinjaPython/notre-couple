/**
 * position-suggestions.js — Moteur de suggestion de positions (Phase 2).
 * Croise : bibliothèque (phase/confort), notes du couple (position_ratings),
 * douleurs récentes, profondeur, et anti-routine.
 * `rankSuggestions` est PUR (testable) ; `loadRatingData` lit Supabase.
 */
import { supabase } from './supabase.js';
import { POSITIONS, filterPositions } from './intimacy-library.js';
import { localDateStr, diffDays } from './date-utils.js';

/**
 * Agrège les notes du couple par position.
 * @returns {{ agg: Object, recentPain: boolean }}
 *   agg[position_id] = { sum, count, painCount, tooDeep, lastUsed }
 */
export async function loadRatingData(coupleId) {
  const agg = {};
  let recentPain = false;
  if (!coupleId) return { agg, recentPain };

  const { data } = await supabase.from('position_ratings')
    .select('position_id, score, pain, too_deep, rated_on')
    .eq('couple_id', coupleId);

  const today = localDateStr();
  for (const r of (data || [])) {
    const a = agg[r.position_id] || (agg[r.position_id] =
      { sum: 0, count: 0, painCount: 0, tooDeep: 0, lastUsed: null });
    if (r.score != null) { a.sum += r.score; a.count++; }
    if (r.pain) a.painCount++;
    if (r.too_deep) a.tooDeep++;
    if (!a.lastUsed || r.rated_on > a.lastUsed) a.lastUsed = r.rated_on;
    if (r.pain && r.rated_on && diffDays(today, r.rated_on) <= 14) recentPain = true;
  }
  return { agg, recentPain };
}

/**
 * Classe les positions et renvoie le top `limit` avec une raison lisible.
 * @param {object} o
 * @param {string} o.phase         menstruelle | folliculaire | ovulation | luteale
 * @param {boolean} o.painfulDay   jour sensible (règles ou douleurs récentes)
 * @param {Object} o.agg           sortie de loadRatingData
 * @param {string} [o.today]       date locale (injectable pour test)
 * @param {number} [o.limit=5]
 */
export function rankSuggestions({ phase, painfulDay, agg = {}, today = localDateStr(), limit = 5 }) {
  const phasePool = new Set(filterPositions({ phase }).map(p => p.id));

  const scored = POSITIONS.map(p => {
    const a = agg[p.id] || { sum: 0, count: 0, painCount: 0, tooDeep: 0, lastUsed: null };
    const avg = a.count ? a.sum / a.count : null;
    const reasons = [];
    let score = 0;

    // Préférences du couple
    if (avg != null) {
      score += (avg - 5) * 2;
      if (avg >= 8) reasons.push(`★ ${Math.round(avg)}/10 chez vous`);
    }
    // Adéquation à la phase
    if (phasePool.has(p.id)) score += 3;

    // Jour sensible : privilégier douceur / faible profondeur, écarter ce qui a fait mal
    if (painfulDay) {
      if (p.comfort === 1) { score += 4; reasons.push('Douce, moins profonde'); }
      else if (p.comfort === 3) score -= 4;
      if (a.painCount > 0) score -= 6;
      if (a.tooDeep > 0) score -= 4;
    } else if (a.count && a.painCount > a.count / 2) {
      score -= 3; // souvent douloureuse en général
    }

    // Anti-routine
    const daysSince = a.lastUsed ? diffDays(today, a.lastUsed) : 999;
    if (daysSince > 21) { score += 1.5; if (daysSince > 60 && a.count) reasons.push('Pour changer'); }
    else if (daysSince <= 7) score -= 1.5;

    return { p, score, reasons, painCount: a.painCount };
  });

  // Sur un jour sensible, exclure les positions déjà douloureuses.
  const pool = painfulDay ? scored.filter(s => s.painCount === 0) : scored;
  pool.sort((x, y) => y.score - x.score);

  return pool.slice(0, limit).map(s => ({
    ...s.p,
    reason: s.reasons[0] || (phasePool.has(s.p.id) ? 'Adaptée à la phase' : 'À tester'),
  }));
}
