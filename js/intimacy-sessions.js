/**
 * intimacy-sessions.js — Cycle de vie des sessions intimes.
 * Formulaire complet + mode fast-track (4-5 taps).
 * Toutes les requêtes Supabase dans des try/catch avec messages UI.
 */
import { supabase } from './supabase.js';
import { localDateStr, fmtDate, diffDays } from './date-utils.js';
import { POSITIONS, posThumb } from './intimacy-library.js';
import { toast, confirmDialog, friendlyError } from './ui-feedback.js';
import { syncSessionToDailyLog } from './session-bridge.js';
import { formatTag } from './labels.js';
import { bindSessionWizardNav, showSessionWizardStep } from './session-wizard.js';
import { syncPositionRatings } from './intimacy-position-ratings.js';
import { openFastTrackFlow } from './intimacy-fast-track.js';
import { openFeedbackFlow, closeFeedbackFlow } from './intimacy-feedback.js';
import {
  CONTEXT_MOMENT,
  CONTEXT_RAPIDITE,
  LOCATIONS,
  LOCATIONS_TREE,
  MOOD_LABELS,
  MOODS,
  PROTECTION_ELLE,
  PROTECTION_LUI,
  SOLO_ELLE,
  SOLO_LUI,
} from './intimacy-session-options.js';

