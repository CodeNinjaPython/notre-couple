/**
 * kinks.js — Système de découverte à double-révélation + wish-list + limites.
 *
 * PRINCIPE DOUBLE-RÉVÉLATION (modèle Kindu) :
 * - Tu notes chaque désir (0-5) sur ton propre écran, en privé.
 * - Quand tu notes > 0, ton partenaire sait seulement que tu t'y intéresses (pas le niveau).
 * - Un "match" n'apparaît QUE quand les DEUX ont exprimé un intérêt (shared=true).
 * - Personne ne découvre l'intérêt de l'autre en avançant seul.
 */
import { supabase } from './supabase.js';
import { getIntimacyState, initKinkSliderGradients } from './intimacy.js';

const CATEGORIES = {
  atmosphere:    '✨ Atmosphère',
  pratiques:     '💑 Pratiques',
  lieux:         '🗺️ Lieux',
  communication: '💬 Communication',
  jeux:          '🎲 Jeux',
};

// ---------------------------------------------------------------------------
// Init écran Désirs
// ---------------------------------------------------------------------------
export async function initKinks() {
  const st = getIntimacyState();
  await Promise.all([
    renderKinkList(st),
    renderMatches(st),
    renderWishlist(st),
    renderMyLimits(st),
    renderCheckIn(st),
    renderLibidoParPhase(st),
  ]);
  initAddLimit(st);
  initAddWish(st);
}

// ---------------------------------------------------------------------------
// Liste des kinks avec slider de désir (vue privée)
// ---------------------------------------------------------------------------
async function renderKinkList(st) {
  const wrap = document.getElementById('kink-list');
  if (!wrap) return;

  const [kinksRes, ratingsRes] = await Promise.all([
    supabase.from('kinks').select('*').order('category').order('id'),
    supabase.from('kink_ratings').select('*').eq('user_id', st.me?.user_id),
  ]);

  const kinks   = kinksRes.data  || [];
  const ratings = ratingsRes.data || [];
  const ratingMap = Object.fromEntries(ratings.map(r => [r.kink_id, r]));

  // Grouper par catégorie
  const byCat = {};
  kinks.forEach(k => {
    if (!byCat[k.category]) byCat[k.category] = [];
    byCat[k.category].push(k);
  });

  wrap.innerHTML = Object.entries(byCat).map(([cat, items]) => `
    <div class="kink-category">
      <div class="kink-cat-label">${CATEGORIES[cat] || cat}</div>
      ${items.map(k => {
        const r = ratingMap[k.id];
        const val = r?.desire ?? 0;
        return `<div class="kink-row" data-kink="${k.id}">
          <span class="kink-label">${k.label}</span>
          <div class="kink-slider-wrap">
            <input type="range" class="kink-slider" min="0" max="5" value="${val}"
              data-kink="${k.id}" aria-label="${k.label} — désir 0 à 5">
            <span class="kink-val">${val > 0 ? val : '—'}</span>
          </div>
        </div>`;
      }).join('')}
    </div>`
  ).join('');

  // Événements slider (debounce 600ms)
  const timers = {};
  wrap.querySelectorAll('.kink-slider').forEach(slider => {
    slider.addEventListener('input', () => {
      const kinkId = slider.dataset.kink;
      const val    = parseInt(slider.value);
      slider.nextElementSibling.textContent = val > 0 ? val : '—';
      clearTimeout(timers[kinkId]);
      timers[kinkId] = setTimeout(() => saveKinkRating(kinkId, val), 600);
    });
  });

  // Gradients dès le rendu
  initKinkSliderGradients();
}

async function saveKinkRating(kinkId, desire) {
  await supabase.from('kink_ratings').upsert({
    kink_id: kinkId,
    desire,
    shared: desire > 0,  // intérêt visible du partenaire dès que > 0
  }, { onConflict: 'user_id,kink_id' });
}

