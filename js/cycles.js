import { supabase } from './supabase.js';
import { localDateStr } from './date-utils.js';
import { computeCyclePrediction } from './cycle-model.js';

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

export async function startPeriod(dateStr) {
  const start = dateStr || localDateStr();
  // La RLS exige user_id = auth.uid() — sans ça l'insert est rejeté (« action non autorisée »).
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('cycles')
    .insert({ period_start: start, user_id: user?.id })
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

// Moyenne glissante sur les cycles complétés — §5 prédiction (délégué au cycle-model)
export function predictNextPeriod(cycles, dailyLogs = []) {
  const r = computeCyclePrediction(cycles, dailyLogs);
  if (!r) return null;
  return {
    cycleStart:      r.cycleStart,
    jourDuCycleActuel: r.jourDuCycleActuel,
    phaseDuCycle:    r.phaseDuCycle,
    nextPeriodDate:  r.dateDesProchainesRegles,
    ovulationDate:   r.ovulationDate,
    fertileStart:    r.fertileStart,
    fertileEnd:      r.fertileEnd,
    avgCycleLength:  r.avgCycleLength,
    stdDev:          r.variabilite,
    regular:         r.confidence === 'haute',
    cyclesUsed:      r.cyclesAnalyzed,
    hormones:        r.hormones,
    ovulationConfirmed: r.ovulationConfirmed,
    detectionMethod: r.detectionMethod,
    predictabilityScore: r.predictabilityScore,
    fertileStartDay: r.fertileStartDay,
    fertileEndDay:   r.fertileEndDay,
    ovulationDay:    r.ovulationDay
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
