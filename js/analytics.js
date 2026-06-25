/**
 * analytics.js — Analyses avancées : score synchronie, répartition phases,
 * heatmap conflits, tendances 3 mois, détection anomalie cycle.
 */
import { supabase } from './supabase.js';
import { localDateStr, daysAgo, diffDays } from './date-utils.js';

// ─── Pearson (exporté pour réutilisation dans nous.js) ────────────────────
export function pearson(xs, ys) {
  const n = xs.length;
  if (n < 5) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx  += (xs[i] - mx) ** 2;
    dy  += (ys[i] - my) ** 2;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? null : num / den;
}

export function buildMap(entries, uid, cat) {
  const m = {};
  entries.filter(e => e.user_id === uid && e.category_id === cat)
    .forEach(e => { m[e.log_date] = Number(e.value?.v ?? e.value); });
  return m;
}

export function align(ma, mb) {
  const dates = Object.keys(ma).filter(d => mb[d] != null);
  return { xs: dates.map(d => ma[d]), ys: dates.map(d => mb[d]), n: dates.length };
}

const PAIRS = [
  { a: 'energy', b: 'energy' }, { a: 'mood',   b: 'mood'   },
  { a: 'libido', b: 'libido' }, { a: 'sleep',  b: 'sleep'  },
  { a: 'cramps', b: 'mood'   }, { a: 'energy', b: 'stress' },
  { a: 'mood',   b: 'libido' }, { a: 'libido', b: 'stress' },
];

// ─── Score de synchronie global (0-100) ───────────────────────────────────
export function computeSyncScore(entries, elleId, luiId) {
  if (!elleId || !luiId) return null;
  const rs = [];
  for (const { a, b } of PAIRS) {
    const ma = buildMap(entries, elleId, a);
    const mb = buildMap(entries, luiId, b);
    const { xs, ys, n } = align(ma, mb);
    if (n < 5) continue;
    const r = pearson(xs, ys);
    if (r != null) rs.push(Math.abs(r));
  }
  if (!rs.length) return null;
  const avg = rs.reduce((a, b) => a + b, 0) / rs.length;
  return Math.round(avg * 100);
}

// ─── Tendances 3 mois (énergie + humeur, moyennes hebdomadaires) ───────────
export function computeWeeklyTrends(entries, elleId, luiId, weeks = 12) {
  const result = [];
  const today = localDateStr();
  for (let w = weeks - 1; w >= 0; w--) {
    const weekEnd   = daysAgo(w * 7);
    const weekStart = daysAgo(w * 7 + 6);
    const inWeek = entries.filter(e => e.log_date >= weekStart && e.log_date <= weekEnd);
    const avg = (uid, cat) => {
      const vals = inWeek.filter(e => e.user_id === uid && e.category_id === cat)
        .map(e => Number(e.value?.v ?? e.value)).filter(v => !isNaN(v));
      return vals.length ? vals.reduce((a,b)=>a+b,0) / vals.length : null;
    };
    result.push({
      week: w,
      label: daysAgo(w * 7 + 3), // milieu de semaine
      elleEnergy: avg(elleId, 'energy'),
      elleMood:   avg(elleId, 'mood'),
      luiEnergy:  avg(luiId,  'energy'),
      luiMood:    avg(luiId,  'mood'),
    });
  }
  return result;
}

// ─── Répartition des moments partagés par phase ────────────────────────────
const PHASES_ORDER = ['Menstruelle', 'Folliculaire', 'Ovulation', 'Lutéale'];
const PHASE_RANGES = [[1,5], [6,13], [14,16], [17,35]];
const PHASE_COLORS = { Menstruelle:'#E53935', Folliculaire:'#4278C4', Ovulation:'#7C5CFC', Lutéale:'#E84375' };

function phaseForDay(day) {
  const idx = PHASE_RANGES.findIndex(([a, b]) => day >= a && day <= b);
  return idx >= 0 ? PHASES_ORDER[idx] : 'Lutéale';
}

export function computeEventsByPhase(events, cycles) {
  const counts = { Menstruelle: 0, Folliculaire: 0, Ovulation: 0, Lutéale: 0, inconnu: 0 };
  events.forEach(ev => {
    const cycle = cycles.find(c => c.period_start <= ev.event_date &&
      (!c.period_end || c.period_end >= ev.event_date));
    if (!cycle) { counts.inconnu++; return; }
    const day = diffDays(ev.event_date, cycle.period_start) + 1;
    const phase = phaseForDay(day);
    counts[phase]++;
  });
  return counts;
}

// ─── Heatmap conflits par phase ────────────────────────────────────────────
export function computeConflictsByPhase(events, cycles) {
  const conflicts = events.filter(e => e.event_type === 'conflict');
  return computeEventsByPhase(conflicts, cycles);
}

// ─── Détection anomalie cycle ──────────────────────────────────────────────
export function detectCycleAnomalies(cycles) {
  const completed = cycles.filter(c => c.period_start && c.period_end);
  const alerts = [];
  for (let i = 0; i < completed.length - 1; i++) {
    const len = diffDays(completed[i].period_start, completed[i+1].period_start);
    if (len < 21) alerts.push({ type: 'court', len, date: completed[i].period_start });
    if (len > 35) alerts.push({ type: 'long',  len, date: completed[i].period_start });
  }
  return alerts;
}

// ─── Durée des règles prédite ──────────────────────────────────────────────
export function predictPeriodDuration(cycles) {
  const completed = cycles.filter(c => c.period_start && c.period_end);
  if (completed.length < 2) return null;
  const durations = completed.map(c => diffDays(c.period_end, c.period_start) + 1)
    .filter(d => d >= 2 && d <= 10);
  if (!durations.length) return null;
  return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
}

// ─── Streak (jours saisis consécutifs) ────────────────────────────────────
export function computeStreak(entries) {
  const logged = new Set(entries.map(e => e.log_date));
  let streak = 0;
  let day = localDateStr();
  while (logged.has(day)) {
    streak++;
    const d = new Date(day + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    day = localDateStr(d);
  }
  return streak;
}

// ─── Chargement centralisé des données analytics (90 jours) ────────────────
export async function loadAnalyticsData(coupleId) {
  const since = daysAgo(90);
  const [entriesRes, eventsRes, cyclesRes] = await Promise.all([
    supabase.from('log_entries').select('user_id,log_date,category_id,value').gte('log_date', since),
    supabase.from('couple_events').select('*').eq('couple_id', coupleId).gte('event_date', since),
    supabase.from('cycles').select('*').order('period_start', { ascending: false }),
  ]);
  return {
    entries: entriesRes.data || [],
    events:  eventsRes.data  || [],
    cycles:  cyclesRes.data  || [],
  };
}
