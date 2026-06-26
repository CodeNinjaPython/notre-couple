import { supabase, IS_DEMO } from './supabase.js';
import { signOut } from './auth.js';
import { navigate } from './router.js';
import { getMyMembership, getPartnerMembership } from './pairing.js';
import { initCollapsibles } from './collapse.js';
import { renderHistoryChart } from './ring-chart.js';
import { getCycleMode, setCycleMode } from './onboarding.js';
import {
  computeSyncScore, computeWeeklyTrends, computeEventsByPhase,
  computeConflictsByPhase, detectCycleAnomalies, predictPeriodDuration,
  loadAnalyticsData, pearson, buildMap, align,
} from './analytics.js';
import { currentWeekDates, daysAgo, localDateStr } from './date-utils.js';
import { exportPDF } from './pdf.js';
import { generateInsights, computeLibidoAlignment, loadSessionsWithFeedback } from './insights.js';

const MODE_DESCS = {
  rules:      'Comprendre vos rythmes communs — corrélations, synchronie et insights par phase.',
  conception: 'Fenêtre fertile mise en avant dans la prédiction. Le calendrier affiche les jours de fertilité maximale.',
  pregnancy:  'Suivi semaine par semaine. La prédiction des règles est désactivée.',
};

// ---------------------------------------------------------------------------
// Paires de métriques à corréler (§9)
// ---------------------------------------------------------------------------
const PAIRS = [
  { a: 'energy',  b: 'energy',  label: 'Énergie · synchronie',      desc: 'Vos niveaux d\'énergie évoluent-ils de concert ?' },
  { a: 'mood',    b: 'mood',    label: 'Humeur · synchronie',        desc: 'Vos humeurs sont-elles alignées au même moment ?' },
  { a: 'libido',  b: 'libido',  label: 'Libido · désir partagé',     desc: 'Vos envies se rejoignent-elles ?' },
  { a: 'sleep',   b: 'sleep',   label: 'Sommeil · qualité commune',  desc: 'Dormez-vous bien ou mal aux mêmes moments ?' },
  { a: 'cramps',  b: 'mood',    label: 'Crampes Elle → Humeur Lui',  desc: 'Son humeur est-elle touchée quand elle a des crampes ?' },
  { a: 'energy',  b: 'stress',  label: 'Énergie Elle → Stress Lui',  desc: 'Quand elle est basse en énergie, est-il plus stressé ?' },
  { a: 'mood',    b: 'libido',  label: 'Humeur Elle → Libido Lui',   desc: 'Son humeur influence-t-elle son désir à lui ?' },
  { a: 'libido',  b: 'stress',  label: 'Libido Elle → Stress Lui',   desc: 'Existe-t-il un lien entre son désir et son stress ?' },
];

const STRENGTH = [
  { min: 0.6,  label: 'Très forte',  color: 'var(--gold)' },
  { min: 0.4,  label: 'Forte',       color: 'var(--gold)' },
  { min: 0.25, label: 'Modérée',     color: 'var(--muted)' },
  { min: 0,    label: 'Légère',      color: 'var(--faint)' },
];

function strength(r) {
  const abs = Math.abs(r);
  return STRENGTH.find(s => abs >= s.min) || STRENGTH[STRENGTH.length - 1];
}

// pearson / buildMap / align importés depuis analytics.js (plus de doublons)

// ---------------------------------------------------------------------------
// Initialisation principale
// ---------------------------------------------------------------------------
export async function initNous() {
  const me = await getMyMembership();
  if (!me) { navigate('auth'); return; }
  const partner = await getPartnerMembership(me.couple_id);

  document.getElementById('today-date').textContent =
    new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  // Charger données en parallèle (analytics centralisé)
  const { entries, events, cycles } = await loadAnalyticsData(me.couple_id);

  // Identifier elle/lui
  const elleId = me.tracks_cycle ? me.user_id : partner?.user_id;
  const luiId  = me.tracks_cycle ? partner?.user_id : me.user_id;

  const syncScore = computeSyncScore(entries, elleId, luiId);

  renderWeekStats(entries, events, elleId, luiId, me, partner);
  renderSyncScore(syncScore);
  renderTrends(entries, elleId, luiId);
  renderWeeklyChart(entries, elleId, luiId);
  renderCorrelations(entries, elleId, luiId, partner);
  renderEventsByPhase(events, cycles);
  renderConflictHeatmap(events, cycles);
  renderAnomalies(cycles);
  renderHistoryChart(document.getElementById('cycles-history-chart'), cycles);
  renderSettings(me, partner);

  // Insights auto + alignement libido
  const sessions = await loadSessionsWithFeedback(me.couple_id);
  renderInsights({ entries, cycles, sessions, elleId, luiId });
  renderLibidoAlignment(entries, elleId, luiId);

  // Accordéons de la vue Analyse
  initCollapsibles(document.getElementById('view'));
}

