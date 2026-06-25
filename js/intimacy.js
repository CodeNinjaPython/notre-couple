/**
 * intimacy.js — Écran Intime : sessions, désirs, santé, consentement.
 * §D du module : pas de galerie photos sans chiffrement E2E,
 * pas de gamification sur la fréquence, ton neutre sur les délais.
 */
import { supabase } from './supabase.js';
import { getMyMembership, getPartnerMembership } from './pairing.js';
import { localDateStr, diffDays, fmtDate } from './date-utils.js';

const MOODS = { tender:'🥰', playful:'😄', passionate:'🔥', spontaneous:'⚡' };
const MOOD_LABELS = { tender:'Tendre', playful:'Joueur', passionate:'Passionné', spontaneous:'Spontané' };
const LOCATIONS  = { maison:'🏠 Maison', voyage:'✈️ Voyage', hotel:'🏨 Hôtel', autre:'📍 Autre' };
const HEALTH_TYPES = {
  contraception: { icon:'💊', label:'Contraception' },
  test_ist:      { icon:'🧪', label:'Test IST' },
  vaccination:   { icon:'💉', label:'Vaccination' },
  symptom:       { icon:'💬', label:'Symptôme' },
};

let st = { me: null, partner: null, coupleId: null };

// ---------------------------------------------------------------------------
// Init principal
// ---------------------------------------------------------------------------
export async function initIntimacy() {
  st.me = await getMyMembership();
  if (!st.me) return;
  st.coupleId = st.me.couple_id;
  st.partner  = await getPartnerMembership(st.coupleId);

  document.getElementById('today-date-intime').textContent =
    new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  await Promise.all([
    renderRecentSessions(),
    renderMatchCount(),
    renderLastHealthEntry(),
    renderHardLimits(),
    renderSafewords(),
    renderDesireWindow(),
    renderChallenges(),
  ]);

  initQuickAdd();
  initSessionSheet();
  initHealthAdd();
}

// ---------------------------------------------------------------------------
// Fenêtre de désir (jours où les deux libidos sont hautes le même jour)
// ---------------------------------------------------------------------------
async function renderDesireWindow() {
  const el = document.getElementById('desire-window');
  if (!el || !st.partner) return;

  const since = new Date(Date.now() - 7 * 864e5).toISOString().split('T')[0];
  const { data } = await supabase.from('log_entries')
    .select('user_id, log_date, value')
    .eq('category_id', 'libido')
    .gte('log_date', since);

  if (!data?.length) { el.innerHTML = '<p class="intime-empty">Saisis ta libido dans Aujourd\'hui pour voir la fenêtre de désir.</p>'; return; }

  // Grouper par date
  const byDate = {};
  data.forEach(r => {
    if (!byDate[r.log_date]) byDate[r.log_date] = {};
    byDate[r.log_date][r.user_id] = Number(r.value?.v ?? r.value);
  });

  const aligned = Object.entries(byDate)
    .filter(([, d]) => d[st.me.user_id] != null && d[st.partner?.user_id] != null)
    .map(([date, d]) => ({ date, mine: d[st.me.user_id], theirs: d[st.partner.user_id] }));

  const hotDays = aligned.filter(d => d.mine >= 4 && d.theirs >= 4);
  const today   = localDateStr();

  if (!hotDays.length) {
    el.innerHTML = `<p class="intime-empty">Pas de fenêtre commune cette semaine — libidos pas encore alignées.</p>`;
    return;
  }

  const todayHot = hotDays.find(d => d.date === today);
  if (todayHot) {
    el.innerHTML = `<div class="desire-hot">🔥 Vos libidos sont alignées aujourd'hui</div>`;
  } else {
    el.innerHTML = `<div class="desire-info">✨ ${hotDays.length} jour${hotDays.length > 1 ? 's' : ''} aligné${hotDays.length > 1 ? 's' : ''} cette semaine</div>`;
  }
}