// Échappe le texte saisi par l'utilisateur avant injection dans innerHTML / attributs.
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
// Sélecteur d'attribut sûr (CSS.escape si dispo, sinon repli minimal sur les guillemets).
function attrSel(v) {
  return typeof CSS !== 'undefined' && CSS.escape
    ? CSS.escape(String(v))
    : String(v).replace(/["\\]/g, '\\$&');
}

// Génère une grille de tags multi-select (act-tag-btn) dans un conteneur.
// Un 3e élément optionnel [code, label, sous-options[]] crée une sous-grille
// révélée quand le tag parent est sélectionné (data-tag enfant = "parent.enfant").
function renderTagGrid(containerId, opts) {
  const c = document.getElementById(containerId);
  if (!c) return;
  c.innerHTML = opts.map(([tag, label]) =>
    `<button type="button" class="act-tag-btn" data-tag="${tag}">${label}</button>`).join('');

  const withSub = opts.filter(o => o[2]?.length);
  let host = document.getElementById(containerId + '-sub');
  if (withSub.length) {
    if (!host) {
      host = document.createElement('div');
      host.id = containerId + '-sub';
      host.className = 'act-subhost';
      c.after(host);
    }
    host.innerHTML = withSub.map(([tag, label, sub]) =>
      `<div class="act-subgroup" data-parent="${tag}" hidden>
         <div class="act-subgroup-label">${label}</div>
         <div class="act-tags-grid">${sub.map(([st, sl]) =>
           `<button type="button" class="act-tag-btn" data-tag="${tag}.${st}">${sl}</button>`).join('')}</div>
       </div>`).join('');
    host.querySelectorAll('.act-tag-btn').forEach(b =>
      b.addEventListener('click', () => b.classList.toggle('sel')));
  } else if (host) {
    host.innerHTML = '';
  }

  c.querySelectorAll('.act-tag-btn').forEach(b =>
    b.addEventListener('click', () => {
      b.classList.toggle('sel');
      const grp = host?.querySelector(`.act-subgroup[data-parent="${b.dataset.tag}"]`);
      if (grp) {
        const on = b.classList.contains('sel');
        grp.hidden = !on;
        if (!on) grp.querySelectorAll('.act-tag-btn.sel').forEach(x => x.classList.remove('sel'));
      }
    }));
}

// Restaure une grille avec sous-options (tags « parent » et « parent.enfant »).
function restoreCascade(sel, tags) {
  const host = sel + '-sub';
  (tags || []).forEach(t => {
    if (t.includes('.')) {
      document.querySelector(`${host} .act-tag-btn[data-tag="${attrSel(t)}"]`)?.classList.add('sel');
      const parent = t.split('.')[0];
      document.querySelector(`${sel} .act-tag-btn[data-tag="${attrSel(parent)}"]`)?.classList.add('sel');
      const grp = document.querySelector(`${host} .act-subgroup[data-parent="${attrSel(parent)}"]`);
      if (grp) grp.hidden = false;
    } else {
      document.querySelector(`${sel} .act-tag-btn[data-tag="${attrSel(t)}"]`)?.classList.add('sel');
      const grp = document.querySelector(`${host} .act-subgroup[data-parent="${attrSel(t)}"]`);
      if (grp) grp.hidden = false;
    }
  });
}
const renderProtectionGrid = (containerId, tracksCycle) =>
  renderTagGrid(containerId, tracksCycle ? PROTECTION_ELLE : PROTECTION_LUI);

// Remplit toutes les grilles solo + contexte selon le genre du membre courant.
function renderSoloGrids(tracksCycle) {
  const set = tracksCycle ? SOLO_ELLE : SOLO_LUI;
  renderTagGrid('session-solo-practices', set.practices);
  renderTagGrid('session-solo-accessories', set.accessories);
  renderTagGrid('session-solo-excitation', set.excitation);
  renderTagGrid('session-context-moment', CONTEXT_MOMENT);
  renderTagGrid('session-context-rapidite', CONTEXT_RAPIDITE);
}

// Lieux à deux niveaux : catégorie (sélection unique) → endroits précis révélés.
function renderLocations() {
  const parents = document.getElementById('loc-parents');
  const subHost = document.getElementById('loc-sub');
  if (!parents) return;
  parents.innerHTML = LOCATIONS_TREE.map(([code, label]) =>
    `<button type="button" class="loc-btn" data-loc="${code}">${label}</button>`).join('');
  if (subHost) subHost.innerHTML = '';
  const subMap = Object.fromEntries(LOCATIONS_TREE.filter(o => o[2]?.length).map(o => [o[0], o[2]]));

  parents.querySelectorAll('.loc-btn').forEach(b => b.addEventListener('click', () => {
    parents.querySelectorAll('.loc-btn').forEach(x => x.classList.remove('sel'));
    b.classList.add('sel');
    const subs = subMap[b.dataset.loc];
    if (!subHost) return;
    subHost.innerHTML = subs
      ? `<div class="act-tags-grid">${subs.map(([sc, sl]) =>
          `<button type="button" class="loc-btn loc-sub-btn" data-loc="${sc}">${sl}</button>`).join('')}</div>`
      : '';
    subHost.querySelectorAll('.loc-btn').forEach(sb => sb.addEventListener('click', () => {
      subHost.querySelectorAll('.loc-btn').forEach(x => x.classList.remove('sel'));
      sb.classList.add('sel');
    }));
  }));
}

// Restaure le lieu enregistré (code parent ou enfant) en révélant la sous-grille.
function restoreLocation(code) {
  if (!code) return;
  const parents = document.getElementById('loc-parents');
  const direct = parents?.querySelector(`.loc-btn[data-loc="${attrSel(code)}"]`);
  if (direct) { direct.click(); return; }
  const entry = LOCATIONS_TREE.find(([, , subs]) => (subs || []).some(s => s[0] === code));
  if (entry) {
    parents?.querySelector(`.loc-btn[data-loc="${entry[0]}"]`)?.click();
    document.querySelector(`#loc-sub .loc-btn[data-loc="${attrSel(code)}"]`)?.click();
  }
}

// Collecte les data-tag sélectionnés d'un conteneur + sa sous-grille éventuelle.
const collectTags = (sel) => [
  ...document.querySelectorAll(`${sel} .act-tag-btn.sel`),
  ...document.querySelectorAll(`${sel}-sub .act-tag-btn.sel`),
].map(b => b.dataset.tag);

// Garde en mémoire la session en cours d'édition pour la sauvegarde.
// `null` si c'est une nouvelle session.
let currentEditingSession = null;
let sessionCustomPositions = [];

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

// Émis après toute sauvegarde de session/feedback → le calendrier intime se recharge.
function notifySessionSaved() {
  document.dispatchEvent(new CustomEvent('nc:session-saved'));
}

// Supprime une session (+ ses notes de position) après confirmation.
// Émet nc:session-saved (calendrier/bilan se rechargent). Renvoie true si supprimé.
export async function deleteSession(sessionId, st) {
  const confirmed = await confirmDialog({
    title: 'Supprimer ce moment ?',
    message: 'Cette action est irréversible. Le moment et ses feedbacks/notes seront effacés.',
    confirmLabel: 'Oui, supprimer',
    danger: true,
  });
  if (!confirmed) return false;
  try {
    try { await supabase.from('position_ratings').delete().eq('session_id', sessionId); }
    catch (e) { console.warn('position_ratings delete:', e?.message || e); }
    const { error } = await supabase.from('intimate_sessions').delete().eq('id', sessionId);
    if (error) throw error;
    toast('Moment supprimé.');
    notifySessionSaved();
    return true;
  } catch (error) {
    toast(friendlyError(error), 'error');
    console.error('deleteSession:', error);
    return false;
  }
}

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
      const tags     = (s.activity_tags || []).map(t => `<span class="session-tag">${escapeHtml(formatTag(t))}</span>`).join('');

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
          <button type="button" class="session-delete btn-icon" data-id="${s.id}" aria-label="Supprimer ce moment">×</button>
        </div>
        ${s.note ? `<div class="session-note">${s.note}</div>` : ''}
        ${myFb?.loved_txt ? `<div class="session-loved">❤️ ${myFb.loved_txt}</div>` : ''}
      </div>`;
    }).join('');

    // Attacher les écouteurs pour la suppression
    wrap.querySelectorAll('.session-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation(); // Évite de déclencher d'autres clics sur la carte
        if (await deleteSession(btn.dataset.id, st)) await renderRecentSessions(st);
      });
    });

    // Tap on a card to edit it
    wrap.querySelectorAll('.session-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // Empêcher l'édition lors du clic sur le bouton de suppression
        if (e.target.closest('.session-delete')) return;
        loadAndEditSession(card.dataset.id, st);
      });
    });

    // Équilibre d'initiation (neutre)
    const initiators = data.map(s => s.created_by);
    const myCount    = initiators.filter(id => id === st.me?.user_id).length;
    const theirCount = initiators.length - myCount;
    if (initiators.length >= 3) {
      const balance = document.getElementById('initiation-balance');
      if (balance) {
        const myName    = st.me?.display_name || 'Moi';
        const theirName = st.partner?.display_name || 'Partenaire';
        balance.textContent = `${myName} ${myCount}× · ${theirName} ${theirCount}×`;
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

/**
 * Charge une session existante par son ID et ouvre le formulaire pour l'éditer.
 * @param {string} sessionId
 * @param {object} st - L'état global de l'intimité (me, partner, coupleId)
 */
export async function loadAndEditSession(sessionId, st) {
  try {
    const { data: session, error } = await supabase
      .from('intimate_sessions')
      .select('*, session_activities(tags)')
      .eq('id', sessionId)
      .single();

    if (error) throw error;
    if (!session) {
      toast('Moment introuvable.', 'error');
      return;
    }

    currentEditingSession = session; // Définit l'état d'édition

    // Ouvre la feuille de saisie (qui réinitialise d'abord tous les champs)
    openFullSessionSheet(st);

    // Remplit les champs avec les données de la session chargée
    document.getElementById('session-date-input').value = session.session_date;
    document.querySelector(`.mood-btn[data-mood="${session.mood}"]`)?.classList.add('sel');
    restoreLocation(session.location);
    document.getElementById('session-duration').value = session.duration_min || '';
    document.getElementById('session-note-input').value = session.note || '';

    // Détails JSONB (nouveaux champs)
    const details = session.details || {};
    (details.practices_performed || []).forEach(tag => {
      let existing = document.querySelector(`#session-practices-performed .act-tag-btn[data-tag="${attrSel(tag)}"]`);
      if (!existing && tag.startsWith('custom:')) {
        const label = tag.replace('custom:', '');
        const container = document.getElementById('session-practices-performed');
        if (container) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'act-tag-btn sel';
          btn.dataset.tag = tag;
          btn.dataset.custom = 'true';
          btn.textContent = `✨ ${label}`;
          btn.addEventListener('click', () => btn.classList.toggle('sel'));
          container.appendChild(btn);
          existing = btn;
        }
      }
      existing?.classList.add('sel');
    });

    (details.practices_received || []).forEach(tag => {
      let existing = document.querySelector(`#session-practices-received .act-tag-btn[data-tag="${attrSel(tag)}"]`);
      if (!existing && tag.startsWith('custom:')) {
        const label = tag.replace('custom:', '');
        const container = document.getElementById('session-practices-received');
        if (container) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'act-tag-btn sel';
          btn.dataset.tag = tag;
          btn.dataset.custom = 'true';
          btn.textContent = `✨ ${label}`;
          btn.addEventListener('click', () => btn.classList.toggle('sel'));
          container.appendChild(btn);
          existing = btn;
        }
      }
      existing?.classList.add('sel');
    });

    (details.feelings || []).forEach(tag => {
      document.querySelector(`#session-feelings .act-tag-btn[data-tag="${tag}"]`)?.classList.add('sel');
    });
    (details.protection_me || []).forEach(tag => {
      document.querySelector(`#session-protection-me .act-tag-btn[data-tag="${tag}"]`)?.classList.add('sel');
    });
    (details.protection_partner || []).forEach(tag => {
      document.querySelector(`#session-protection-partner .act-tag-btn[data-tag="${tag}"]`)?.classList.add('sel');
    });
    document.getElementById('session-ejaculation').value = details.ejaculation || 'inconnu';

    // Restaurer les sélections solo + contexte (les grilles ont été rendues par openFullSessionSheet).
    const restoreTags = (sel, tags) => (tags || []).forEach(t =>
      document.querySelector(`${sel} .act-tag-btn[data-tag="${attrSel(t)}"]`)?.classList.add('sel'));
    restoreCascade('#session-solo-practices',   details.solo_practices);
    restoreCascade('#session-solo-excitation',  details.solo_excitation);
    restoreTags('#session-solo-accessories', details.solo_accessories);
    restoreTags('#session-context-moment',   details.context_moment);
    restoreTags('#session-context-rapidite', details.context_rapidite);

    // Positions + marqueur solo (stockés dans session_activities.tags)
    const allTags = session.session_activities?.[0]?.tags || [];
    const soloEl = document.getElementById('session-solo'); if (soloEl) soloEl.checked = allTags.includes('solo');
    const sheet = document.getElementById('session-sheet'); if (sheet && soloEl) sheet.classList.toggle('is-solo', soloEl.checked);
    const positionIds = allTags.filter(t => t !== 'solo');

    positionIds.forEach(id => {
      if (id.startsWith('custom:')) {
        const label = id.replace('custom:', '');
        if (!sessionCustomPositions.includes(label)) {
          sessionCustomPositions.push(label);
        }
      }
    });

    // Rerendre le picker de positions pour inclure les positions personnalisées chargées
    renderPositionPicker();

    positionIds.forEach(id => {
      document.querySelector(`.pos-pick-btn[data-id="${attrSel(id)}"]`)?.classList.add('sel');
    });

    // Recharger les notes de position existantes (sinon la sauvegarde les effacerait).
    try {
      const { data: prevRatings } = await supabase.from('position_ratings')
        .select('position_id, score, pain, too_deep').eq('session_id', sessionId);
      (prevRatings || []).forEach(r => {
        ratingState[r.position_id] = { score: r.score || 0, pain: !!r.pain, too_deep: !!r.too_deep };
      });
    } catch (e) { /* table absente / pas de notes → ignore */ }

    syncRatingRows(); // Affiche les lignes de notation (valeurs existantes incluses)

  } catch (e) {
    toast(friendlyError(e), 'error');
    console.error('loadAndEditSession error:', e);
  }
}