// ---------------------------------------------------------------------------
// Carte : stats de la semaine
// ---------------------------------------------------------------------------
function renderWeekStats(entries, events, elleId, luiId, me, partner) {
  const wrap = document.getElementById('nous-week');
  if (!wrap) return;

  const week = new Set(currentWeekDates());
  const elleDays = new Set(entries.filter(e => e.user_id === elleId && week.has(e.log_date)).map(e => e.log_date)).size;
  const luiDays  = new Set(entries.filter(e => e.user_id === luiId  && week.has(e.log_date)).map(e => e.log_date)).size;
  const weekEvents = events.filter(e => week.has(e.event_date)).length;

  const elleName   = me.tracks_cycle ? me.display_name : (partner?.display_name || 'Elle');
  const luiName    = me.tracks_cycle ? (partner?.display_name || 'Lui') : me.display_name;

  wrap.innerHTML = `
    <div class="stat-grid">
      <div class="stat-item">
        <div class="stat-val" style="color:var(--gold)">${elleDays}<span style="font-size:14px;color:var(--faint)">/7</span></div>
        <div class="stat-label">${elleName} · jours</div>
      </div>
      <div class="stat-item">
        <div class="stat-val" style="color:var(--sage)">${luiDays}<span style="font-size:14px;color:var(--faint)">/7</span></div>
        <div class="stat-label">${luiName} · jours</div>
      </div>
      <div class="stat-item">
        <div class="stat-val">${weekEvents}</div>
        <div class="stat-label">Moments</div>
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Carte : tendances (moyennes 7 derniers jours)
// ---------------------------------------------------------------------------
function renderTrends(entries, elleId, luiId) {
  const wrap = document.getElementById('nous-trends');
  if (!wrap) return;

  const since7 = daysAgo(7);
  const recent = entries.filter(e => e.log_date >= since7);

  function avg(uid, cat) {
    const vals = recent.filter(e => e.user_id === uid && e.category_id === cat)
      .map(e => Number(e.value?.v ?? e.value)).filter(v => !isNaN(v));
    return vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length) : null;
  }

  const METRICS = ['energy', 'mood', 'libido', 'sleep'];
  const LABELS  = { energy:'Énergie', mood:'Humeur', libido:'Libido', sleep:'Sommeil' };

  const rows = METRICS.map(m => {
    const ea = avg(elleId, m);
    const la = avg(luiId, m);
    if (ea == null && la == null) return null;
    const bar = (v) => v == null ? '—' : `<span class="trend-bar" style="--v:${((v-1)/4*100).toFixed(0)}%"></span><span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--faint)">${v.toFixed(1)}</span>`;
    return `<div class="trend-row">
      <span class="trend-name">${LABELS[m]}</span>
      <span class="trend-val" style="color:var(--gold)">${bar(ea)}</span>
      <span class="trend-val" style="color:var(--sage)">${bar(la)}</span>
    </div>`;
  }).filter(Boolean);

  if (!rows.length) {
    wrap.innerHTML = '<div style="color:var(--faint);font-size:13px">Saisies des 7 derniers jours insuffisantes.</div>';
    return;
  }

  wrap.innerHTML = `
    <div class="trend-header">
      <span></span>
      <span style="color:var(--gold);font-size:11px;font-family:'DM Mono',monospace">Elle</span>
      <span style="color:var(--sage);font-size:11px;font-family:'DM Mono',monospace">Lui</span>
    </div>
    ${rows.join('')}`;
}