// ---------------------------------------------------------------------------
// Matchs : révèle SEULEMENT les kinks où les deux ont shared=true
// ---------------------------------------------------------------------------
async function renderMatches(st) {
  const wrap = document.getElementById('kink-matches');
  if (!wrap || !st.partner) {
    if (wrap) wrap.innerHTML = '<p class="intime-empty">En attente de votre partenaire.</p>';
    return;
  }

  const [mineRes, theirsRes, kinksRes] = await Promise.all([
    supabase.from('kink_ratings').select('kink_id, desire').eq('user_id', st.me?.user_id).eq('shared', true),
    supabase.from('kink_ratings').select('kink_id, desire').eq('shared', true),
    supabase.from('kinks').select('id, label'),
  ]);

  const mine   = mineRes.data  || [];
  const theirs = theirsRes.data || [];
  const kinks  = Object.fromEntries((kinksRes.data || []).map(k => [k.id, k.label]));

  const myIds    = new Set(mine.map(r => r.kink_id));
  const theirIds = new Set(theirs.filter(r => r.kink_id).map(r => r.kink_id));

  // Exclure mes propres entrées de "theirs"
  const matchIds = [...myIds].filter(id => theirIds.has(id));

  const total = Object.keys(kinks).length;

  document.getElementById('match-counter')
    && (document.getElementById('match-counter').textContent =
        `Nos désirs en commun : ${matchIds.length} / ${total}`);

  if (!matchIds.length) {
    wrap.innerHTML = '<p class="intime-empty">Pas encore de match — continue d\'explorer.</p>';
    return;
  }

  const myMap    = Object.fromEntries(mine.map(r => [r.kink_id, r.desire]));
  const theirMap = Object.fromEntries(
    theirs.filter(r => r.kink_id !== null).map(r => [r.kink_id, r.desire])
  );

  wrap.innerHTML = matchIds.map(id => {
    const myVal    = myMap[id]    ?? 0;
    const theirVal = theirMap[id] ?? 0;
    return `<div class="match-chip">
      <span class="match-label">${kinks[id] || id}</span>
      <span class="match-scores">${'★'.repeat(myVal)}${'☆'.repeat(5 - myVal)} / ${'★'.repeat(theirVal)}${'☆'.repeat(5 - theirVal)}</span>
    </div>`;
  }).join('');
}

// ---------------------------------------------------------------------------
// Wish-list / fantasmes
// ---------------------------------------------------------------------------
const STATUS_LABELS = { proposed:'💡 Proposé', validated:'✅ Validé', tried:'🎉 Testé', repeat:'🔁 À refaire' };

async function renderWishlist(st) {
  const wrap = document.getElementById('wishlist');
  if (!wrap) return;

  const { data } = await supabase.from('fantasies')
    .select('*').eq('couple_id', st.coupleId).order('created_at', { ascending: false });

  if (!data?.length) {
    wrap.innerHTML = '<p class="intime-empty">Votre wish-list est vide.</p>';
    return;
  }

  wrap.innerHTML = data.map(f => {
    const isMe = f.created_by === st.me?.user_id;
    return `<div class="wish-item">
      <div class="wish-status">${STATUS_LABELS[f.status] || f.status}</div>
      <div class="wish-content">${f.content}</div>
      <div class="wish-footer">
        <span class="wish-by">${isMe ? 'Moi' : (st.partner?.display_name || 'Partenaire')}</span>
        ${isMe ? `<select class="wish-select" data-id="${f.id}">
          ${Object.entries(STATUS_LABELS).map(([k, v]) =>
            `<option value="${k}"${f.status === k ? ' selected' : ''}>${v}</option>`
          ).join('')}
        </select>` : ''}
      </div>
    </div>`;
  }).join('');

  wrap.querySelectorAll('.wish-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      await supabase.from('fantasies').update({ status: sel.value }).eq('id', sel.dataset.id);
    });
  });
}

function initAddWish(st) {
  document.getElementById('btn-add-wish')?.addEventListener('click', async () => {
    const content = prompt('Votre fantasme ou idée :');
    if (!content) return;
    await supabase.from('fantasies').insert({
      couple_id: st.coupleId,
      created_by: st.me?.user_id,
      content,
      shared: true,
    });
    await renderWishlist(st);
  });
}

// ---------------------------------------------------------------------------
// Check-in — rappel avant d'essayer une pratique nouvellement validée
// ---------------------------------------------------------------------------
async function renderCheckIn(st) {
  const el = document.getElementById('checkin-validated');
  if (!el) return;

  const { data } = await supabase.from('fantasies')
    .select('*').eq('couple_id', st.coupleId).eq('status', 'validated');

  if (!data?.length) { el.style.display = 'none'; return; }

  el.style.display = 'block';
  el.innerHTML = `<div class="checkin-card">
    <div class="checkin-title">✅ ${data.length} idée${data.length > 1 ? 's' : ''} validée${data.length > 1 ? 's' : ''}</div>
    ${data.map(f => `<div class="checkin-item">
      <span class="checkin-label">${f.content}</span>
      <span class="checkin-prompt">On est ok tous les deux ?</span>
    </div>`).join('')}
    <p class="checkin-note">Confirmez ensemble avant de passer à « testé ».</p>
  </div>`;
}

// ---------------------------------------------------------------------------
// Alignement désir ↔ phase du cycle (libido de elle par phase)
// ---------------------------------------------------------------------------
const PHASE_RANGES_K = [[1,5],[6,13],[14,16],[17,35]];
const PHASE_NAMES_K  = ['Menstruelle','Folliculaire','Ovulation','Lutéale'];
const PHASE_COLORS_K = { Menstruelle:'#E53935', Folliculaire:'#4278C4', Ovulation:'#7C5CFC', Lutéale:'#E84375' };