// ─── Formulaire complet ────────────────────────────────────────────────────

export function openFullSessionSheet(st) {
  const sheet = document.getElementById('session-sheet');
  if (!sheet) return;

  sessionCustomPositions = [];
  initCustomAdders();

  // Réinitialiser
  const dateEl = document.getElementById('session-date-input');
  if (dateEl) { dateEl.value = localDateStr(); dateEl.max = localDateStr(); }

  document.querySelectorAll('.mood-btn, .loc-btn, .act-tag-btn, .prelim-chip, .pos-pick-btn').forEach(b => b.classList.remove('sel'));

  // Réinitialiser la notation des positions
  Object.keys(ratingState).forEach(k => delete ratingState[k]);
  const ratingsWrap = document.getElementById('position-ratings');
  if (ratingsWrap) ratingsWrap.innerHTML = '';

  ['session-duration', 'session-prelim-duration', 'session-note-input'].forEach(id => {
    const el = document.getElementById(id); // @ts-ignore
    if (el) el.value = '';
  });

  // Réinitialiser préliminaires
  const prelimToggle = document.getElementById('session-prelim-toggle');
  if (prelimToggle) { prelimToggle.checked = false; }
  const prelimDetails = document.getElementById('prelim-details');
  if (prelimDetails) { prelimDetails.classList.remove('open'); }

  // Réinitialiser mon orgasme (slider à 0). On ne renseigne plus celui du partenaire.
  const orgMe = document.getElementById('orgasm-range-me'); if (orgMe) orgMe.value = 0;
  const orgMeVal = document.getElementById('orgasm-val-me'); if (orgMeVal) orgMeVal.textContent = '0';

  // Réinitialiser le champ select
  const ejacEl = document.getElementById('session-ejaculation');
  if (ejacEl) ejacEl.value = 'inconnu';

  // Réinitialiser le marqueur solo
  const soloChk = document.getElementById('session-solo');
  if (soloChk) soloChk.checked = false;
  sheet.classList.remove('is-solo');


  // Mettre à jour mon nom sur le slider d'orgasme.
  if (st?.me) {
    const orgLabelMe = document.getElementById('orgasm-label-me');
    if (orgLabelMe) orgLabelMe.textContent = st.me.display_name || 'Moi';
  }

  // Remplir le sélecteur de positions
  renderPositionPicker();

  // Protections adaptées au genre : « Moi » = mon rôle, « Partenaire » = l'autre.
  renderLocations();
  renderProtectionGrid('session-protection-me', !!st?.me?.tracks_cycle);
  renderProtectionGrid('session-protection-partner', !!st?.partner?.tracks_cycle);

  // Options solo (pratiques/accessoires/excitation) selon le genre + contexte.
  renderSoloGrids(!!st?.me?.tracks_cycle);

  sheet.classList.add('open');
  sheet.removeAttribute('aria-hidden');

  // Écouter save/cancel/fast-track
  document.getElementById('btn-session-save')?.addEventListener('click', () => saveFullSession(st), { once: true });
  document.getElementById('btn-session-cancel')?.addEventListener('click', closeSessionSheet, { once: true });
  document.getElementById('btn-fast-track')?.addEventListener('click', () => openFastTrack(st), { once: true });

  // Fermer : bouton ✕ + clic sur le fond (en dehors de la feuille). .onclick = idempotent.
  const closeBtn = document.getElementById('btn-session-close');
  if (closeBtn) closeBtn.onclick = closeSessionSheet;
  sheet.onclick = (e) => { if (e.target === sheet) closeSessionSheet(); };

  // Wizard : navigation entre étapes (.onclick = idempotent à chaque ouverture)
  bindSessionWizardNav();
  showSessionWizardStep(1);
}