// ---------------------------------------------------------------------------
// Sessions récentes
// ---------------------------------------------------------------------------
async function renderRecentSessions() {
  const wrap = document.getElementById('recent-sessions');
  if (!wrap) return;

  const { data } = await supabase.from('intimate_sessions')
    .select('*, session_feedback(satisfaction, shared, user_id)')
    .eq('couple_id', st.coupleId)
    .order('session_date', { ascending: false })
    .limit(5);

  if (!data?.length) {
    wrap.innerHTML = `<div class="intime-empty">Aucun moment enregistré.<br>Appuyez sur + pour noter votre premier.</div>`;
    return;
  }

  wrap.innerHTML = data.map(s => {
    const diff = diffDays(localDateStr(), s.session_date);
    const when = diff === 0 ? "Aujourd'hui" : diff === 1 ? 'Hier' : `Il y a ${diff} j`;
    const myFb = s.session_feedback?.find(f => f.user_id === st.me?.user_id);
    const partnerFb = s.session_feedback?.find(f => f.user_id === st.partner?.user_id && f.shared);

    const sat = myFb?.satisfaction ? `${myFb.satisfaction}/10` : '—';
    const partnerSat = partnerFb?.satisfaction ? ` · ${partnerFb.satisfaction}/10` : '';

    return `<div class="session-card" data-id="${s.id}">
      <div class="session-meta">
        <span class="session-mood">${MOODS[s.mood] || '💑'}</span>
        <div>
          <div class="session-date">${when} · ${fmtDate(s.session_date, { day:'numeric', month:'short' })}</div>
          <div class="session-details">
            ${s.duration_min ? `${s.duration_min} min` : ''}
            ${s.location ? ` · ${LOCATIONS[s.location] || s.location}` : ''}
          </div>
        </div>
        <div class="session-sat">${sat}${partnerSat}</div>
      </div>
      ${s.note ? `<div class="session-note">${s.note}</div>` : ''}
    </div>`;
  }).join('');

  // Équilibre d'initiation
  const initiators = data.map(s => s.created_by);
  const myCount = initiators.filter(id => id === st.me?.user_id).length;
  const theirCount = initiators.length - myCount;
  if (initiators.length >= 3) {
    const balance = document.getElementById('initiation-balance');
    if (balance) {
      const myName = st.me?.display_name || 'Moi';
      const theirName = st.partner?.display_name || 'Partenaire';
      balance.textContent = `Initiative : ${myName} ${myCount}× · ${theirName} ${theirCount}×`;
      balance.style.display = 'block';
    }
  }

  // Délai neutre depuis dernier moment
  const lastDate = data[0]?.session_date;
  if (lastDate) {
    const daysSince = diffDays(localDateStr(), lastDate);
    const sinceEl = document.getElementById('days-since');
    if (sinceEl && daysSince > 0) {
      sinceEl.textContent = `Dernier moment : il y a ${daysSince} jour${daysSince > 1 ? 's' : ''}`;
    }
  }
}

// ---------------------------------------------------------------------------
// Compteur de matchs kinks
// ---------------------------------------------------------------------------
async function renderMatchCount() {
  const el = document.getElementById('kink-match-count');
  if (!el || !st.partner) return;

  // Mes ratings shared
  const { data: mine } = await supabase.from('kink_ratings')
    .select('kink_id').eq('user_id', st.me?.user_id).eq('shared', true);
  // Ratings shared du partenaire
  const { data: theirs } = await supabase.from('kink_ratings')
    .select('kink_id').eq('shared', true);

  if (!mine || !theirs) { el.textContent = '— en commun'; return; }

  const mySet = new Set(mine.map(r => r.kink_id));
  const matches = theirs.filter(r => r.kink_id && mySet.has(r.kink_id) &&
    theirs.some(t => t.kink_id === r.kink_id));

  // Dédupliquer les matchs
  const matchIds = new Set(
    mine.map(r => r.kink_id).filter(id => theirs.some(t => t.kink_id === id))
  );

  el.textContent = `${matchIds.size} désir${matchIds.size > 1 ? 's' : ''} en commun`;
}

// ---------------------------------------------------------------------------
// Hard limits (toujours visibles du partenaire — sécurité)
// ---------------------------------------------------------------------------
async function renderHardLimits() {
  const el = document.getElementById('hard-limits-display');
  if (!el) return;

  const { data } = await supabase.from('consent_limits')
    .select('practice, level, note, user_id')
    .eq('level', 'hard');

  if (!data?.length) {
    el.innerHTML = '<p class="intime-empty">Aucune limite hard enregistrée.</p>';
    return;
  }

  el.innerHTML = data.map(l => {
    const isMe = l.user_id === st.me?.user_id;
    const who = isMe ? (st.me?.display_name || 'Moi') : (st.partner?.display_name || 'Partenaire');
    return `<div class="limit-row hard">
      <span class="limit-who">${who}</span>
      <span class="limit-practice">${l.practice}</span>
      ${l.note ? `<span class="limit-note">${l.note}</span>` : ''}
    </div>`;
  }).join('');
}

