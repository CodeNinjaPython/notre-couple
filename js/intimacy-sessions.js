/**
 * intimacy-sessions.js — Cycle de vie des sessions intimes.
 * Formulaire complet + mode fast-track (4-5 taps).
 * Toutes les requêtes Supabase dans des try/catch avec messages UI.
 */
import { supabase } from './supabase.js';
import { localDateStr, fmtDate, diffDays } from './date-utils.js';
import { POSITIONS } from './intimacy-library.js';

const MOODS = { tender:'🥰', playful:'😄', passionate:'🔥', spontaneous:'⚡' };
const MOOD_LABELS = { tender:'Tendre', playful:'Joueur·se', passionate:'Passionné·e', spontaneous:'Spontané·e' };
const LOCATIONS   = { maison:'🏠 Maison', voyage:'✈️ Voyage', hotel:'🏨 Hôtel', autre:'📍 Autre' };

// ─── Erreur UI ─────────────────────────────────────────────────────────────

function showError(id, msg) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    el.className = 'msg error';
    document.getElementById('session-sheet')?.querySelector('.sheet')?.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => { if (el) el.style.display = 'none'; }, 5000);
}

// ─── Rendu sessions récentes ───────────────────────────────────────────────

export async function renderRecentSessions(st) {
  const wrap = document.getElementById('recent-sessions');
  if (!wrap) return;

  wrap.innerHTML = '<div class="skeleton skeleton-card" style="height:80px"></div>';

  try {
    const { data, error } = await supabase
      .from('intimate_sessions')
      .select('*, session_feedback(satisfaction, orgasms, shared, user_id, loved_txt)')
      .eq('couple_id', st.coupleId)
      .order('session_date', { ascending: false })
      .limit(5);

    if (error) throw error;

    if (!data?.length) {
      wrap.innerHTML = '<div class="intime-empty">Aucun moment enregistré.<br>Appuyez sur le bouton ❤️ pour noter votre premier.</div>';
      return;
    }

    wrap.innerHTML = data.map(s => {
      const diff     = diffDays(localDateStr(), s.session_date);
      const when     = diff === 0 ? "Aujourd'hui" : diff === 1 ? 'Hier' : `Il y a ${diff} j`;
      const myFb     = s.session_feedback?.find(f => f.user_id === st.me?.user_id);
      const partnerFb = s.session_feedback?.find(f => f.user_id !== st.me?.user_id && f.shared);
      const sat      = myFb?.satisfaction ? `${myFb.satisfaction}/10` : '—';
      const partnerSat = partnerFb?.satisfaction ? ` · ${partnerFb.satisfaction}/10` : '';
      const tags     = (s.activity_tags || []).map(t => `<span class="session-tag">${t}</span>`).join('');

      return `<div class="session-card" data-id="${s.id}">
        <div class="session-meta">
          <span class="session-mood" aria-label="${MOOD_LABELS[s.mood] || 'Moment'}">${MOODS[s.mood] || '💑'}</span>
          <div class="session-meta-text">
            <div class="session-date">${when} · ${fmtDate(s.session_date, { day:'numeric', month:'short' })}</div>
            <div class="session-details">
              ${s.duration_min ? `${s.duration_min} min` : ''}
              ${s.location ? ` · ${LOCATIONS[s.location] || s.location}` : ''}
            </div>
            ${tags ? `<div class="session-tags">${tags}</div>` : ''}
          </div>
          <div class="session-sat" aria-label="Satisfaction ${sat}">${sat}${partnerSat}</div>
        </div>
        ${s.note ? `<div class="session-note">${s.note}</div>` : ''}
        ${myFb?.loved_txt ? `<div class="session-loved">❤️ ${myFb.loved_txt}</div>` : ''}
      </div>`;
    }).join('');

    // Équilibre d'initiation (neutre)
    const initiators = data.map(s => s.created_by);
    const myCount    = initiators.filter(id => id === st.me?.user_id).length;
    const theirCount = initiators.length - myCount;
    if (initiators.length >= 3) {
      const balance = document.getElementById('initiation-balance');
      if (balance) {
        const myName    = st.me?.display_name || 'Moi';
        const theirName = st.partner?.display_name || 'Partenaire';
        balance.textContent = `Initiative : ${myName} ${myCount}× · ${theirName} ${theirCount}×`;
        balance.style.display = 'block';
      }
    }

    // Délai neutre
    const lastDate = data[0]?.session_date;
    if (lastDate) {
      const daysSince = diffDays(localDateStr(), lastDate);
      const sinceEl   = document.getElementById('days-since');
      if (sinceEl && daysSince > 0) {
        sinceEl.textContent = `Dernier moment : il y a ${daysSince} jour${daysSince > 1 ? 's' : ''}`;
        sinceEl.style.display = 'inline-block';
      }
    }

  } catch (e) {
    wrap.innerHTML = '<div class="msg error">Impossible de charger vos moments. Vérifiez votre connexion.</div>';
    console.error('renderRecentSessions:', e.message);
  }
}