export function prepareNewSession() {
  currentEditingSession = null;
}

export function closeSessionSheet() {
  const sheet = document.getElementById('session-sheet');
  if (sheet) { sheet.classList.remove('open'); sheet.setAttribute('aria-hidden', 'true'); }
}

// État de notation des positions de la session en cours (position_id → {score, pain, too_deep}).
const ratingState = {};

function renderPositionPicker() {
  const grid = document.getElementById('position-picker-grid');
  if (!grid) return;
  
  const defaultHtml = POSITIONS.map(p =>
    `<button type="button" class="pos-pick-btn" data-id="${p.id}"
      aria-label="${p.label}" title="${p.label}">
      <div class="pos-pick-svg">${posThumb(p)}</div>
      <span class="pos-pick-label">${p.label}</span>
    </button>`
  ).join('');

  const customHtml = sessionCustomPositions.map(label => {
    const id = `custom:${label}`;
    const e = escapeHtml(label);
    return `<button type="button" class="pos-pick-btn" data-id="${escapeHtml(id)}"
      aria-label="${e}" title="${e}">
      <div class="pos-pick-svg">✨</div>
      <span class="pos-pick-label">${e}</span>
    </button>`;
  }).join('');

  grid.innerHTML = defaultHtml + customHtml;

  grid.querySelectorAll('.pos-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => { btn.classList.toggle('sel'); syncRatingRows(); });
  });
}