// ---------------------------------------------------------------------------
// Safewords
// ---------------------------------------------------------------------------
async function renderSafewords() {
  const el = document.getElementById('safewords-display');
  if (!el) return;

  const { data } = await supabase.from('safewords')
    .select('*').eq('couple_id', st.coupleId);

  if (!data?.length) {
    el.innerHTML = '<p class="intime-empty">Aucun safeword enregistré. <button type="button" id="btn-add-safeword" class="btn-inline">+ Ajouter</button></p>';
  } else {
    el.innerHTML = data.map(sw =>
      `<div class="safeword-chip"><strong>${sw.word}</strong>${sw.meaning ? ` — ${sw.meaning}` : ''}</div>`
    ).join('') + '<button type="button" id="btn-add-safeword" class="btn-inline">+ Ajouter</button>';
  }

  document.getElementById('btn-add-safeword')?.addEventListener('click', async () => {
    const word    = prompt('Safeword :');
    const meaning = word ? prompt('Signification (ex. "stop immédiat") :') : null;
    if (!word) return;
    await supabase.from('safewords').insert({ couple_id: st.coupleId, word, meaning });
    await renderSafewords();
  });
}

// ---------------------------------------------------------------------------
// Dernière entrée santé
// ---------------------------------------------------------------------------
async function renderLastHealthEntry() {
  const el = document.getElementById('health-summary');
  if (!el) return;

  const { data } = await supabase.from('sexual_health')
    .select('*').order('entry_date', { ascending: false }).limit(3);

  if (!data?.length) {
    el.innerHTML = '<p class="intime-empty">Aucune entrée santé. Tes données restent privées par défaut.</p>';
    return;
  }

  el.innerHTML = data.map(h => {
    const t = HEALTH_TYPES[h.type] || { icon:'📋', label: h.type };
    return `<div class="health-row">
      <span class="health-icon">${t.icon}</span>
      <div>
        <div class="health-label">${h.label}</div>
        <div class="health-date">${fmtDate(h.entry_date, { day:'numeric', month:'short', year:'numeric' })}${h.shared ? ' · partagé' : ' · privé'}</div>
      </div>
    </div>`;
  }).join('');
}

// ---------------------------------------------------------------------------
// Défis du mois
// ---------------------------------------------------------------------------
async function renderChallenges() {
  const el = document.getElementById('challenges-list');
  if (!el) return;

  const { data } = await supabase.from('challenges')
    .select('*').eq('couple_id', st.coupleId)
    .order('created_at', { ascending: false }).limit(3);

  if (!data?.length) {
    el.innerHTML = '<p class="intime-empty">Aucun défi en cours. <button type="button" id="btn-add-challenge" class="btn-inline">+ Proposer</button></p>';
    bindAddChallenge();
    return;
  }

  el.innerHTML = data.map(c =>
    `<div class="challenge-row${c.completed ? ' done' : ''}">
      <button type="button" class="challenge-check" data-id="${c.id}">${c.completed ? '✅' : '⬜'}</button>
      <div>
        <div class="challenge-title">${c.title}</div>
        ${c.due_date ? `<div class="challenge-date">→ ${fmtDate(c.due_date, { day:'numeric', month:'short' })}</div>` : ''}
      </div>
    </div>`
  ).join('') + '<button type="button" id="btn-add-challenge" class="btn-inline" style="margin-top:10px">+ Proposer un défi</button>';

  el.querySelectorAll('.challenge-check').forEach(btn => {
    btn.addEventListener('click', async () => {
      const current = btn.textContent === '✅';
      await supabase.from('challenges').update({ completed: !current }).eq('id', btn.dataset.id);
      await renderChallenges();
    });
  });
  bindAddChallenge();
}

