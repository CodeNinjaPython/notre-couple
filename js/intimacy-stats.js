/**
 * intimacy-stats.js — Statistiques avancées du module intimité.
 * Tout en Vanilla JS + SVG natif. Aucune librairie externe.
 * Calculs côté client à partir des données Supabase.
 */
import { supabase } from './supabase.js';
import { localDateStr, diffDays, fmtDate } from './date-utils.js';
import { renderIntimacyHeatmap } from './intimacy-heatmap.js';

// ─── Erreur UI ─────────────────────────────────────────────────────────────

function showStat(el, html) { if (el) el.innerHTML = html; }
function showStatError(el, msg) {
  if (el) el.innerHTML = `<div class="msg error">${msg}</div>`;
}

// ─── Heatmap mensuelle ─────────────────────────────────────────────────────

export async function renderMonthlyHeatmap(coupleId, elleId, data) {
  const el = document.getElementById('intimacy-heatmap');
  if (!el) return;

  // Utiliser le nouveau composant rich si elleId fourni
  if (elleId) {
    await renderIntimacyHeatmap(el, { coupleId, elleId }, data);
    return;
  }
  // Fallback to simple heatmap if no elleId (should not happen in normal flow)
  try {
    const { data, error } = await supabase.from('intimate_sessions').select('session_date').eq('couple_id', coupleId);
    if (error) throw error;
    const now = new Date(), year = now.getFullYear(), month = now.getMonth();

    const today       = localDateStr();
    const byDate      = {};
    (data || []).forEach(s => {
      byDate[s.session_date] = (byDate[s.session_date] || 0) + 1;
    });

    const daysInMonth  = new Date(year, month+1, 0).getDate();
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // 0=lun
    const DAY_FR       = ['L','M','M','J','V','S','D'];

    let html = `<div class="heatmap-month-title">${new Date(year, month).toLocaleDateString('fr-FR', { month:'long', year:'numeric' })}</div>`;
    html    += `<div class="heatmap-grid">`;
    html    += DAY_FR.map(d => `<div class="heatmap-day-header">${d}</div>`).join('');

    for (let i = 0; i < firstWeekday; i++) html += '<div class="heatmap-cell empty"></div>';

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const count   = byDate[dateStr] || 0;
      const isToday = dateStr === today;
      const isFuture = dateStr > today;

      const opacity   = count === 0 ? 0 : Math.min(0.3 + count * 0.35, 1);
      const bg        = count > 0 ? `rgba(232,67,117,${opacity})` : 'var(--surface2)';
      const border    = isToday ? 'var(--elle)' : 'transparent';

      html += `<div class="heatmap-cell${isFuture ? ' future' : ''}"
        style="background:${bg};border-color:${border}"
        aria-label="${d} ${count > 0 ? `(${count} moment${count > 1 ? 's' : ''})` : ''}"
        title="${fmtDate(dateStr, { day:'numeric', month:'short' })}${count ? ` · ${count} moment${count > 1 ? 's' : ''}` : ''}">
        <span class="heatmap-day-num">${d}</span>
      </div>`;
    }

    html += '</div>';
    html += `<div class="heatmap-legend"><span style="background:rgba(232,67,117,.3)"></span>1 moment <span style="background:rgba(232,67,117,.65)"></span>2+ moments</div>`;

    showStat(el, html);

  } catch (e) {
    showStatError(el, 'Impossible de charger la heatmap. Vérifiez votre connexion.');
    console.error('renderMonthlyHeatmap:', e.message);
  }
}

// ─── Courbe de satisfaction (SVG) ─────────────────────────────────────────

