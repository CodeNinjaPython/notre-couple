/**
 * insights.js — Moteur d'insights contextuels + calcul d'alignement libido.
 * Fonctionne sur les données déjà chargées par loadAnalyticsData() + sessions.
 */
import { supabase } from './supabase.js';
import { localDateStr, daysAgo } from './date-utils.js';
import { Cycle } from './cycle-model.js';

// ═══════════════════════════════════════════════════════════════════════════
// 1. CHARGEMENT DES DONNÉES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Charge sessions + feedback pour le couple (90 derniers jours).
 * Retourne { sessions } où chaque session a { ...row, feedbacks: [{user_id, satisfaction, orgasms}] }
 */
export async function loadSessionsWithFeedback(coupleId) {
  const since = daysAgo(90);
  const [{ data: sessions }, { data: feedbacks }] = await Promise.all([
    supabase.from('intimate_sessions')
      .select('id,couple_id,created_by,session_date,duration_min,prelim_min,location,mood,note')
      .eq('couple_id', coupleId)
      .gte('session_date', since)
      .order('session_date', { ascending: false }),
    supabase.from('session_feedback')
      .select('session_id,user_id,satisfaction,orgasms,loved_txt,shared')
      .in('session_id',
        (await supabase.from('intimate_sessions').select('id').eq('couple_id', coupleId).gte('session_date', since))
          .data?.map(s => s.id) ?? []
      ),
  ]);

  const fbBySession = {};
  (feedbacks || []).forEach(fb => {
    if (!fbBySession[fb.session_id]) fbBySession[fb.session_id] = [];
    fbBySession[fb.session_id].push(fb);
  });

  return (sessions || []).map(s => ({
    ...s,
    date: s.session_date, // alias pratique
    feedbacks: fbBySession[s.id] || [],
    satisfactionElle: fbBySession[s.id]?.find(f => f.user_id)?.satisfaction ?? null,
    orgasmsElle: fbBySession[s.id]?.find(f => f.user_id)?.orgasms ?? 0,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. ALIGNEMENT LIBIDO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calcule l'alignement libido sur les 30 derniers jours.
 * @param {Array}  entries  — toutes les log_entries
 * @param {string} elleId
 * @param {string} luiId
 * @returns {{ score: number|null, label: string, trend: 'improving'|'stable'|'declining', byDay: Array }}
 */
export function computeLibidoAlignment(entries, elleId, luiId) {
  const elleMap = _libidoByDate(entries, elleId);
  const luiMap  = _libidoByDate(entries, luiId);

  const days = [...new Set([...Object.keys(elleMap), ...Object.keys(luiMap)])].sort();
  const byDay = days
    .map(date => ({ date, elle: elleMap[date] ?? null, lui: luiMap[date] ?? null }))
    .filter(d => d.elle !== null && d.lui !== null);

  if (!byDay.length) return { score: null, label: 'Pas assez de données', trend: 'stable', byDay: [] };

  const diffs     = byDay.map(d => Math.abs(d.elle - d.lui));
  const avgDiff   = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const score     = Math.round(Math.max(0, (1 - avgDiff / 4)) * 100);

  const label = score >= 90 ? 'Libidos très proches'
              : score >= 70 ? 'Bonne harmonie'
              : score >= 50 ? 'Quelques désalignements'
              : 'Libidos souvent divergentes';

  // Trend : 14 derniers jours vs avant
  const recent = byDay.slice(-14).map(d => Math.abs(d.elle - d.lui));
  const older  = byDay.slice(0, -14).map(d => Math.abs(d.elle - d.lui));
  const avgR   = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : null;
  const avgO   = older.length  ? older.reduce((a, b) => a + b, 0)  / older.length  : null;
  const trend  = avgR !== null && avgO !== null
    ? avgR < avgO - 0.3 ? 'improving' : avgR > avgO + 0.3 ? 'declining' : 'stable'
    : 'stable';

  return { score, label, trend, byDay };
}

function _libidoByDate(entries, userId) {
  const map = {};
  entries
    .filter(e => e.user_id === userId && e.category_id === 'journal' && e.value?.libidoScale != null)
    .forEach(e => { map[e.log_date] = e.value.libidoScale; });
  return map;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. MOTEUR D'INSIGHTS (8+ exemples contextuels)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Génère des insights contextuels.
 * @param {{ sessions, entries, cycles, elleId, luiId }} data
 * @returns {Array<{ id, icon, title, body, type: 'positive'|'info'|'warning' }>}
 */
export function generateInsights({ sessions = [], entries = [], cycles = [], elleId, luiId } = {}) {
  const out = [];
  const add = o => out.push(o);

  const journalElle   = entries.filter(e => e.user_id === elleId && e.category_id === 'journal');
  const journalLui    = entries.filter(e => e.user_id === luiId  && e.category_id === 'journal');
  const thisMonth     = localDateStr().slice(0, 7);
  const lastMonthDate = new Date(); lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonth     = localDateStr(lastMonthDate).slice(0, 7);

  // ── 1. Satisfaction par phase ──────────────────────────────────────────
  const satByPhase = {};
  journalElle.forEach(e => {
    const phase = _phaseForDate(e.log_date, cycles);
    const sat   = e.value?.satisfactionSexuelle;
    if (!phase || !sat) return;
    if (!satByPhase[phase]) satByPhase[phase] = [];
    satByPhase[phase].push(sat);
  });
  const bestPhase = Object.entries(satByPhase)
    .map(([ph, vals]) => [ph, vals.reduce((a, b) => a + b, 0) / vals.length])
    .sort((a, b) => b[1] - a[1])[0];
  if (bestPhase && bestPhase[1] >= 6) {
    add({
      id: 'sat_phase', icon: '📈', type: 'positive',
      title: `Satisfaction plus haute en ${bestPhase[0]}`,
      body:  `Ta satisfaction est en moyenne de ${bestPhase[1].toFixed(1)}/10 pendant cette phase.`,
    });
  }

  // ── 2. Alignement libido ───────────────────────────────────────────────
  const { score: liScore, label: liLabel, trend } = computeLibidoAlignment(entries, elleId, luiId);
  if (liScore !== null) {
    const trendStr = trend === 'improving' ? ' — en amélioration récente ✓'
                   : trend === 'declining' ? ' — en baisse récente'
                   : '';
    add({
      id: 'libido_align', icon: '💑', type: liScore >= 70 ? 'positive' : 'info',
      title: `Alignement libido : ${liScore}/100`,
      body: `${liLabel}${trendStr}. Le score mesure à quel point vos libidos évoluent au même rythme.`,
    });
  }

  // ── 3. Tensions en phase lutéale ──────────────────────────────────────
  const tensions = journalElle.filter(e =>
    e.value?.stressCouple === 'dispute' || e.value?.stressCouple === 'tension'
  );
  if (tensions.length >= 3) {
    const enLuteale = tensions.filter(e => {
      const ph = _phaseForDate(e.log_date, cycles);
      return ph?.includes('Lutéale');
    }).length;
    const ratio = enLuteale / tensions.length;
    if (ratio >= 0.5) {
      add({
        id: 'tension_luteale', icon: '⚡', type: 'warning',
        title: 'Tensions liées à la phase lutéale',
        body: `${Math.round(ratio * 100)} % des tensions du couple ont lieu en phase lutéale. Anticiper ensemble ce créneu peut aider.`,
      });
    }
  }

  // ── 4. Streak de journalisation ───────────────────────────────────────
  const logDates = new Set(journalElle.map(e => e.log_date));
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    if (logDates.has(localDateStr(d))) streak++; else break;
  }
  if (streak >= 5) {
    add({
      id: 'streak', icon: '🔥', type: 'positive',
      title: `${streak} jours de journal d'affilée !`,
      body: 'Plus tu journalises régulièrement, plus les insights deviennent précis.',
    });
  }

  // ── 5. Évolution mensuelle des sessions ──────────────────────────────
  const sessThisMonth = sessions.filter(s => s.date?.startsWith(thisMonth));
  const sessLastMonth = sessions.filter(s => s.date?.startsWith(lastMonth));
  if (sessLastMonth.length > 0) {
    const delta = sessThisMonth.length - sessLastMonth.length;
    if (delta !== 0) {
      add({
        id: 'sessions_trend', icon: delta > 0 ? '📈' : '📉', type: 'info',
        title: `Sessions : ${sessThisMonth.length} ce mois`,
        body: `${delta > 0 ? '+' : ''}${delta} vs le mois dernier (${sessLastMonth.length} sessions).`,
      });
    }
  }

  // ── 6. Durée moyenne des sessions ────────────────────────────────────
  const durations = sessions.filter(s => (s.duration_min ?? 0) > 0).map(s => s.duration_min);
  if (durations.length >= 3) {
    const avg     = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    const recent3 = durations.slice(0, 3);
    const avgR3   = Math.round(recent3.reduce((a, b) => a + b, 0) / recent3.length);
    add({
      id: 'duration_avg', icon: '⏱️', type: 'info',
      title: `Sessions en moyenne : ${avg} min`,
      body: `Sur ${durations.length} sessions${avg !== avgR3 ? ` — tendance récente : ${avgR3} min` : ''}.`,
    });
  }

  // ── 7. Taux d'aftercare ──────────────────────────────────────────────
  const sessWithAC = journalElle.filter(e => e.value?.aftercare).length;
  const sessTotal  = journalElle.filter(e => e.value?.rapports && e.value.rapports !== 'pas_sexe').length;
  if (sessTotal >= 4) {
    const rate = Math.round(sessWithAC / sessTotal * 100);
    add({
      id: 'aftercare_rate', icon: rate >= 60 ? '🤗' : '💡', type: rate >= 60 ? 'positive' : 'info',
      title: `Aftercare : ${rate} % des sessions`,
      body: rate >= 60
        ? 'Prendre soin l\'un de l\'autre après les moments intimes renforce la confiance.'
        : 'L\'aftercare peut enrichir la connexion après une session — même 5 minutes comptent.',
    });
  }

  // ── 8. Crampes → libido basse ─────────────────────────────────────────
  const crampesDays = new Set(
    journalElle.filter(e => e.value?.douleursPelviennes?.includes('crampes')).map(e => e.log_date)
  );
  if (crampesDays.size >= 3) {
    const avecC  = journalElle.filter(e => crampesDays.has(e.log_date) && e.value?.libidoScale != null)
                              .map(e => e.value.libidoScale);
    const sansC  = journalElle.filter(e => !crampesDays.has(e.log_date) && e.value?.libidoScale != null)
                              .map(e => e.value.libidoScale);
    if (avecC.length >= 3 && sansC.length >= 3) {
      const avgC  = avecC.reduce((a, b) => a + b, 0) / avecC.length;
      const avgNC = sansC.reduce((a, b) => a + b, 0) / sansC.length;
      if (avgNC - avgC >= 0.8) {
        add({
          id: 'crampes_libido', icon: '🩺', type: 'info',
          title: 'Crampes → libido plus basse',
          body: `Libido moyenne de ${avgC.toFixed(1)}/5 les jours avec crampes vs ${avgNC.toFixed(1)}/5 les autres jours.`,
        });
      }
    }
  }

  // ── 9. Libido plus haute en phase ovulatoire ─────────────────────────
  const libidoParPhase = {};
  journalElle.forEach(e => {
    const ph = _phaseForDate(e.log_date, cycles);
    const l  = e.value?.libidoScale;
    if (!ph || !l) return;
    if (!libidoParPhase[ph]) libidoParPhase[ph] = [];
    libidoParPhase[ph].push(l);
  });
  const phaseOvul   = libidoParPhase['Ovulation'] ?? libidoParPhase['Folliculaire tardive'] ?? [];
  const phaseLuteal = libidoParPhase['Lutéale tardive'] ?? libidoParPhase['Lutéale précoce'] ?? [];
  if (phaseOvul.length >= 3 && phaseLuteal.length >= 3) {
    const avgO = phaseOvul.reduce((a, b) => a + b, 0)   / phaseOvul.length;
    const avgL = phaseLuteal.reduce((a, b) => a + b, 0) / phaseLuteal.length;
    if (avgO - avgL >= 0.6) {
      add({
        id: 'fertile_libido', icon: '🌸', type: 'positive',
        title: 'Libido plus haute près de l\'ovulation',
        body: `${(avgO - avgL).toFixed(1)} points de plus que la phase lutéale — aligné avec la biologie du cycle.`,
      });
    }
  }

  // ── 10. Kinks diversité ──────────────────────────────────────────────
  const kinksSet = new Set();
  journalElle.forEach(e => (e.value?.kinksDate ?? []).forEach(k => kinksSet.add(k)));
  if (kinksSet.size >= 5) {
    add({
      id: 'kinks_diversity', icon: '✨', type: 'positive',
      title: `${kinksSet.size} kinks explorés ensemble`,
      body: 'Diversifier les pratiques contribue à maintenir l\'excitation et la curiosité mutuelle.',
    });
  }

  return out.slice(0, 8); // max 8 insights
}

// ── Helper : phase pour une date donnée ───────────────────────────────────
function _phaseForDate(dateStr, cycles) {
  if (!cycles?.length) return null;
  const sorted = [...cycles].sort((a, b) => b.period_start.localeCompare(a.period_start));
  const cycle  = sorted.find(c => c.period_start <= dateStr);
  if (!cycle) return null;
  const day = Math.max(1, Math.round(
    (new Date(dateStr + 'T12:00:00') - new Date(cycle.period_start + 'T12:00:00')) / 864e5
  ) + 1);
  return Cycle.phaseName(day);
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. LIAISON DailyLog ↔ IntimateSession
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Statistiques de sessions groupées par phase du cycle.
 * Utile pour les graphiques "orgasme par phase" etc.
 */
export function groupSessionsByPhase(sessions, cycles) {
  const map = {};
  sessions.forEach(s => {
    const phase = _phaseForDate(s.date ?? s.session_date, cycles) ?? 'Inconnue';
    if (!map[phase]) map[phase] = { count: 0, durations: [], satisfactions: [], orgasms: [] };
    map[phase].count++;
    if (s.duration_min) map[phase].durations.push(s.duration_min);
    if (s.satisfactionElle) map[phase].satisfactions.push(s.satisfactionElle);
    if (s.orgasmsElle) map[phase].orgasms.push(s.orgasmsElle);
  });
  return Object.entries(map).map(([phase, d]) => ({
    phase,
    count: d.count,
    avgDuration:     _avg(d.durations),
    avgSatisfaction: _avg(d.satisfactions),
    avgOrgasms:      _avg(d.orgasms),
  })).sort((a, b) => b.count - a.count);
}

const _avg = arr => arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null;