function bindAddChallenge() {
  document.getElementById('btn-add-challenge')?.addEventListener('click', async () => {
    const title = prompt('Défi du mois :');
    if (!title) return;
    const due = prompt('Date limite (YYYY-MM-DD, optionnel) :') || null;
    await supabase.from('challenges').insert({
      couple_id: st.coupleId,
      title,
      due_date: due || null,
      created_by: st.me?.user_id,
    });
    await renderChallenges();
  });
}

// ---------------------------------------------------------------------------
// Bouton rapide "On a partagé un moment ?"
// ---------------------------------------------------------------------------
function initQuickAdd() {
  document.getElementById('btn-quick-add')?.addEventListener('click', () => {
    openSessionSheet();
  });
}

// ---------------------------------------------------------------------------
// Sheet : log d'une session
// ---------------------------------------------------------------------------
function openSessionSheet() {
  const sheet = document.getElementById('session-sheet');
  if (!sheet) return;
  // Réinitialiser
  const dateEl = document.getElementById('session-date-input');
  if (dateEl) { dateEl.value = localDateStr(); dateEl.max = localDateStr(); }
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('sel'));
  document.querySelectorAll('.loc-btn').forEach(b => b.classList.remove('sel'));
  const durEl = document.getElementById('session-duration');
  const satEl = document.getElementById('session-sat-input');
  const noteEl = document.getElementById('session-note-input');
  if (durEl) durEl.value = '';
  if (satEl) satEl.value = '';
  if (noteEl) noteEl.value = '';

  sheet.classList.add('open');
  document.getElementById('btn-session-cancel')?.addEventListener('click', closeSessionSheet, { once: true });
  document.getElementById('btn-session-save')?.addEventListener('click', saveSession, { once: true });
}

function closeSessionSheet() {
  document.getElementById('session-sheet')?.classList.remove('open');
}

async function saveSession() {
  const date     = document.getElementById('session-date-input')?.value || localDateStr();
  const mood     = document.querySelector('.mood-btn.sel')?.dataset.mood || null;
  const location = document.querySelector('.loc-btn.sel')?.dataset.loc  || null;
  const dur      = parseInt(document.getElementById('session-duration')?.value) || null;
  const sat      = parseInt(document.getElementById('session-sat-input')?.value) || null;
  const note     = document.getElementById('session-note-input')?.value?.trim() || null;

  const { data: session, error } = await supabase.from('intimate_sessions').insert({
    couple_id:    st.coupleId,
    created_by:   st.me?.user_id,
    session_date: date,
    mood, location,
    duration_min: dur,
    note,
  }).select().single();

  if (error) { console.error(error); return; }

  // Feedback personnel
  if (sat != null && session?.id) {
    await supabase.from('session_feedback').insert({
      session_id:   session.id,
      user_id:      st.me?.user_id,
      satisfaction: sat,
      shared:       false,
    });
  }

  closeSessionSheet();
  await renderRecentSessions();
}

function initSessionSheet() {
  // Mood buttons
  document.querySelectorAll('.mood-btn').forEach(b =>
    b.addEventListener('click', () => {
      document.querySelectorAll('.mood-btn').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
    })
  );
  // Location buttons
  document.querySelectorAll('.loc-btn').forEach(b =>
    b.addEventListener('click', () => {
      document.querySelectorAll('.loc-btn').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
    })
  );
}

// ---------------------------------------------------------------------------
// Bouton ajout entrée santé (dans initIntimacy via délégation)
// ---------------------------------------------------------------------------
function initHealthAdd() {
  document.getElementById('btn-add-health')?.addEventListener('click', async () => {
    const types = { '1':'contraception', '2':'test_ist', '3':'vaccination', '4':'symptom' };
    const choice = prompt('Type :\n1. Contraception\n2. Test IST\n3. Vaccination\n4. Symptôme');
    const type = types[choice];
    if (!type) return;
    const label = prompt('Détail (ex. "pilule prise", "test négatif", "HPV", "douleur") :');
    if (!label) return;
    const note = prompt('Note (optionnel) :') || null;
    const shared = confirm('Partager avec votre partenaire ?');

    await supabase.from('sexual_health').insert({
      user_id: st.me?.user_id,
      entry_date: localDateStr(),
      type, label, note,
      shared,
    });
    await renderLastHealthEntry();
  });
}

// ---------------------------------------------------------------------------
// Export d'état pour kinks.js
// ---------------------------------------------------------------------------
export function getIntimacyState() {
  return st;
}