export function renderSatisfactionCurve(userId, { sessions, feedbacks }) {
  const el = document.getElementById('satisfaction-curve');
  if (!el) return;

  try {
    if (!sessions?.length) { el.innerHTML = '<p class="intime-empty">Pas encore assez de sessions pour la courbe.</p>'; return; }

    const fbMap = Object.fromEntries((feedbacks || []).map(f => [f.session_id, f.satisfaction]));
    const points = sessions
      .map(s => ({ date: s.session_date, sat: fbMap[s.id] }))
      .filter(p => p.sat != null);

    if (points.length < 2) { el.innerHTML = '<p class="intime-empty">Partagez vos feedbacks pour voir la courbe.</p>'; return; }

    const W = 320, H = 100, PAD = 12;
    const maxSat = 10, minSat = 0;

    const xP = (i) => PAD + (i / (points.length - 1)) * (W - PAD * 2);
    const yP = (v) => PAD + (1 - (v - minSat) / (maxSat - minSat)) * (H - PAD * 2);

    // Courbe lissée (cubic bezier)
    let pathD = `M ${xP(0)} ${yP(points[0].sat)}`;
    for (let i = 1; i < points.length; i++) {
      const cx = (xP(i-1) + xP(i)) / 2;
      pathD += ` C ${cx} ${yP(points[i-1].sat)}, ${cx} ${yP(points[i].sat)}, ${xP(i)} ${yP(points[i].sat)}`;
    }

    // Zone sous la courbe
    const areaD = pathD + ` L ${xP(points.length-1)} ${H-PAD} L ${xP(0)} ${H-PAD} Z`;

    // Moyenne mobile 3 points
    const avg = points.map((_, i) => {
      const slice = points.slice(Math.max(0, i-1), i+2).map(p => p.sat);
      return slice.reduce((a, b) => a + b, 0) / slice.length;
    });
    let avgPath = `M ${xP(0)} ${yP(avg[0])}`;
    for (let i = 1; i < avg.length; i++) {
      const cx = (xP(i-1) + xP(i)) / 2;
      avgPath += ` C ${cx} ${yP(avg[i-1])}, ${cx} ${yP(avg[i])}, ${xP(i)} ${yP(avg[i])}`;
    }

    // Lignes horizontales de référence
    const grid = [3, 5, 7, 9].map(v =>
      `<line x1="${PAD}" y1="${yP(v)}" x2="${W-PAD}" y2="${yP(v)}"
        stroke="var(--line)" stroke-width="1" stroke-dasharray="3 3"/>
       <text x="${PAD-2}" y="${yP(v)+4}" font-size="8" fill="var(--faint)" text-anchor="end">${v}</text>`
    ).join('');

    el.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px" role="img" aria-label="Courbe satisfaction sur les 3 derniers mois">
        ${grid}
        <path d="${areaD}" fill="rgba(232,67,117,.08)"/>
        <path d="${pathD}" fill="none" stroke="rgba(232,67,117,.3)" stroke-width="1.5"/>
        <path d="${avgPath}" fill="none" stroke="var(--elle)" stroke-width="2.5"/>
        ${points.map((p, i) =>
          `<circle cx="${xP(i)}" cy="${yP(p.sat)}" r="3" fill="var(--elle)"
            aria-label="${fmtDate(p.date, {day:'numeric',month:'short'})} : ${p.sat}/10"/>`
        ).join('')}
      </svg>
      <div class="curve-legend">
        <span><span class="dot" style="background:var(--elle)"></span>Ma satisfaction · 10 pts max</span>
        <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--faint)">Courbe lissée sur ${points.length} feedbacks</span>
      </div>`;

  } catch (e) {
    showStatError(el, 'Impossible de charger la courbe. Vérifiez votre connexion.');
    console.error('renderSatisfactionCurve:', e.message);
  }
}

// ─── Taux d'orgasme par phase du cycle ────────────────────────────────────

const PHASES_DEF = [
  { id: 'menstruelle',  label: 'Menstruelle',  range: [1,5],   color: '#E53935' },
  { id: 'folliculaire', label: 'Folliculaire',  range: [6,13],  color: '#4278C4' },
  { id: 'ovulation',    label: 'Ovulation',     range: [14,16], color: '#7C5CFC' },
  { id: 'luteale',      label: 'Lutéale',       range: [17,35], color: '#E84375' },
];

export function renderOrgasmByPhase(st, { sessions, cycles, feedbacks }) {
  const el = document.getElementById('orgasm-by-phase');
  if (!el) return;

  const elleId = st.me?.tracks_cycle ? st.me.user_id : st.partner?.user_id;
  if (!elleId) { el.innerHTML = '<p class="intime-empty">—</p>'; return; }

  try {
    if (!sessions.length || !cycles.length) {
      el.innerHTML = '<p class="intime-empty">Plus de sessions pour voir les corrélations par phase.</p>';
      return;
    }

    const fbMap  = {};
    feedbacks.forEach(f => { fbMap[f.session_id] = fbMap[f.session_id] || {}; fbMap[f.session_id][f.user_id] = f.orgasms; });

    const byPhase = { menstruelle: {elle:[], lui:[]}, folliculaire: {elle:[], lui:[]}, ovulation: {elle:[], lui:[]}, luteale: {elle:[], lui:[]} };

    sessions.forEach(s => {
      const cycle = cycles.find(c => c.period_start <= s.session_date);
      if (!cycle) return;
      const day   = diffDays(s.session_date, cycle.period_start) + 1;
      const phase = PHASES_DEF.find(p => day >= p.range[0] && day <= p.range[1]);
      if (!phase) return;

      const elleOrg = fbMap[s.id]?.[elleId]     ?? null;
      const luiId   = st.me?.tracks_cycle ? st.partner?.user_id : st.me?.user_id;
      const luiOrg  = fbMap[s.id]?.[luiId]      ?? null;

      if (elleOrg !== null) byPhase[phase.id].elle.push(elleOrg > 0 ? 1 : 0);
      if (luiOrg  !== null) byPhase[phase.id].lui.push(luiOrg  > 0 ? 1 : 0);
    });

    const rate = (arr) => arr.length ? Math.round(arr.reduce((a,b)=>a+b,0) / arr.length * 100) : null;

    const hasData = PHASES_DEF.some(p => byPhase[p.id].elle.length || byPhase[p.id].lui.length);
    if (!hasData) {
      el.innerHTML = '<p class="intime-empty">Partagez vos feedbacks pour voir les tendances par phase.</p>';
      return;
    }

    const elleName = st.me?.tracks_cycle ? (st.me?.display_name || 'Elle') : (st.partner?.display_name || 'Elle');
    const luiName  = st.me?.tracks_cycle ? (st.partner?.display_name || 'Lui') : (st.me?.display_name || 'Lui');

    el.innerHTML = PHASES_DEF.map(phase => {
      const elleRate = rate(byPhase[phase.id].elle);
      const luiRate  = rate(byPhase[phase.id].lui);
      const n        = Math.max(byPhase[phase.id].elle.length, byPhase[phase.id].lui.length);

      return `<div class="orgasm-phase-row">
        <div class="orgasm-phase-label" style="color:${phase.color}">${phase.label}</div>
        <div class="orgasm-phase-bars">
          ${elleRate !== null ? `
            <div class="orgasm-bar-wrap" aria-label="${elleName} : ${elleRate}% de plaisir">
              <span class="orgasm-who">${elleName}</span>
              <div class="orgasm-bar-track"><div class="orgasm-bar-fill" style="width:${elleRate}%;background:var(--elle)"></div></div>
              <span class="orgasm-pct">${elleRate}%</span>
            </div>` : ''}
          ${luiRate !== null ? `
            <div class="orgasm-bar-wrap" aria-label="${luiName} : ${luiRate}% de plaisir">
              <span class="orgasm-who">${luiName}</span>
              <div class="orgasm-bar-track"><div class="orgasm-bar-fill" style="width:${luiRate}%;background:var(--lui)"></div></div>
              <span class="orgasm-pct">${luiRate}%</span>
            </div>` : ''}
        </div>
        <div class="orgasm-n">${n} session${n > 1 ? 's' : ''}</div>
      </div>`;
    }).join('');

    el.insertAdjacentHTML('beforeend', `<p style="font-size:11px;color:var(--faint);font-family:'DM Mono',monospace;margin-top:12px;line-height:1.6">Basé sur les feedbacks partagés · Informatif, pas un objectif de performance.</p>`);

  } catch (e) {
    showStatError(el, 'Impossible de charger les stats. Vérifiez votre connexion.');
    console.error('renderOrgasmByPhase:', e.message);
  }
}

// ─── Fenêtre de désir ──────────────────────────────────────────────────────

export async function renderDesireWindow(st) {
  const el = document.getElementById('desire-window');
  if (!el || !st.partner) {
    if (el) el.style.display = 'none';
    return;
  }

  try {
    const since = new Date(Date.now() - 7 * 864e5).toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('log_entries')
      .select('user_id, log_date, value')
      .eq('category_id', 'libido')
      .gte('log_date', since);

    if (error) throw error;

    const byDate = {};
    (data || []).forEach(r => {
      if (!byDate[r.log_date]) byDate[r.log_date] = {};
      byDate[r.log_date][r.user_id] = Number(r.value?.v ?? r.value);
    });

    const today   = localDateStr();
    const hotDays = Object.entries(byDate)
      .filter(([, d]) => d[st.me?.user_id] >= 4 && d[st.partner?.user_id] >= 4)
      .map(([date]) => date);

    el.style.display = 'block';

    if (hotDays.includes(today)) {
      el.innerHTML = `<div class="desire-hot" role="status" aria-live="polite">
        🔥 Vos libidos sont alignées aujourd'hui
      </div>`;
    } else if (hotDays.length) {
      el.innerHTML = `<div class="desire-info">✨ ${hotDays.length} jour${hotDays.length > 1 ? 's' : ''} aligné${hotDays.length > 1 ? 's' : ''} cette semaine</div>`;
    } else {
      el.style.display = 'none';
    }

  } catch (e) {
    el.style.display = 'none';
    console.error('renderDesireWindow:', e.message);
  }
}

// ─── Souvenir du jour ──────────────────────────────────────────────────────

export async function renderSouvenirDuJour(coupleId) {
  const el = document.getElementById('souvenir-du-jour');
  if (!el) return;

  try {
    const cutoff = new Date(Date.now() - 14 * 864e5).toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('intimate_sessions')
      .select('*')
      .eq('couple_id', coupleId)
      .lt('session_date', cutoff)
      .order('session_date', { ascending: false })
      .limit(20);

    if (error) throw error;
    if (!data?.length) { el.style.display = 'none'; return; }

    const MOODS_L = { tender:'🥰', playful:'😄', passionate:'🔥', spontaneous:'⚡' };
    const seed    = new Date().getDate() + new Date().getMonth() * 31;
    const s       = data[seed % data.length];
    const diff    = diffDays(localDateStr(), s.session_date);

    el.style.display = 'block';
    el.innerHTML = `<div class="souvenir-card">
      <div class="souvenir-label">✨ Souvenir · il y a ${diff} jours</div>
      <div class="souvenir-mood">${MOODS_L[s.mood] || '💑'}</div>
      ${s.note ? `<div class="souvenir-note">${s.note}</div>` : ''}
      <div class="souvenir-date">${fmtDate(s.session_date, { weekday:'long', day:'numeric', month:'long' })}</div>
    </div>`;

  } catch (e) {
    el.style.display = 'none';
    console.error('renderSouvenirDuJour:', e.message);
  }
}

// ─── Débrief post-dispute ──────────────────────────────────────────────────

const RECONNECT_IDEAS = [
  'Un câlin sans attente',
  'Un repas préparé ensemble',
  'Une promenade en silence',
  'Écouter de la musique que vous aimez tous les deux',
  'Une soirée film sous une couverture',
];

export async function renderDebriefPostDispute(coupleId, partnerName) {
  const el = document.getElementById('debrief-postdispute');
  if (!el) return;

  try {
    const since = new Date(Date.now() - 5 * 864e5).toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('couple_events')
      .select('event_date, note')
      .eq('couple_id', coupleId)
      .eq('event_type', 'conflict')
      .gte('event_date', since)
      .order('event_date', { ascending: false })
      .limit(1);

    if (error) throw error;
    if (!data?.length) { el.style.display = 'none'; return; }

    const daysSince = diffDays(localDateStr(), data[0].event_date);
    const idea      = RECONNECT_IDEAS[new Date().getDate() % RECONNECT_IDEAS.length];

    el.style.display = 'block';
    el.innerHTML = `<div class="debrief-card" role="note">
      <div class="debrief-title">💬 Tension il y a ${daysSince} jour${daysSince > 1 ? 's' : ''}</div>
      <div class="debrief-idea">Idée de reconnexion : <em>${idea}</em></div>
      <div class="debrief-sub">Quand vous vous sentez prêts, sans pression.</div>
    </div>`;

  } catch (e) {
    el.style.display = 'none';
    console.error('renderDebriefPostDispute:', e.message);
  }
}

// ─── Équité du plaisir ──────────────────────────────────────────────────────

export function renderEquitePlaisir(st, sharedFeedbacks) {
  const el = document.getElementById('equite-plaisir');
  if (!el || !st.partner) { el && (el.innerHTML = '<p class="intime-empty">En attente de votre partenaire.</p>'); return; }

  try {
    if (!sharedFeedbacks?.length || sharedFeedbacks.length < 3) {
      el.innerHTML = '<p class="intime-empty">Partagez vos feedbacks pour voir les tendances.</p>';
      return;
    }

    const myName      = st.me?.display_name    || 'Moi';
    const partnerName = st.partner?.display_name || 'Partenaire';
    const myData      = sharedFeedbacks.filter(f => f.user_id === st.me?.user_id);
    const theirData   = sharedFeedbacks.filter(f => f.user_id === st.partner?.user_id);

    const avgSat  = (arr) => arr.length ? (arr.reduce((a, f) => a + (f.satisfaction||0), 0) / arr.length).toFixed(1) : '—';
    const orgRate = (arr) => arr.length ? `${Math.round(arr.filter(f => f.orgasms > 0).length / arr.length * 100)}%` : '—';

    el.innerHTML = `
      <div class="equity-grid" role="group" aria-label="Comparaison satisfaction">
        <div class="equity-item">
          <div class="equity-name">${myName}</div>
          <div class="equity-sat" aria-label="Satisfaction ${avgSat(myData)}/10">${avgSat(myData)}<span>/10</span></div>
          <div class="equity-label">Satisfaction moy.</div>
          <div class="equity-org" aria-label="${orgRate(myData)} de plaisir partagé">${orgRate(myData)}</div>
          <div class="equity-label">Plaisir partagé</div>
        </div>
        <div class="equity-item">
          <div class="equity-name">${partnerName}</div>
          <div class="equity-sat" style="color:var(--lui)" aria-label="Satisfaction ${avgSat(theirData)}/10">${avgSat(theirData)}<span>/10</span></div>
          <div class="equity-label">Satisfaction moy.</div>
          <div class="equity-org" style="color:var(--lui)" aria-label="${orgRate(theirData)} de plaisir partagé">${orgRate(theirData)}</div>
          <div class="equity-label">Plaisir partagé</div>
        </div>
      </div>
      <p style="font-size:11px;color:var(--faint);font-family:'DM Mono',monospace;margin-top:10px;line-height:1.6">
        ${sharedFeedbacks.length} feedbacks partagés · Informatif, pas un score de performance.
      </p>`;

  } catch (e) {
    showStatError(el, 'Impossible de charger les stats de satisfaction. Réessayez plus tard.');
    console.error('renderEquitePlaisir:', e.message);
  }
}

// ─── §2C — Alertes santé récurrentes ──────────────────────────────────────
// Détecte les mentions d'inconfort dans le feedback libre (≥ 2 fois / 30 jours).
// Non diagnostique : oriente vers un professionnel, ne conclut pas.

const PAIN_KEYWORDS = [
  'douleur', 'douloureux', 'doulou', 'mal ',
  'inconfort', 'inconfortable',
  'brûle', 'brûlure', 'brule', 'brulure',
  'saigne', 'saignement',
  'sèche', 'sécheresse', 'seche', 'secheresse',
  'irritation', 'irrité', 'irritée',
  'piqûre', 'pique', 'sensible', 'sensibilité',
];

export function renderHealthAlerts(userId, feedbacks) {
  const el = document.getElementById('health-alerts');
  if (!el) return;

  try {
    const painMentions = (feedbacks || []).filter(f =>
      PAIN_KEYWORDS.some(k => f.improve_txt?.toLowerCase().includes(k))
    );

    if (painMentions.length < 2) { el.style.display = 'none'; return; }

    el.style.display = 'block';
    el.innerHTML = `<div class="health-alert-card" role="note" aria-label="Note de bien-être">
      <div class="health-alert-icon">💙</div>
      <div class="health-alert-body">
        <div class="health-alert-title">Un inconfort noté plusieurs fois</div>
        <p>Tu as mentionné un inconfort dans ${painMentions.length} feedbacks des 30 derniers jours. Si ça persiste, consulter un professionnel de santé peut aider — sans urgence, juste pour prendre soin de toi.</p>
        <p class="health-alert-note">Ce message est informatif, pas un diagnostic.</p>
      </div>
    </div>`;

  } catch (e) {
    el.style.display = 'none';
    console.error('renderHealthAlerts:', e.message);
  }
}
