/**
 * session-bridge.js — Liaison bidirectionnelle IntimateSession ↔ DailyLog.
 * Quand une session est enregistrée, met à jour le DailyLog du jour correspondant.
 * Quand le DailyLog est chargé, enrichit les stats de session du même jour.
 */
import { supabase } from './supabase.js';
import { DailyLog } from './cycle-model.js';
import { invalidateCache } from './query-cache.js';

/**
 * Après la sauvegarde d'une session, synchronise certains champs dans le DailyLog du jour.
 * Appeler depuis intimacy-sessions.js après l'insert / l'upsert.
 *
 * @param {string}  sessionDate  — YYYY-MM-DD
 * @param {string}  userId       — user_id (elle ou lui)
 * @param {Object}  opts
 * @param {number}  [opts.satisfaction]   — 1-10 depuis session_feedback
 * @param {number}  [opts.orgasms]        — compte d'orgasmes depuis session_feedback
 * @param {boolean} [opts.aftercare]
 * @param {string}  [opts.protection]     — 'avec_protection'|'sans_protection'|'retrait'
 */
export async function syncSessionToDailyLog(sessionDate, userId, {
  satisfaction = null,
  orgasms      = null,
  aftercare    = false,
  protection   = 'sans_protection',
} = {}) {
  if (!sessionDate || !userId) return;

  // Charger le DailyLog existant (ou créer un vide)
  const { data: existing } = await supabase.from('log_entries')
    .select('*')
    .eq('log_date', sessionDate)
    .eq('user_id', userId)
    .eq('category_id', 'journal')
    .maybeSingle();

  const log = existing ? DailyLog.fromDB(existing) : new DailyLog({ date: sessionDate, userId });

  // Mettre à jour sans écraser ce qui existe déjà
  if (!log.rapports || log.rapports === 'pas_sexe') {
    log.rapports = protection;
  }
  if (orgasms != null && orgasms > 0) {
    log.orgasme = true;
    if (log.orgasmes?.toi) {
      log.orgasmes.toi.count = Math.max(log.orgasmes.toi.count ?? 0, orgasms);
    }
  }
  if (satisfaction != null && log.satisfactionSexuelle == null) {
    log.satisfactionSexuelle = satisfaction;
  }
  if (aftercare && !log.aftercare) {
    log.aftercare = true;
  }

  await supabase.from('log_entries').upsert(
    { ...log.toDBEntry(), user_id: userId },
    { onConflict: 'user_id,log_date,category_id' }
  );
  invalidateCache('log_entries');
}

/**
 * Retourne les sessions du jour pour un utilisateur (pour afficher dans le journal).
 * @param {string} dateStr — YYYY-MM-DD
 * @param {string} coupleId
 * @returns {Promise<Array>}
 */
export async function getSessionsForDay(dateStr, coupleId) {
  const { data } = await supabase.from('intimate_sessions')
    .select('id,session_date,duration_min,mood,session_feedback(*)')
    .eq('couple_id', coupleId)
    .eq('session_date', dateStr);
  return data || [];
}

/**
 * Retourne un résumé texte de la liaison session ↔ log pour un jour donné.
 * Utilisé dans CalendarDaySummary.
 */
export function sessionSummaryLine(sessions) {
  if (!sessions?.length) return null;
  const s = sessions[0];
  const parts = [];
  if (s.duration_min) parts.push(`${s.duration_min} min`);
  if (s.mood) parts.push(s.mood);
  return `${sessions.length} session${sessions.length > 1 ? 's' : ''} — ${parts.join(', ')}`;
}