// ─── Formulaire complet ────────────────────────────────────────────────────

export function openFullSessionSheet(st) {
  const sheet = document.getElementById('session-sheet');
  if (!sheet) return;

  // Réinitialiser
  const dateEl = document.getElementById('session-date-input');
  if (dateEl) { dateEl.value = localDateStr(); dateEl.max = localDateStr(); }

  document.querySelectorAll('.mood-btn, .loc-btn, .act-tag-btn').forEach(b => b.classList.remove('sel'));

  ['session-duration', 'session-note-input'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  // Remplir le sélecteur de positions
  renderPositionPicker();

  sheet.classList.add('open');
  sheet.removeAttribute('aria-hidden');

  // Écouter save/cancel/fast-track
  document.getElementById('btn-session-save')?.addEventListener('click', () => saveFullSession(st), { once: true });
  document.getElementById('btn-session-cancel')?.addEventListener('click', closeSessionSheet, { once: true });
  document.getElementById('btn-fast-track')?.addEventListener('click', () => openFastTrack(st), { once: true });
}

export function closeSessionSheet() {
  const sheet = document.getElementById('session-sheet');
  if (sheet) { sheet.classList.remove('open'); sheet.setAttribute('aria-hidden', 'true'); }
}

function renderPositionPicker() {
  const grid = document.getElementById('position-picker-grid');
  if (!grid) return;
  grid.innerHTML = POSITIONS.slice(0, 12).map(p =>
    `<button type="button" class="pos-pick-btn" data-id="${p.id}"
      aria-label="${p.label}" title="${p.label}">
      <div class="pos-pick-svg">${p.svg}</div>
      <span class="pos-pick-label">${p.label}</span>
    </button>`
  ).join('');

  grid.querySelectorAll('.pos-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => btn.classList.toggle('sel'));
  });
}

async function saveFullSession(st) {
  const date         = document.getElementById('session-date-input')?.value || localDateStr();
  const mood         = document.querySelector('.mood-btn.sel')?.dataset.mood || null;
  const location     = document.querySelector('.loc-btn.sel')?.dataset.loc  || null;
  const dur          = parseInt(document.getElementById('session-duration')?.value) || null;
  const note         = document.getElementById('session-note-input')?.value?.trim() || null;
  const actTags      = [...document.querySelectorAll('.act-tag-btn.sel')].map(b => b.dataset.tag);
  const positionIds  = [...document.querySelectorAll('.pos-pick-btn.sel')].map(b => b.dataset.id);

  const btn = document.getElementById('btn-session-save');
  if (btn) { btn.disabled = true; btn.textContent = 'Enregistrement…'; }

  try {
    const { data: session, error } = await supabase.from('intimate_sessions').insert({
      couple_id:    st.coupleId,
      created_by:   st.me?.user_id,
      session_date: date,
      mood, location,
      duration_min:  dur,
      note,
      activity_tags: actTags,
    }).select().single();

    if (error) throw error;

    // Sauvegarder les positions si sélectionnées
    if (positionIds.length && session?.id) {
      await supabase.from('session_activities').insert({
        session_id: session.id,
        tags: positionIds,
      });
    }

    closeSessionSheet();
    await renderRecentSessions(st);

    // Ouvrir le feedback post-séance
    if (session?.id) {
      setTimeout(() => openFeedbackSheet(session.id, st), 350);
    }

  } catch (e) {
    showError('session-error', 'Impossible d\'enregistrer. Vérifiez votre connexion et réessayez.');
    console.error('saveFullSession:', e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Enregistrer → Feedback rapide'; }
  }
}

// ─── Fast-Track (4-5 taps) ─────────────────────────────────────────────────

export function openFastTrack(st) {
  closeSessionSheet();
  const sheet = document.getElementById('fast-track-sheet');
  if (!sheet) return;

  // Reset
  document.querySelectorAll('.ft-mood-btn').forEach(b => b.classList.remove('sel'));
  const orgEl = document.getElementById('ft-orgasm');
  if (orgEl) orgEl.checked = false;

  sheet.classList.add('open');
  sheet.removeAttribute('aria-hidden');

  document.querySelectorAll('.ft-mood-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ft-mood-btn').forEach(x => x.classList.remove('sel'));
      btn.classList.add('sel');
    })
  );

  document.getElementById('btn-ft-save')?.addEventListener('click', () => saveFastTrack(st), { once: true });
  document.getElementById('btn-ft-cancel')?.addEventListener('click', closeFastTrack, { once: true });
}

