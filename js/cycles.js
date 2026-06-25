import { supabase } from './supabase.js';
import { localDateStr } from './date-utils.js';

export async function getCurrentCycle() {
  const today = localDateStr();
  const { data } = await supabase
    .from('cycles')
    .select('*')
    .lte('period_start', today)
    .or(`period_end.is.null,period_end.gte.${today}`)
    .order('period_start', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getCycleHistory(limit = 8) {
  const { data } = await supabase
    .from('cycles')
    .select('*')
    .order('period_start', { ascending: false })
    .limit(limit);
  return data || [];
}

export async function startPeriod() {
  const today = localDateStr();
  const { data, error } = await supabase
    .from('cycles')
    .insert({ period_start: today })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function endPeriod(cycleId) {
  const today = localDateStr();
  const { error } = await supabase
    .from('cycles')
    .update({ period_end: today })
    .eq('id', cycleId);
  if (error) throw error;
}

// Moyenne glissante sur les cycles complétés — §5 prédiction
export function predictNextPeriod(cycles) {
  const completed = cycles.filter(c => c.period_start && c.period_end);
  if (completed.length < 2) return null;

  const lengths = [];
  for (let i = 0; i < completed.length - 1; i++) {
    // Forcer interprétation locale (T12:00 évite l'ambiguïté DST)
    const curr = new Date(completed[i].period_start     + 'T12:00:00');
    const prev = new Date(completed[i + 1].period_start + 'T12:00:00');
    const days = Math.round((curr - prev) / 864e5);
    if (days >= 15 && days <= 60) lengths.push(days);
  }
  if (!lengths.length) return null;

  const avg       = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
  const lastStart = new Date(completed[0].period_start + 'T12:00:00');
  const nextPeriod  = new Date(lastStart.getTime() + avg         * 864e5);
  const ovulation   = new Date(nextPeriod.getTime()  - 14        * 864e5);
  const fertileStart = new Date(ovulation.getTime()  - 5         * 864e5);

  return {
    nextPeriodDate:  localDateStr(nextPeriod),
    ovulationDate:   localDateStr(ovulation),
    fertileStart:    localDateStr(fertileStart),
    avgCycleLength:  avg,
    cyclesUsed:      completed.length,
  };
}

// Énergie par jour de cycle depuis log_entries
export async function getEnergyByCycleDay(userId, periodStart, totalDays) {
  const start  = new Date(periodStart + 'T12:00:00');
  const end    = new Date(start.getTime() + totalDays * 864e5);
  const endStr = localDateStr(end);

  const { data } = await supabase
    .from('log_entries')
    .select('log_date, value')
    .eq('user_id', userId)
    .eq('category_id', 'energy')
    .gte('log_date', periodStart)
    .lte('log_date', endStr)
    .order('log_date');

  const arr = new Array(totalDays).fill(null);
  (data || []).forEach(row => {
    const rowDate = new Date(row.log_date + 'T12:00:00');
    const dayIdx  = Math.round((rowDate - start) / 864e5);
    const raw     = row.value?.v ?? row.value;
    if (dayIdx >= 0 && dayIdx < totalDays && raw != null) {
      arr[dayIdx] = (Number(raw) - 1) / 4; // scale 1-5 → 0-1
    }
  });
  return arr;
}

// Même chose pour le partenaire (via RLS shared=true)
export async function getPartnerEnergyByCycleDay(userId, periodStart, totalDays) {
  const start  = new Date(periodStart + 'T12:00:00');
  const end    = new Date(start.getTime() + totalDays * 864e5);
  const endStr = localDateStr(end);

  const { data } = await supabase
    .from('log_entries')
    .select('log_date, value')
    .eq('category_id', 'energy')
    .eq('user_id', userId)
    .eq('shared', true)
    .gte('log_date', periodStart)
    .lte('log_date', endStr)
    .order('log_date');

  const arr = new Array(totalDays).fill(null);
  (data || []).forEach(row => {
    const rowDate = new Date(row.log_date + 'T12:00:00');
    const dayIdx  = Math.round((rowDate - start) / 864e5);
    const raw     = row.value?.v ?? row.value;
    if (dayIdx >= 0 && dayIdx < totalDays && raw != null) {
      arr[dayIdx] = (Number(raw) - 1) / 4;
    }
  });
  return arr;
}

// Interpolation linéaire pour combler les trous (null) dans la série
export function interpolate(arr) {
  const filled = [...arr];
  for (let i = 0; i < filled.length; i++) {
    if (filled[i] === null) {
      let prev = i - 1, next = i + 1;
      while (next < filled.length && filled[next] === null) next++;
      const vPrev = prev >= 0 ? filled[prev] : 0.5;
      const vNext = next < filled.length ? filled[next] : 0.5;
      const steps = next - prev;
      filled[i] = vPrev + ((vNext - vPrev) * (i - prev)) / steps;
    }
  }
  return filled;
}