// ---------------------------------------------------------------------------
// Carte : corrélations (§9)
// ---------------------------------------------------------------------------
function renderCorrelations(entries, elleId, luiId, partner) {
  const wrap = document.getElementById('nous-correlations');
  if (!wrap) return;

  if (!partner || !luiId || !elleId) {
    wrap.innerHTML = '<div class="msg info">En attente de votre partenaire pour calculer les corrélations.</div>';
    return;
  }

  const results = [];

  for (const pair of PAIRS) {
    const ma = buildMap(entries, elleId, pair.a);
    const mb = buildMap(entries, luiId,  pair.b);
    const { xs, ys, n } = align(ma, mb);
    if (n < 5) continue;
    const r = pearson(xs, ys);
    if (r == null || Math.abs(r) < 0.2) continue;
    results.push({ ...pair, r, n });
  }

  if (!results.length) {
    const totalDays = new Set(entries.map(e => e.log_date)).size;
    wrap.innerHTML = `<div class="msg info">
      ${totalDays < 5
        ? `Encore ${5 - totalDays} jours de saisie minimum pour activer les corrélations.`
        : 'Pas encore de corrélation significative détectée — continuez à saisir.'
      }
    </div>`;
    return;
  }

  results.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

  wrap.innerHTML = results.map(({ label, desc, r, n }) => {
    const s     = strength(r);
    const abs   = Math.abs(r);
    const pct   = (abs * 50).toFixed(1);
    const isPos = r >= 0;
    const fillPos = isPos
      ? `left:50%;width:${pct}%;background:${s.color}`
      : `right:50%;width:${pct}%;background:var(--rose)`;
    const sign = r >= 0 ? '+' : '';

    return `<div class="corr-item">
      <div class="corr-label">${label}</div>
      <div class="corr-desc">${desc}</div>
      <div class="corr-bar-wrap">
        <div class="corr-center"></div>
        <div class="corr-fill" style="${fillPos}"></div>
      </div>
      <div class="corr-meta">
        <span style="color:${s.color};font-family:'DM Mono',monospace;font-size:12px">r=${sign}${r.toFixed(2)}</span>
        <span>${s.label}</span>
        <span>${n} jours de données</span>
      </div>
    </div>`;
  }).join('');
}

// ---------------------------------------------------------------------------
// Score de synchronie global
// ---------------------------------------------------------------------------
function renderSyncScore(score) {
  const el = document.getElementById('sync-score');
  if (!el) return;
  if (score == null) { el.closest('.card')?.style && (el.closest('.card').style.display = 'none'); return; }
  el.closest('.card') && (el.closest('.card').style.display = 'block');
  const color = score >= 60 ? 'var(--elle)' : score >= 35 ? 'var(--lui)' : 'var(--faint)';
  const label = score >= 60 ? 'Excellente' : score >= 35 ? 'Bonne' : 'En construction';
  el.innerHTML = `
    <div class="sync-circle" style="--score:${score}%;--color:${color}">
      <div class="sync-value">${score}</div>
      <div class="sync-max">/100</div>
    </div>
    <div class="sync-label">${label} synchronie</div>
    <div class="sync-sub">Moyenne de ${score >= 35 ? 'plusieurs' : 'quelques'} indicateurs Pearson</div>`;
}