function closeFastTrack() {
  const sheet = document.getElementById('fast-track-sheet');
  if (sheet) { sheet.classList.remove('open'); sheet.setAttribute('aria-hidden', 'true'); }
}

async function saveFastTrack(st) {
  const mood    = document.querySelector('.ft-mood-btn.sel')?.dataset.mood || null;
  const sat     = parseInt(document.querySelector('.ft-sat-btn.sel')?.dataset.sat) || null;
  const orgasms = document.getElementById('ft-orgasm')?.checked ? 1 : 0;

  const btn = document.getElementById('btn-ft-save');
  if (btn) { btn.disabled = true; btn.textContent = 'Tap…'; }

  try {
    const { data: session, error } = await supabase.from('intimate_sessions').insert({
      couple_id:    st.coupleId,
      created_by:   st.me?.user_id,
      session_date: localDateStr(),
      mood,
    }).select().single();

    if (error) throw error;

    if ((sat || orgasms) && session?.id) {
      await supabase.from('session_feedback').insert({
        session_id:   session.id,
        user_id:      st.me?.user_id,
        satisfaction: sat,
        orgasms,
        shared:       false,
      });
    }

    closeFastTrack();
    await renderRecentSessions(st);

  } catch (e) {
    showError('ft-error', 'Connexion perdue. Réessayez dans un moment.');
    console.error('saveFastTrack:', e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Valider'; }
  }
}

// ─── Feedback post-séance ──────────────────────────────────────────────────

let _pendingFeedbackId = null;

export function openFeedbackSheet(sessionId, st) {
  _pendingFeedbackId = sessionId;
  const sheet = document.getElementById('feedback-sheet');
  if (!sheet) return;

  document.querySelectorAll('.fb-sat-btn').forEach(b => b.classList.remove('sel'));
  const orgEl    = document.getElementById('fb-orgasm');
  const lovedEl  = document.getElementById('fb-loved');
  const improveEl = document.getElementById('fb-improve');
  if (orgEl)     orgEl.checked  = false;
  if (lovedEl)   lovedEl.value  = '';
  if (improveEl) improveEl.value = '';

  sheet.classList.add('open');
  sheet.removeAttribute('aria-hidden');

  document.querySelectorAll('.fb-sat-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('.fb-sat-btn').forEach(x => x.classList.remove('sel'));
      btn.classList.add('sel');
    })
  );

  document.getElementById('btn-feedback-save')?.addEventListener('click', () => saveFeedback(st), { once: true });
  document.getElementById('btn-feedback-skip')?.addEventListener('click', closeFeedbackSheet, { once: true });
}

export function closeFeedbackSheet() {
  const sheet = document.getElementById('feedback-sheet');
  if (sheet) { sheet.classList.remove('open'); sheet.setAttribute('aria-hidden', 'true'); }
  _pendingFeedbackId = null;
}

async function saveFeedback(st) {
  if (!_pendingFeedbackId) { closeFeedbackSheet(); return; }

  const sat     = parseInt(document.querySelector('.fb-sat-btn.sel')?.dataset.sat) || null;
  const orgasms = document.getElementById('fb-orgasm')?.checked ? 1 : 0;
  const loved   = document.getElementById('fb-loved')?.value.trim()    || null;
  const improve = document.getElementById('fb-improve')?.value.trim()  || null;

  try {
    const { error } = await supabase.from('session_feedback').upsert({
      session_id:   _pendingFeedbackId,
      user_id:      st.me?.user_id,
      satisfaction: sat,
      orgasms,
      loved_txt:    loved,
      improve_txt:  improve,
      shared:       false,
    }, { onConflict: 'session_id,user_id' });

    if (error) throw error;
    closeFeedbackSheet();

  } catch (e) {
    console.error('saveFeedback:', e.message);
    closeFeedbackSheet(); // fermer quand même
  }
}

// ─── Init du sheet ────────────────────────────────────────────────────────

export function initSessionSheetListeners() {
  // Multi-select : mood, loc, act-tags, ft-mood, fb-sat
  ['mood-btn', 'loc-btn', 'ft-mood-btn'].forEach(cls => {
    document.querySelectorAll(`.${cls}`).forEach(b =>
      b.addEventListener('click', () => {
        document.querySelectorAll(`.${cls}`).forEach(x => x.classList.remove('sel'));
        b.classList.add('sel');
      })
    );
  });

  document.querySelectorAll('.act-tag-btn').forEach(b =>
    b.addEventListener('click', () => b.classList.toggle('sel'))
  );

  document.querySelectorAll('.fb-sat-btn, .ft-sat-btn').forEach(b =>
    b.addEventListener('click', () => {
      const cls = b.classList.contains('fb-sat-btn') ? '.fb-sat-btn' : '.ft-sat-btn';
      document.querySelectorAll(cls).forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
    })
  );
}
