/**
 * pdf.js — Export PDF mensuel via window.print() avec @media print.
 * Génère une page HTML complète, l'ouvre dans un onglet et déclenche l'impression.
 */
import { supabase } from './supabase.js';
import { localDateStr, daysAgo, fmtDate } from './date-utils.js';

const PHASE_LABELS = { Menstruelle: '🔴', Folliculaire: '🔵', Ovulation: '🟣', Lutéale: '🩷' };
const EV_LABELS = {
  intimacy: '❤️ Intimité', conflict: '💬 Tension', date_night: '🌙 Soirée', other: '✨ Moment',
  reconfort: '💛 Besoin de douceur', presence: '🫂 Besoin de présence', espace: '🌿 Besoin d\'espace',
};

export async function exportPDF(coupleId, me, partner) {
  const since = daysAgo(30);
  const today = localDateStr();

  const [logRes, evRes, cycRes, sesRes, fbRes] = await Promise.all([
    supabase.from('log_entries').select('*').gte('log_date', since).order('log_date'),
    supabase.from('couple_events').select('*').eq('couple_id', coupleId).gte('event_date', since).order('event_date'),
    supabase.from('cycles').select('*').order('period_start', { ascending: false }).limit(3),
    supabase.from('intimate_sessions').select('id, session_date, duration_min').eq('couple_id', coupleId).gte('session_date', since),
    supabase.from('session_feedback').select('satisfaction, orgasms').gte('created_at', since + 'T00:00:00Z'),
  ]);

  const entries = logRes.data || [];
  const events  = evRes.data  || [];
  const cycles  = cycRes.data || [];
  const sessions = sesRes.data || [];
  const fbs      = fbRes.data || [];

  // Résumé intimité (#14)
  const nbSessions = sessions.length;
  const sats = fbs.map(f => f.satisfaction).filter(s => s != null);
  const avgSat = sats.length ? (sats.reduce((a, b) => a + b, 0) / sats.length).toFixed(1) : '—';
  const totalOrg = fbs.reduce((s, f) => s + (f.orgasms || 0), 0);

  // Regrouper par date
  const byDate = {};
  entries.forEach(e => {
    const key = e.log_date + '|' + e.user_id;
    if (!byDate[key]) byDate[key] = { date: e.log_date, uid: e.user_id, metrics: {} };
    byDate[key].metrics[e.category_id] = e.value?.v ?? e.value;
  });

  const rows = Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
  const elleName = me?.tracks_cycle ? (me.display_name || 'Elle') : (partner?.display_name || 'Elle');
  const luiName  = me?.tracks_cycle ? (partner?.display_name || 'Lui') : (me.display_name || 'Lui');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Notre cycle — Bilan ${fmtDate(since, { month: 'long', year: 'numeric' })}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: "Helvetica Neue", Arial, sans-serif; color: #1A1830; font-size: 12px; padding: 24px; }
  h1 { font-size: 22px; font-weight: 800; color: #E84375; margin-bottom: 4px; }
  .subtitle { color: #7070A0; margin-bottom: 24px; }
  h2 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: #A8A7C8; margin: 20px 0 10px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #F6F5FF; font-size: 10px; text-align: left; padding: 6px 8px; border-bottom: 2px solid #E6E5F4; }
  td { padding: 5px 8px; border-bottom: 1px solid #F0F0F8; font-size: 11px; }
  .ev-row { display: flex; gap: 16px; flex-wrap: wrap; }
  .ev-item { background: #F6F5FF; border-radius: 8px; padding: 8px 12px; margin-bottom: 6px; font-size: 11px; }
  .ev-date { color: #7070A0; font-size: 10px; }
  .cycle-row { display: flex; gap: 20px; }
  .cycle-item { border: 1px solid #E6E5F4; border-radius: 8px; padding: 10px 14px; }
  .disclaimer { margin-top: 24px; font-size: 10px; color: #A8A7C8; border-top: 1px solid #E6E5F4; padding-top: 12px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<h1>Notre cycle</h1>
<p class="subtitle">Bilan · 30 derniers jours · Généré le ${fmtDate(today, { day: 'numeric', month: 'long', year: 'numeric' })}</p>

<h2>Cycles récents</h2>
<div class="cycle-row">
${cycles.map(c => `<div class="cycle-item">
  <div><strong>Début :</strong> ${fmtDate(c.period_start, {day:'numeric',month:'short',year:'numeric'})}</div>
  ${c.period_end ? `<div><strong>Fin :</strong> ${fmtDate(c.period_end, {day:'numeric',month:'short'})}</div>` : '<div>En cours</div>'}
</div>`).join('')}
</div>

<h2>Saisies (30 jours)</h2>
<table>
<tr>
  <th>Date</th><th>Qui</th><th>Humeur</th><th>Énergie</th><th>Libido</th><th>Sommeil</th><th>Stress</th><th>Note</th>
</tr>
${rows.map(r => {
  const isElle = r.uid === (me?.tracks_cycle ? me.user_id : partner?.user_id);
  const MOOD = ['😣','😔','😐','🙂','😊'];
  return `<tr>
    <td>${fmtDate(r.date, {day:'numeric',month:'short'})}</td>
    <td>${isElle ? elleName : luiName}</td>
    <td>${r.metrics.mood != null ? MOOD[r.metrics.mood] || r.metrics.mood : '—'}</td>
    <td>${r.metrics.energy ?? '—'}/5</td>
    <td>${r.metrics.libido ?? '—'}/5</td>
    <td>${r.metrics.sleep ?? '—'}/5</td>
    <td>${r.metrics.stress ?? '—'}/5</td>
    <td>${r.metrics.note || '—'}</td>
  </tr>`;
}).join('')}
</table>

<h2>Intimité (30 jours)</h2>
<div class="cycle-row">
  <div class="cycle-item"><strong>${nbSessions}</strong> moment${nbSessions > 1 ? 's' : ''}</div>
  <div class="cycle-item">Satisfaction moy. <strong>${avgSat}${avgSat !== '—' ? '/10' : ''}</strong></div>
  <div class="cycle-item"><strong>${totalOrg}</strong> orgasme${totalOrg > 1 ? 's' : ''}</div>
</div>

<h2>Moments partagés</h2>
${events.length ? events.map(ev => `
<div class="ev-item">
  <span>${EV_LABELS[ev.event_type] || ev.event_type}</span>
  ${ev.note ? ` — ${ev.note}` : ''}
  <div class="ev-date">${fmtDate(ev.event_date, {weekday:'long',day:'numeric',month:'long'})}</div>
</div>`).join('') : '<p style="color:#A8A7C8">Aucun moment noté ce mois.</p>'}

<p class="disclaimer">
  Document généré par Notre cycle · Usage personnel uniquement · Ce document n'est pas un document médical.
  Les données appartiennent à l'utilisateur et n'ont été partagées avec aucun tiers.
</p>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 600);
}