// ---------------------------------------------------------------------------
// Tendances 3 mois (sparklines hebdomadaires)
// ---------------------------------------------------------------------------
function renderWeeklyChart(entries, elleId, luiId) {
  const el = document.getElementById('nous-weekly-chart');
  if (!el) return;
  const trends = computeWeeklyTrends(entries, elleId, luiId, 12);
  if (!trends.some(t => t.elleEnergy != null)) { el.style.display = 'none'; return; }
  el.style.display = 'block';

  const W = 340, H = 80, n = trends.length;
  const valid = (arr) => arr.filter(v => v != null);
  const allVals = [...trends.map(t=>t.elleEnergy), ...trends.map(t=>t.luiEnergy)].filter(v=>v!=null);
  const minV = Math.min(...allVals) - 0.3;
  const maxV = Math.max(...allVals) + 0.3;
  const xP = i => 10 + (i / (n-1)) * (W - 20);
  const yP = v => H - 8 - ((v - minV) / (maxV - minV)) * (H - 16);

  const path = (data, color) => {
    const pts = data.map((v, i) => v != null ? [xP(i), yP(v)] : null).filter(Boolean);
    if (pts.length < 2) return '';
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const cx = (pts[i-1][0] + pts[i][0]) / 2;
      d += ` C ${cx} ${pts[i-1][1]}, ${cx} ${pts[i][1]}, ${pts[i][0]} ${pts[i][1]}`;
    }
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="2" opacity=".9"/>`;
  };

  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px;border-radius:10px;background:var(--surface2)">
    ${path(trends.map(t=>t.elleEnergy), '#E84375')}
    ${path(trends.map(t=>t.luiEnergy),  '#4278C4')}
  </svg>
  <div class="legend" style="margin-top:8px">
    <span><i class="dot g"></i>Énergie Elle</span>
    <span><i class="dot s"></i>Énergie Lui</span>
  </div>`;
}

// ---------------------------------------------------------------------------
// Répartition des moments par phase
// ---------------------------------------------------------------------------
const PHASE_COLORS_MAP = { Menstruelle:'#E53935', Folliculaire:'#4278C4', Ovulation:'#7C5CFC', Lutéale:'#E84375' };
const PHASE_ORDER = ['Menstruelle', 'Folliculaire', 'Ovulation', 'Lutéale'];

function renderEventsByPhase(events, cycles) {
  const el = document.getElementById('events-by-phase');
  if (!el) return;
  if (!events.length) { el.innerHTML = '<div class="msg info">Pas encore d\'événements.</div>'; return; }

  const counts = computeEventsByPhase(events, cycles);
  const total  = PHASE_ORDER.reduce((s, p) => s + (counts[p] || 0), 0) || 1;

  el.innerHTML = PHASE_ORDER.map(phase => {
    const n = counts[phase] || 0;
    const pct = Math.round(n / total * 100);
    return `<div class="phase-bar-row">
      <span class="phase-bar-label">${phase}</span>
      <div class="phase-bar-track">
        <div class="phase-bar-fill" style="width:${pct}%;background:${PHASE_COLORS_MAP[phase]}"></div>
      </div>
      <span class="phase-bar-count">${n}</span>
    </div>`;
  }).join('');
}

// ---------------------------------------------------------------------------
// Heatmap conflits par phase
// ---------------------------------------------------------------------------
function renderConflictHeatmap(events, cycles) {
  const el = document.getElementById('conflict-heatmap');
  if (!el) return;
  const conflicts = events.filter(e => e.event_type === 'conflict');
  if (!conflicts.length) { el.innerHTML = '<div style="color:var(--faint);font-size:13px">Aucun conflit enregistré.</div>'; return; }

  const counts = computeConflictsByPhase(conflicts, cycles);
  const max = Math.max(...PHASE_ORDER.map(p => counts[p] || 0), 1);

  el.innerHTML = `<div class="heatmap-grid">
    ${PHASE_ORDER.map(phase => {
      const n = counts[phase] || 0;
      const intensity = Math.round((n / max) * 100);
      return `<div class="heatmap-cell" title="${n} conflit${n > 1 ? 's' : ''} · ${phase}"
        style="background:${PHASE_COLORS_MAP[phase]};opacity:${0.15 + (intensity / 100) * 0.85}">
        <span class="heatmap-n">${n}</span>
        <span class="heatmap-label">${phase.slice(0, 4)}.</span>
      </div>`;
    }).join('')}
  </div>
  <p style="font-size:11px;color:var(--faint);margin-top:8px;font-family:'DM Mono',monospace">Intensité = fréquence relative des tensions</p>`;
}