function initCustomAdders() {
  // Supprimer les boutons de pratiques personnalisées précédents
  document.querySelectorAll('.act-tag-btn[data-custom="true"]').forEach(b => b.remove());

  // Gestionnaire d'ajout de position
  const addPosBtn = document.getElementById('btn-add-custom-pos');
  const inputPos = document.getElementById('input-custom-pos');
  const grid = document.getElementById('position-picker-grid');
  if (addPosBtn && inputPos && grid) {
    addPosBtn.onclick = null;
    addPosBtn.onclick = () => {
      const val = inputPos.value.trim();
      if (!val) return;
      if (!sessionCustomPositions.includes(val) && !POSITIONS.some(p => p.label === val)) {
        sessionCustomPositions.push(val);
        renderPositionPicker();
        // Sélectionner automatiquement la nouvelle position
        const newBtn = grid.querySelector(`.pos-pick-btn[data-id="${attrSel('custom:' + val)}"]`);
        if (newBtn) {
          newBtn.classList.add('sel');
          syncRatingRows();
        }
      }
      inputPos.value = '';
    };
  }

  // Helper pour ajouter un tag de pratique
  const addCustomPractice = (inputEl, containerEl) => {
    const val = inputEl.value.trim();
    if (!val) return;
    const tag = `custom:${val}`;
    
    let existing = containerEl.querySelector(`.act-tag-btn[data-tag="${attrSel(tag)}"]`);
    if (!existing) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'act-tag-btn sel';
      btn.dataset.tag = tag;
      btn.dataset.custom = 'true';
      btn.textContent = `✨ ${val}`;
      btn.addEventListener('click', () => btn.classList.toggle('sel'));
      containerEl.appendChild(btn);
    } else {
      existing.classList.add('sel');
    }
    inputEl.value = '';
  };

  // Gestionnaire d'ajout de pratiques exécutées
  const addPerfBtn = document.getElementById('btn-add-custom-practice-perf');
  const inputPerf = document.getElementById('input-custom-practice-perf');
  const containerPerf = document.getElementById('session-practices-performed');
  if (addPerfBtn && inputPerf && containerPerf) {
    addPerfBtn.onclick = null;
    addPerfBtn.onclick = () => addCustomPractice(inputPerf, containerPerf);
  }

  // Gestionnaire d'ajout de pratiques reçues
  const addRecBtn = document.getElementById('btn-add-custom-practice-rec');
  const inputRec = document.getElementById('input-custom-practice-rec');
  const containerRec = document.getElementById('session-practices-received');
  if (addRecBtn && inputRec && containerRec) {
    addRecBtn.onclick = null;
    addRecBtn.onclick = () => addCustomPractice(inputRec, containerRec);
  }
}

