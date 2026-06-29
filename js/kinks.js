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
import { getIntimacyState, initKinkSliderGradients, escapeHtml } from './intimacy.js';
import { toast, confirmDialog, formDialog, friendlyError } from './ui-feedback.js';
import { diffDays } from './date-utils.js';

const CATEGORIES = {
  atmosphere:    '✨ Atmosphère',
  pratiques:     '💑 Pratiques',
  lieux:         '🗺️ Lieux',
  communication: '💬 Communication',
  jeux:          '🎲 Jeux',
};

let localKinkRatings = {};

// ---------------------------------------------------------------------------
// Init écran Désirs
// ---------------------------------------------------------------------------
export async function initKinks() {
  const st = getIntimacyState();
  await Promise.all([
    renderKinkList(st),
    renderMatches(st),
    renderWishlist(st),
    renderMyLimits(st)
  ]);
  initAddLimit(st);
  initWishlistSection(st);
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
  
  // Remplir localKinkRatings
  localKinkRatings = Object.fromEntries(ratings.map(r => [r.kink_id, r]));

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
        const r = localKinkRatings[k.id];
        const val = r?.desire ?? 0;
        return `<div class="kink-row" data-kink="${k.id}" style="display: flex; flex-direction: column; align-items: stretch; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <span class="kink-label">${k.label}</span>
            <div class="kink-slider-wrap">
              <input type="range" class="kink-slider" min="0" max="5" value="${val}"
                data-kink="${k.id}" aria-label="${k.label} — désir 0 à 5">
              <span class="kink-val">${val > 0 ? val : '—'}</span>
            </div>
          </div>
          <div class="kink-note-container" style="width: 100%; display: ${val > 0 ? 'block' : 'none'};">
            <input type="text" class="kink-note-input" data-kink="${k.id}" placeholder="Note privée (ex: scénarios, limites, idées...)" value="${escapeHtml(r?.note || '')}" style="width: 100%; padding: 6px 10px; font-size: 12px; border: 1px solid var(--line); border-radius: 6px; background: var(--bg); color: var(--text);">
          </div>
        </div>`;
      }).join('')}
    </div>`
  ).join('');

  // Événements slider et note
  const timers = {};
  
  // Événements slider (debounce 600ms)
  wrap.querySelectorAll('.kink-slider').forEach(slider => {
    slider.addEventListener('input', () => {
      const kinkId = slider.dataset.kink;
      const val    = parseInt(slider.value);
      slider.nextElementSibling.textContent = val > 0 ? val : '—';
      
      const noteContainer = slider.closest('.kink-row').querySelector('.kink-note-container');
      if (noteContainer) {
        noteContainer.style.display = val > 0 ? 'block' : 'none';
      }
      
      const r = localKinkRatings[kinkId] || (localKinkRatings[kinkId] = { desire: 0, shared: false });
      r.desire = val;
      r.shared = val > 0;
      if (val === 0) {
        r.note = null;
        const noteInput = slider.closest('.kink-row').querySelector('.kink-note-input');
        if (noteInput) noteInput.value = '';
      }
      
      clearTimeout(timers[kinkId]);
      timers[kinkId] = setTimeout(() => saveKinkRating(kinkId, r), 600);
    });
  });

  // Événements note (debounce 800ms)
  wrap.querySelectorAll('.kink-note-input').forEach(input => {
    input.addEventListener('input', () => {
      const kinkId = input.dataset.kink;
      const noteVal = input.value.trim();
      
      const r = localKinkRatings[kinkId] || (localKinkRatings[kinkId] = { desire: 0, shared: false });
      r.note = noteVal || null;
      
      clearTimeout(timers[kinkId + '-note']);
      timers[kinkId + '-note'] = setTimeout(() => saveKinkRating(kinkId, r), 800);
    });
  });

  // Gradients dès le rendu
  initKinkSliderGradients();
}

async function saveKinkRating(kinkId, r) {
  const { error } = await supabase.from('kink_ratings').upsert({
    kink_id: kinkId,
    desire: r.desire,
    shared: r.shared,
    note: r.note || null,
  }, { onConflict: 'user_id,kink_id' });
  if (error) console.error('saveKinkRating:', error.message);
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
    return `<div class="wish-item" data-id="${f.id}" data-content="${escapeHtml(f.content)}">
      <div class="wish-status">${STATUS_LABELS[f.status] || f.status}</div>
      <div class="wish-content">${escapeHtml(f.content)}</div>
      <div class="wish-footer">
        <span class="wish-by">${isMe ? 'Moi' : (st.partner?.display_name || 'Partenaire')}</span>
        <div class="wish-actions">
          ${isMe ? `<select class="wish-select" data-id="${f.id}">
            ${Object.entries(STATUS_LABELS).map(([k, v]) =>
              `<option value="${k}"${f.status === k ? ' selected' : ''}>${v}</option>`
            ).join('')}
          </select>` : ''}
          ${isMe ? `<button type="button" class="btn-icon btn-edit-wish" aria-label="Modifier">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button type="button" class="btn-icon btn-delete-wish" aria-label="Supprimer">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

function initWishlistSection(st) {
  const listEl = document.getElementById('wishlist');
  if (!listEl) return;

  // Délégation d'événements pour le statut, l'édition et la suppression
  listEl.addEventListener('click', async (e) => {
    const item = e.target.closest('.wish-item');
    if (!item) return;
    const wishId = item.dataset.id;

    // Gérer la suppression
    if (e.target.closest('.btn-delete-wish')) {
      const ok = await confirmDialog({ title: 'Supprimer ce souhait ?', message: 'Cette idée sera effacée de votre liste.', confirmLabel: 'Supprimer', danger: true });
      if (!ok) return;
      try { await supabase.from('fantasies').delete().eq('id', wishId); toast('Souhait supprimé.'); await renderWishlist(st); }
      catch (err) { toast(friendlyError(err), 'error'); }
    }

    // Gérer l'édition
    if (e.target.closest('.btn-edit-wish')) {
      const res = await formDialog({
        title: 'Modifier un souhait',
        fields: [{ name: 'content', label: 'Votre fantasme ou idée', type: 'textarea', value: item.dataset.content, required: true }],
      });
      if (!res) return;
      try {
        await supabase.from('fantasies').update({ content: res.content }).eq('id', wishId);
        toast('Souhait mis à jour.');
        await renderWishlist(st);
      } catch (err) { toast(friendlyError(err), 'error'); }
    }
  });

  // Listener pour le changement de statut (délégation aussi)
  listEl.addEventListener('change', async (e) => {
    if (e.target.classList.contains('wish-select')) {
      await supabase.from('fantasies').update({ status: e.target.value }).eq('id', e.target.dataset.id);
    }
  });

  // Bouton d'ajout
  document.getElementById('btn-add-wish')?.addEventListener('click', async () => {
    const res = await formDialog({
      title: 'Ajouter à la wish-list',
      fields: [{ name: 'content', label: 'Votre fantasme ou idée', type: 'textarea', required: true }],
    });
    if (!res) return;
    try {
      await supabase.from('fantasies').insert({
        couple_id: st.coupleId,
        created_by: st.me?.user_id,
        content: res.content,
        shared: true,
      });
      await renderWishlist(st); // Re-render to show the new item
    } catch (e) { toast(friendlyError(e), 'error'); }
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

export function renderLibidoParPhase(elleId, { entries, cycles }) {
  const el = document.getElementById('libido-par-phase');
  if (!el) return;

  if (!elleId) { el.innerHTML = '<p class="intime-empty">—</p>'; return; }

  const libidos = entries.filter(e => e.value?.libidoScale != null);

  if (!libidos.length || !cycles.length) {
    el.innerHTML = '<p class="intime-empty">Plus de données de libido pour voir les tendances par phase.</p>';
    return;
  }

  const diff = diffDays;
  const byPhase = { Menstruelle:[], Folliculaire:[], Ovulation:[], Lutéale:[] };

  libidos.forEach(l => {
    const cycle = cycles.find(c => c.period_start <= l.log_date);
    if (!cycle) return;
    const day   = diff(l.log_date, cycle.period_start) + 1;
    const idx   = PHASE_RANGES_K.findIndex(([a, b]) => day >= a && day <= b);
    const phase = PHASE_NAMES_K[idx >= 0 ? idx : 3]; // Fallback to Luteal
    const v     = Number(l.value?.libidoScale);
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
    const res = await formDialog({
      title: 'Ajouter une limite',
      fields: [
        { name: 'practice', label: 'Pratique ou situation', required: true },
        { name: 'level', label: 'Niveau', type: 'select', options: [
          { value: 'ok', label: "OK — j'aime / OK" },
          { value: 'soft', label: 'Soft limit — à négocier' },
          { value: 'hard', label: 'Hard limit — jamais' },
        ] },
        { name: 'note', label: 'Note (optionnel)', type: 'textarea' },
      ],
    });
    if (!res) return;
    try {
      await supabase.from('consent_limits').upsert(
        { user_id: st.me?.user_id, practice: res.practice, level: res.level, note: res.note || null },
        { onConflict: 'user_id,practice' }
      );
      await renderMyLimits(st);
    } catch (e) { toast(friendlyError(e), 'error'); }
  });
}