async function renderLibidoParPhase(st) {
  const el = document.getElementById('libido-par-phase');
  if (!el) return;

  // Libido de elle (qui tracks_cycle)
  const elleId = st.me?.tracks_cycle ? st.me.user_id : st.partner?.user_id;
  if (!elleId) { el.innerHTML = '<p class="intime-empty">—</p>'; return; }

  const [libidoRes, cyclesRes] = await Promise.all([
    supabase.from('log_entries').select('log_date, value')
      .eq('user_id', elleId).eq('category_id', 'libido')
      .order('log_date', { ascending: false }).limit(90),
    supabase.from('cycles').select('period_start')
      .order('period_start', { ascending: false }).limit(4),
  ]);

  const libidos = libidoRes.data || [];
  const cycles  = cyclesRes.data || [];
  if (!libidos.length || !cycles.length) {
    el.innerHTML = '<p class="intime-empty">Plus de données de libido pour voir les tendances par phase.</p>';
    return;
  }

  const { diffDays: diff } = await import('./date-utils.js');
  const byPhase = { Menstruelle:[], Folliculaire:[], Ovulation:[], Lutéale:[] };

  libidos.forEach(l => {
    const cycle = cycles.find(c => c.period_start <= l.log_date);
    if (!cycle) return;
    const day   = diff(l.log_date, cycle.period_start) + 1;
    const idx   = PHASE_RANGES_K.findIndex(([a, b]) => day >= a && day <= b);
    const phase = PHASE_NAMES_K[idx >= 0 ? idx : 3];
    const v     = Number(l.value?.v ?? l.value);
    if (!isNaN(v)) byPhase[phase].push(v);
  });

  const max = Math.max(...PHASE_NAMES_K.map(p => byPhase[p].length ? byPhase[p].reduce((a,b)=>a+b,0)/byPhase[p].length : 0), 1);

  el.innerHTML = PHASE_NAMES_K.map(phase => {
    const arr = byPhase[phase];
    if (!arr.length) return '';
    const avg = arr.reduce((a,b)=>a+b,0)/arr.length;
    const pct = (avg / max * 100).toFixed(0);
    return `<div class="phase-sat-row">
      <span class="phase-sat-label">${phase}</span>
      <div class="phase-sat-bar-wrap"><div class="phase-sat-bar" style="width:${pct}%;background:${PHASE_COLORS_K[phase]}"></div></div>
      <span class="phase-sat-val">${avg.toFixed(1)}/5</span>
    </div>`;
  }).filter(Boolean).join('') || '<p class="intime-empty">—</p>';
}

// ---------------------------------------------------------------------------
// Mes limites (ok / soft / hard)
// ---------------------------------------------------------------------------
const LEVEL_STYLES = { ok:'#10B981', soft:'#F59E0B', hard:'#EF4444' };
const LEVEL_LABELS = { ok:'OK', soft:'Soft', hard:'Hard limit' };

async function renderMyLimits(st) {
  const wrap = document.getElementById('my-limits');
  if (!wrap) return;

  const { data } = await supabase.from('consent_limits')
    .select('*').eq('user_id', st.me?.user_id).order('level');

  if (!data?.length) {
    wrap.innerHTML = '<p class="intime-empty">Aucune limite enregistrée.</p>';
    return;
  }

  wrap.innerHTML = data.map(l => `
    <div class="limit-item">
      <span class="limit-badge" style="background:${LEVEL_STYLES[l.level]}20;color:${LEVEL_STYLES[l.level]};border-color:${LEVEL_STYLES[l.level]}40">
        ${LEVEL_LABELS[l.level]}
      </span>
      <span class="limit-text">${l.practice}</span>
      ${l.note ? `<span class="limit-note-text">${l.note}</span>` : ''}
      <button type="button" class="limit-delete btn-icon" data-id="${l.id}" aria-label="Supprimer">×</button>
    </div>`).join('');

  wrap.querySelectorAll('.limit-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      await supabase.from('consent_limits').delete().eq('id', btn.dataset.id);
      await renderMyLimits(st);
    });
  });
}

function initAddLimit(st) {
  document.getElementById('btn-add-limit')?.addEventListener('click', async () => {
    const practice = prompt('Pratique ou situation :');
    if (!practice) return;
    const levelNum = prompt('Niveau :\n1. OK — j\'aime / OK\n2. Soft limit — à négocier\n3. Hard limit — jamais');
    const level = levelNum === '1' ? 'ok' : levelNum === '2' ? 'soft' : 'hard';
    const note = prompt('Note (optionnel) :') || null;

    await supabase.from('consent_limits').upsert(
      { user_id: st.me?.user_id, practice, level, note },
      { onConflict: 'user_id,practice' }
    );
    await renderMyLimits(st);
  });
}