// Affiche une ligne de notation (/10 + 2 drapeaux adaptés) par position sélectionnée.
function syncRatingRows() {
  const wrap = document.getElementById('position-ratings');
  if (!wrap) return;
  const selected = [...document.querySelectorAll('.pos-pick-btn.sel')].map(b => b.dataset.id);
  syncPositionRatings({
    wrap,
    selectedIds: selected,
    positions: POSITIONS,
    ratingState,
    escapeHtml,
  });
}

async function saveFullSession(st) {
  const isEditing = !!currentEditingSession;

  const date         = document.getElementById('session-date-input')?.value || localDateStr();
  const mood         = document.querySelector('.mood-btn.sel')?.dataset.mood || null;
  // Lieu : on garde l'endroit précis (sous-option) s'il existe, sinon la catégorie.
  const location     = document.querySelector('#loc-sub .loc-btn.sel')?.dataset.loc
                    || document.querySelector('#loc-parents .loc-btn.sel')?.dataset.loc
                    || null;
  const dur          = parseInt(document.getElementById('session-duration')?.value)      || null;
  const note         = document.getElementById('session-note-input')?.value?.trim() || null;
  const isSolo = document.getElementById('session-solo')?.checked ?? false;
  // Tags positions + marqueur solo (distingue solo elle/lui sur le calendrier).
  const positionIds  = [...document.querySelectorAll('.pos-pick-btn.sel')].map(b => b.dataset.id);
  const activityTags = isSolo ? [...positionIds, 'solo'] : positionIds;

  // Nouveaux champs détaillés
  const details = {
    practices_performed:  [...document.querySelectorAll('#session-practices-performed .sel')].map(b => b.dataset.tag),
    practices_received:   [...document.querySelectorAll('#session-practices-received .sel')].map(b => b.dataset.tag),
    feelings:             [...document.querySelectorAll('#session-feelings .sel')].map(b => b.dataset.tag),
    protection_me:        [...document.querySelectorAll('#session-protection-me .sel')].map(b => b.dataset.tag),
    protection_partner:   [...document.querySelectorAll('#session-protection-partner .sel')].map(b => b.dataset.tag),
    ejaculation:          document.getElementById('session-ejaculation')?.value || 'inconnu',
    solo:                 isSolo,
    // Solo (par genre) + contexte commun
    solo_practices:       collectTags('#session-solo-practices'),
    solo_accessories:     collectTags('#session-solo-accessories'),
    solo_excitation:      collectTags('#session-solo-excitation'),
    context_moment:       collectTags('#session-context-moment'),
    context_rapidite:     collectTags('#session-context-rapidite'),
  };

  // Préliminaires
  const prelimOn    = document.getElementById('session-prelim-toggle')?.checked ?? false;
  const prelimDur   = parseInt(document.getElementById('session-prelim-duration')?.value) || null;
  const prelimIntEl = document.querySelector('.prelim-chip.sel');
  const prelimInt   = prelimIntEl ? parseInt(prelimIntEl.dataset.intensity) : null;

  // Mon orgasme uniquement (slider 0-10, déclaratif). Le partenaire renseigne le sien.
  const myOrgasms = parseInt(document.getElementById('orgasm-range-me')?.value) || 0;

  const btn = document.getElementById('btn-session-save');
  if (btn) { btn.disabled = true; btn.textContent = 'Enregistrement…'; }

  try {
    const sessionPayload = {
      couple_id:     st.coupleId,
      created_by:    st.me?.user_id,
      session_date:  date,
      mood, location,
      duration_min:  dur,
      note,
      prelim_min:    prelimOn ? (prelimDur || null) : null,
      prelim_intensity: prelimOn ? (prelimInt || null) : null,
      partner_orgasm:   null, // le partenaire renseigne son propre ressenti (jamais l'autre)
      details, // NOTE: nécessite une colonne 'details' de type JSONB sur la table 'intimate_sessions'
    };

    const persist = (payload) => isEditing
      ? supabase.from('intimate_sessions').update(payload).eq('id', currentEditingSession.id).select().single()
      : supabase.from('intimate_sessions').insert(payload).select().single();

    let { data: session, error } = await persist(sessionPayload);
    // Repli si la colonne 'details' n'existe pas encore (migration non exécutée) :
    // on enregistre quand même le moment, sans les champs détaillés.
    if (error && /details/i.test(error.message || '')) {
      const { details: _omit, ...withoutDetails } = sessionPayload;
      ({ data: session, error } = await persist(withoutDetails));
    }

    if (error) throw error;

    // Positions : en édition on repart de zéro (sinon des positions retirées
    // resteraient). On réinsère seulement s'il en reste.
    if (session?.id) {
      if (isEditing) await supabase.from('session_activities').delete().eq('session_id', session.id);
      if (activityTags.length) {
        if (!isEditing) await supabase.from('session_activities').delete().eq('session_id', session.id);
        await supabase.from('session_activities').insert({ session_id: session.id, tags: activityTags });
      }
    }

    // Notes de position (Phase 3) — best-effort : n'échoue pas la session si la
    // table position_ratings n'existe pas encore (schéma à exécuter).
    if (session?.id) {
      const ratings = positionIds
        .map(id => ({ id, ...(ratingState[id] || {}) }))
        .filter(r => r.score > 0 || r.pain || r.too_deep)
        .map(r => ({
          couple_id: st.coupleId, created_by: st.me?.user_id, session_id: session.id,
          position_id: r.id, score: r.score > 0 ? r.score : null,
          pain: !!r.pain, too_deep: !!r.too_deep, rated_on: date,
        }));
      if (ratings.length) {
        try {
          await supabase.from('position_ratings').delete().eq('session_id', session.id);
          await supabase.from('position_ratings').insert(ratings);
        }
        catch (e) { console.warn('position_ratings:', e?.message || e); }
      } else if (isEditing) {
        // If no ratings are selected anymore on edit, clear them from DB
        try { await supabase.from('position_ratings').delete().eq('session_id', session.id); }
        catch (e) { console.warn('position_ratings delete:', e?.message || e); }
      }
    }

    closeSessionSheet();
    await renderRecentSessions(st);
    notifySessionSaved();

    // Ouvrir le feedback post-séance pour les nouvelles sessions, pré-rempli avec l'orgasme déclaré
    if (!isEditing && session?.id) {
      setTimeout(() => openFeedbackSheet(session.id, st, myOrgasms, date), 350);
    }

  } catch (e) {
    showError('session-error', 'Impossible d\'enregistrer. Vérifiez votre connexion et réessayez.');
    console.error('saveFullSession:', e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Enregistrer'; }
    currentEditingSession = null;
  }
}

// ─── Fast-Track (4-5 taps) ─────────────────────────────────────────────────

export function openFastTrack(st) {
  openFastTrackFlow(st, {
    closeSessionSheet,
    supabase,
    localDateStr,
    syncSessionToDailyLog,
    renderRecentSessions,
    notifySessionSaved,
    showError,
  });
}

// ─── Feedback post-séance ──────────────────────────────────────────────────

export function openFeedbackSheet(sessionId, st, prefilledOrgasms = 0, sessionDate = null) {
  openFeedbackFlow(sessionId, st, prefilledOrgasms, sessionDate, {
    localDateStr,
    supabase,
    syncSessionToDailyLog,
    notifySessionSaved,
  });
}

export function closeFeedbackSheet() {
  closeFeedbackFlow();
}

// ─── Init du sheet ────────────────────────────────────────────────────────

export function initSessionSheetListeners() {
  // Sélection unique : mood, ft-mood (les lieux sont gérés dans renderLocations).
  ['mood-btn', 'ft-mood-btn'].forEach(cls => {
    document.querySelectorAll(`.${cls}`).forEach(b =>
      b.addEventListener('click', () => {
        document.querySelectorAll(`.${cls}`).forEach(x => x.classList.remove('sel'));
        b.classList.add('sel');
      })
    );
  });

  // Multi-select : activity tags
  document.querySelectorAll('.act-tag-btn').forEach(b =>
    b.addEventListener('click', () => b.classList.toggle('sel'))
  );

  // Satisfaction : fb + ft
  document.querySelectorAll('.fb-sat-btn, .ft-sat-btn').forEach(b =>
    b.addEventListener('click', () => {
      const cls = b.classList.contains('fb-sat-btn') ? '.fb-sat-btn' : '.ft-sat-btn';
      document.querySelectorAll(cls).forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
    })
  );

  // Préliminaires : toggle → afficher/masquer le détail
  document.getElementById('session-prelim-toggle')?.addEventListener('change', (e) => {
    const details = document.getElementById('prelim-details');
    if (!details) return;
    if (e.target.checked) {
      details.classList.add('open');
      details.setAttribute('aria-hidden', 'false');
    } else {
      details.classList.remove('open');
      details.setAttribute('aria-hidden', 'true');
      // Réinitialiser si on décoche
      document.getElementById('session-prelim-duration').value = '';
      document.querySelectorAll('.prelim-chip').forEach(c => c.classList.remove('sel'));
    }
  });

  // Préliminaires : intensité (sélection unique)
  document.querySelectorAll('.prelim-chip').forEach(b =>
    b.addEventListener('click', () => {
      document.querySelectorAll('.prelim-chip').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
    })
  );

  // Orgasmes : sliders 0-10, met à jour l'affichage de la valeur
  document.querySelectorAll('.orgasm-range').forEach(r => {
    const valEl = document.getElementById(r.id.replace('range', 'val'));
    r.addEventListener('input', () => { if (valEl) valEl.textContent = r.value; });
  });

  // Moment solo : toggle -> adapter l'affichage du wizard
  document.getElementById('session-solo')?.addEventListener('change', (e) => {
    const sheet = document.getElementById('session-sheet');
    if (sheet) {
      sheet.classList.toggle('is-solo', e.target.checked);
    }
  });

}