// ---------------------------------------------------------------------------
// Anomalies de cycle
// ---------------------------------------------------------------------------
function renderAnomalies(cycles) {
  const el = document.getElementById('cycle-anomalies');
  if (!el) return;
  const anomalies = detectCycleAnomalies(cycles);
  const duration  = predictPeriodDuration(cycles);

  if (!anomalies.length && !duration) { el.innerHTML = '<div style="color:var(--faint);font-size:13px">Aucune anomalie détectée.</div>'; return; }

  const durLine = duration
    ? `<div class="anomaly-row" style="color:var(--lui)">📊 Durée de règles habituelle : <strong>${duration} jours</strong></div>`
    : '';

  el.innerHTML = durLine + anomalies.map(a => `
    <div class="anomaly-row" style="color:${a.type === 'court' ? 'var(--red)' : 'var(--violet)'}">
      ${a.type === 'court' ? '⚡' : '📅'} Cycle ${a.type} : <strong>${a.len} jours</strong> (${a.date})
    </div>`).join('');
}

// ---------------------------------------------------------------------------
// Réglages
// ---------------------------------------------------------------------------
function renderSettings(me, partner) {
  const nameEl     = document.getElementById('settings-name-val');
  const nameInput  = document.getElementById('settings-name-input');
  const btnEdit    = document.getElementById('btn-settings-edit');
  const btnSave    = document.getElementById('btn-settings-save');
  const tracksEl   = document.getElementById('settings-tracks');
  const btnSignout = document.getElementById('btn-nous-signout');

  if (nameEl)    nameEl.textContent   = me.display_name || '—';
  if (tracksEl)  tracksEl.checked     = !!me.tracks_cycle;
  if (nameInput) nameInput.value      = me.display_name || '';

  btnEdit?.addEventListener('click', () => {
    nameEl.style.display    = 'none';
    nameInput.style.display = 'block';
    btnEdit.style.display   = 'none';
    btnSave.style.display   = 'inline-block';
    nameInput.focus();
  });

  btnSave?.addEventListener('click', async () => {
    const newName = nameInput.value.trim();
    if (!newName) return;
    const { error } = await supabase
      .from('couple_members')
      .update({ display_name: newName })
      .eq('user_id', me.user_id);
    if (!error) {
      nameEl.textContent      = newName;
      nameEl.style.display    = 'inline';
      nameInput.style.display = 'none';
      btnEdit.style.display   = 'inline-block';
      btnSave.style.display   = 'none';
    }
  });

  tracksEl?.addEventListener('change', async () => {
    const { error } = await supabase
      .from('couple_members')
      .update({ tracks_cycle: tracksEl.checked })
      .eq('user_id', me.user_id);
    if (error) tracksEl.checked = !tracksEl.checked;
  });

  btnSignout?.addEventListener('click', async () => {
    await signOut();
    navigate('auth');
  });

  document.getElementById('btn-export-json')?.addEventListener('click', () => exportData('json'));
  document.getElementById('btn-export-csv')?.addEventListener('click',  () => exportData('csv'));
  document.getElementById('btn-export-pdf')?.addEventListener('click',  () => exportPDF(me?.couple_id, me, partner));
  document.getElementById('btn-delete-data')?.addEventListener('click', () => deleteAllData(me));
  document.getElementById('btn-unlink')?.addEventListener('click', () => unlinkAccount(me));
  initNotifSettings();

  // Mode cycle tabs
  renderModeTabs();
  document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const mode = tab.dataset.mode;
      setCycleMode(mode);
      renderModeTabs();
    });
  });

  // Bouton install PWA
  const installBtn = document.getElementById('btn-install');
  if (installBtn && window.__installPrompt) {
    installBtn.style.display = 'block';
    installBtn.addEventListener('click', async () => {
      window.__installPrompt.prompt();
      const { outcome } = await window.__installPrompt.userChoice;
      if (outcome === 'accepted') installBtn.style.display = 'none';
    }, { once: true });
  }

  // Bouton reset (mode démo uniquement)
  const resetBtn = document.getElementById('btn-reset-demo');
  if (resetBtn && IS_DEMO) {
    resetBtn.style.display = 'block';
    resetBtn.addEventListener('click', async () => {
      if (!confirm('Réinitialiser toutes les données de démo ?')) return;
      const { resetDemoData } = await import('./local-db.js');
      resetDemoData();
      window.location.reload();
    }, { once: true });
  }
}

