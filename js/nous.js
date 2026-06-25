import { supabase } from './supabase.js';
import { signOut } from './auth.js';
import { navigate } from './router.js';
import { getMyMembership, getPartnerMembership } from './pairing.js';

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

// ---------------------------------------------------------------------------
// Statistiques (Pearson)
// ---------------------------------------------------------------------------
function pearson(xs, ys) {
  const n = xs.length;
  if (n < 5) return null;
  const mx = xs.reduce((a,b) => a+b, 0) / n;
  const my = ys.reduce((a,b) => a+b, 0) / n;
  let num=0, dx=0, dy=0;
  for (let i=0; i<n; i++) {
    num += (xs[i]-mx)*(ys[i]-my);
    dx  += (xs[i]-mx)**2;
    dy  += (ys[i]-my)**2;
  }
  const den = Math.sqrt(dx*dy);
  return den===0 ? null : num/den;
}

// Construit { date: valeur_numérique } pour un user + une catégorie
function buildMap(entries, userId, catId) {
  const m = {};
  entries
    .filter(e => e.user_id === userId && e.category_id === catId)
    .forEach(e => {
      const raw = e.value?.v ?? e.value;
      if (raw != null) m[e.log_date] = Number(raw);
    });
  return m;
}

// Aligne deux maps date→valeur, retourne les paires (xs, ys, dates communes)
function align(ma, mb) {
  const dates = Object.keys(ma).filter(d => mb[d] != null).sort();
  return {
    xs: dates.map(d => ma[d]),
    ys: dates.map(d => mb[d]),
    n: dates.length,
  };
}

// ---------------------------------------------------------------------------
// Chargement des données
// ---------------------------------------------------------------------------
async function loadEntries(days = 90) {
  const since = new Date(Date.now() - days * 864e5).toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('log_entries')
    .select('user_id, log_date, category_id, value')
    .gte('log_date', since)
    .order('log_date');
  if (error) console.error('loadEntries:', error.message);
  return data || [];
}

async function loadRecentEvents(coupleId, days = 30) {
  const since = new Date(Date.now() - days * 864e5).toISOString().split('T')[0];
  const { data } = await supabase
    .from('couple_events')
    .select('event_date, event_type')
    .eq('couple_id', coupleId)
    .gte('event_date', since);
  return data || [];
}

// ---------------------------------------------------------------------------
// Semaine courante (Lun–Dim)
// ---------------------------------------------------------------------------
function weekBounds() {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7; // 0=Lun
  const mon = new Date(now.getTime() - dow * 864e5);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon.getTime() + i * 864e5);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

// ---------------------------------------------------------------------------
// Initialisation principale
// ---------------------------------------------------------------------------
export async function initNous() {
  const me = await getMyMembership();
  if (!me) { navigate('auth'); return; }
  const partner = await getPartnerMembership(me.couple_id);

  document.getElementById('today-date').textContent =
    new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  // Charger données en parallèle
  const [entries, events] = await Promise.all([
    loadEntries(90),
    partner ? loadRecentEvents(me.couple_id, 30) : Promise.resolve([]),
  ]);

  // Identifier elle/lui
  const elleId = me.tracks_cycle ? me.user_id : partner?.user_id;
  const luiId  = me.tracks_cycle ? partner?.user_id : me.user_id;

  renderWeekStats(entries, events, elleId, luiId, me, partner);
  renderTrends(entries, elleId, luiId);
  renderCorrelations(entries, elleId, luiId, partner);
  renderSettings(me);
}

// ---------------------------------------------------------------------------
// Carte : stats de la semaine
// ---------------------------------------------------------------------------
function renderWeekStats(entries, events, elleId, luiId, me, partner) {
  const wrap = document.getElementById('nous-week');
  if (!wrap) return;

  const week = new Set(weekBounds());
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

  const since7 = new Date(Date.now() - 7 * 864e5).toISOString().split('T')[0];
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
// Réglages
// ---------------------------------------------------------------------------
function renderSettings(me) {
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
  document.getElementById('btn-unlink')?.addEventListener('click', () => unlinkAccount(me));

  // Bouton install PWA (visible seulement si l'événement beforeinstallprompt a été capturé)
  const installBtn = document.getElementById('btn-install');
  if (installBtn && window.__installPrompt) {
    installBtn.style.display = 'block';
    installBtn.addEventListener('click', async () => {
      window.__installPrompt.prompt();
      const { outcome } = await window.__installPrompt.userChoice;
      if (outcome === 'accepted') installBtn.style.display = 'none';
    }, { once: true });
  }
}

// ---------------------------------------------------------------------------
// Export JSON + CSV (§10)
// ---------------------------------------------------------------------------
async function exportData(format = 'json') {
  const today = new Date().toISOString().split('T')[0];
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