// ---------------------------------------------------------------------------
// Export JSON + CSV (§10)
// ---------------------------------------------------------------------------
async function exportData(format = 'json') {
  const today = localDateStr();
  const btn   = document.getElementById(`btn-export-${format}`);
  if (btn) { btn.disabled = true; btn.textContent = 'Export…'; }

  try {
    const { data } = await supabase
      .from('log_entries').select('*').order('log_date');

    let blob, filename;
    if (format === 'csv') {
      const headers = ['log_date', 'category_id', 'value', 'shared', 'created_at'];
      const rows = (data || []).map(r => [
        r.log_date, r.category_id,
        r.value?.v ?? r.value ?? '',
        r.shared, r.created_at,
      ].map(v => JSON.stringify(v ?? '')).join(','));
      blob = new Blob([headers.join(',') + '\n' + rows.join('\n')], { type: 'text/csv' });
      filename = `notre-cycle-${today}.csv`;
    } else {
      blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      filename = `notre-cycle-${today}.json`;
    }

    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url; a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = format === 'csv' ? 'Exporter en CSV' : 'Exporter en JSON';
    }
  }
}

// ---------------------------------------------------------------------------
// Mode cycle tabs
// ---------------------------------------------------------------------------
function renderModeTabs() {
  const current = getCycleMode();
  document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.mode === current);
  });
  const desc = document.getElementById('mode-desc');
  if (desc) desc.textContent = MODE_DESCS[current] || '';
}

// ---------------------------------------------------------------------------
// Supprimer toutes les données personnelles (RGPD §10)
// ---------------------------------------------------------------------------
async function deleteAllData(me) {
  const confirmed = confirm(
    'Supprimer TOUTES vos données personnelles ?\n\n' +
    'Ceci effacera définitivement toutes vos saisies, cycles et historique. ' +
    'Cette action est irréversible et ne peut pas être annulée.'
  );
  if (!confirmed) return;

  const btn = document.getElementById('btn-delete-data');
  if (btn) { btn.disabled = true; btn.textContent = 'Suppression…'; }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    // Supprimer les données dans l'ordre (cascade FK)
    await supabase.from('log_entries').delete().eq('user_id', user.id);
    await supabase.from('cycles').delete().eq('user_id', user.id);
    await supabase.from('couple_members').delete().eq('user_id', user.id);

    await signOut();
    window.location.reload();
  } catch (e) {
    alert('Erreur : ' + e.message);
    if (btn) { btn.disabled = false; btn.textContent = 'Supprimer toutes mes données'; }
  }
}

// ---------------------------------------------------------------------------
// Délier le compte (§10)
// ---------------------------------------------------------------------------
async function unlinkAccount(me) {
  const confirmed = confirm(
    'Voulez-vous vraiment vous délier du couple ?\n\n' +
    'Vos données personnelles seront conservées mais votre partenaire ne pourra plus les voir. ' +
    'Cette action est irréversible.'
  );
  if (!confirmed) return;

  const btn = document.getElementById('btn-unlink');
  if (btn) { btn.disabled = true; btn.textContent = 'Déliaison…'; }

  try {
    const { error } = await supabase
      .from('couple_members')
      .delete()
      .eq('user_id', me.user_id);

    if (error) throw error;

    // Déconnecter et retourner à l'auth
    const { signOut: so } = await import('./auth.js');
    await so();
    window.location.reload();
  } catch (e) {
    alert('Erreur : ' + e.message);
    if (btn) { btn.disabled = false; btn.textContent = 'Se délier du couple'; }
  }
}

// ---------------------------------------------------------------------------
// Paramètres notifications
// ---------------------------------------------------------------------------
const NOTIF_KEY = 'nc-notif-settings';
const NOTIF_DEFAULTS = { daily: true, rules: true, fertile: false, libido_aligned: false, hour: 20 };

function getNotifSettings() {
  try { return { ...NOTIF_DEFAULTS, ...JSON.parse(localStorage.getItem(NOTIF_KEY)) }; }
  catch { return { ...NOTIF_DEFAULTS }; }
}
function saveNotifSettings(s) { localStorage.setItem(NOTIF_KEY, JSON.stringify(s)); }

function initNotifSettings() {
  const s = getNotifSettings();

  const dailyEl   = document.getElementById('notif-toggle-daily');
  const rulesEl   = document.getElementById('notif-toggle-rules');
  const fertileEl = document.getElementById('notif-toggle-fertile');
  const libidoEl  = document.getElementById('notif-toggle-libido-aligned');
  const hourEl    = document.getElementById('notif-hour');

  if (dailyEl)   dailyEl.checked   = s.daily;
  if (rulesEl)   rulesEl.checked   = s.rules;
  if (fertileEl) fertileEl.checked = s.fertile;
  if (libidoEl)  libidoEl.checked  = s.libido_aligned;
  if (hourEl)    hourEl.value      = s.hour;

  const save = () => saveNotifSettings({
    daily:          dailyEl?.checked   ?? s.daily,
    rules:          rulesEl?.checked   ?? s.rules,
    fertile:        fertileEl?.checked ?? s.fertile,
    libido_aligned: libidoEl?.checked  ?? s.libido_aligned,
    hour:           parseInt(hourEl?.value ?? s.hour),
  });

  dailyEl?.addEventListener('change', save);
  rulesEl?.addEventListener('change', save);
  fertileEl?.addEventListener('change', save);
  libidoEl?.addEventListener('change', save);
  hourEl?.addEventListener('change', save);
}

export { getNotifSettings };

// ── Insights auto-générés ─────────────────────────────────────────────────
function renderInsights({ entries, cycles, sessions, elleId, luiId }) {
  const wrap = document.getElementById('nous-insights');
  if (!wrap) return;

  const list = generateInsights({ sessions, entries, cycles, elleId, luiId });
  if (!list.length) {
    wrap.innerHTML = '<div class="msg info">Continue à journaliser pour voir tes insights personnalisés.</div>';
    return;
  }

  const TYPE_BORDER = { positive: 'var(--elle)', info: 'var(--lui)', warning: 'var(--red)' };
  wrap.innerHTML = list.map(ins => `
    <div class="insight-card" style="border-left-color:${TYPE_BORDER[ins.type] || 'var(--faint)'}">
      <div class="insight-header">
        <span class="insight-icon" aria-hidden="true">${ins.icon}</span>
        <strong class="insight-title">${ins.title}</strong>
      </div>
      <p class="insight-body">${ins.body}</p>
    </div>`).join('');
}

// ── Alignement libido ─────────────────────────────────────────────────────
function renderLibidoAlignment(entries, elleId, luiId) {
  const wrap = document.getElementById('nous-libido-align');
  if (!wrap) return;

  const { score, label, trend, byDay } = computeLibidoAlignment(entries, elleId, luiId);
  if (score === null) {
    wrap.innerHTML = '<div class="msg info">Pas encore assez de données libido pour les deux partenaires.</div>';
    return;
  }

  const trendIcon = trend === 'improving' ? '↑' : trend === 'declining' ? '↓' : '→';
  const trendColor = trend === 'improving' ? 'var(--elle)' : trend === 'declining' ? 'var(--red)' : 'var(--faint)';

  // Mini sparkline des 14 derniers jours
  const recent = byDay.slice(-14);
  const W = 240, H = 40;
  const maxDiff = 4;
  const pts = recent.map((d, i) => {
    const x = (i / Math.max(recent.length - 1, 1)) * W;
    const diff = Math.abs((d.elle ?? 0) - (d.lui ?? 0));
    const y = H - (diff / maxDiff) * H;
    return `${x},${y}`;
  }).join(' ');

  wrap.innerHTML = `
    <div class="align-score-row">
      <div class="align-circle" style="--score:${score}">
        <span class="align-num">${score}</span>
        <span class="align-unit">/100</span>
      </div>
      <div class="align-meta">
        <div class="align-label">${label}</div>
        <div class="align-trend" style="color:${trendColor}">${trendIcon} ${trend === 'improving' ? 'En amélioration' : trend === 'declining' ? 'En baisse' : 'Stable'}</div>
      </div>
    </div>
    ${recent.length > 2 ? `
    <div class="align-sparkline-wrap">
      <div class="align-sparkline-label">Écart libido (14j) — bas = aligné</div>
      <svg viewBox="0 0 ${W} ${H}" class="align-sparkline" aria-hidden="true">
        <polyline points="${pts}" fill="none" stroke="var(--elle)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>` : ''}`;
}
