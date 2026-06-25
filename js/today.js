import { supabase } from './supabase.js';
import { getMyMembership, getPartnerMembership } from './pairing.js';
import { signOut } from './auth.js';
import { navigate } from './router.js';
import {
  getCurrentCycle, getCycleHistory, startPeriod, endPeriod,
  predictNextPeriod, getEnergyByCycleDay, getPartnerEnergyByCycleDay, interpolate,
} from './cycles.js';
import { subscribeToEvents, subscribeToPartnerLogs } from './realtime.js';
import { maybeRemindToLog, checkPartnerLoggedToday, showNotification } from './notifications.js';

const PHASES = [
  [1, 5,  'Menstruelle'],
  [6, 13, 'Folliculaire'],
  [14, 16,'Ovulation'],
  [17, 35,'Lutéale'],
];
const PHASE_FILL = {
  Menstruelle:  'rgba(229,57,53,.07)',
  Folliculaire: 'rgba(66,120,196,.05)',
  Ovulation:    'rgba(124,92,252,.09)',
  Lutéale:      'rgba(232,67,117,.06)',
};
const PHASE_TIPS = {
  Menstruelle:  'Elle est en phase menstruelle. Le repos et la chaleur font souvent du bien — un moment calme peut être apprécié.',
  Folliculaire: 'L\'énergie remonte progressivement. Une bonne période pour des sorties et des projets communs.',
  Ovulation:    'Pic d\'énergie et de vitalité ces jours-ci. Profitez-en pour partager des activités qui vous tiennent à cœur.',
  Lutéale:      'Énergie souvent en baisse, sensibilité en hausse ces jours-ci — une soirée tranquille tombe souvent juste.',
};
const METRICS = {
  elle: [
    { id: 'mood',     label: 'Humeur',  type: 'enum',    opts: ['😣','😔','😐','🙂','😊'] },
    { id: 'energy',   label: 'Énergie', type: 'scale' },
    { id: 'flow',     label: 'Flux',    type: 'enum',    opts: ['·','◦','●','◆'] },
    { id: 'cramps',   label: 'Crampes', type: 'scale' },
    { id: 'libido',   label: 'Libido',  type: 'scale' },
    { id: 'sleep',    label: 'Sommeil', type: 'scale' },
  ],
  lui: [
    { id: 'mood',     label: 'Humeur',  type: 'enum',    opts: ['😣','😔','😐','🙂','😊'] },
    { id: 'energy',   label: 'Énergie', type: 'scale' },
    { id: 'stress',   label: 'Stress',  type: 'scale' },
    { id: 'libido',   label: 'Libido',  type: 'scale' },
    { id: 'sleep',    label: 'Sommeil', type: 'scale' },
    { id: 'exercise', label: 'Sport',   type: 'boolean', opts: ['—', '✓'] },
  ],
};
const EVENT_ICONS  = { intimacy: '❤️', conflict: '💬', date_night: '🌙', other: '✨' };
const EVENT_LABELS = { intimacy: 'Intimité', conflict: 'Tension', date_night: 'Soirée', other: 'Moment' };
const CYCLE_LEN = 28;

let state = {
  me: null, partner: null,
  cur: 'elle',
  currentCycle: null,
  cycleDay: null, phaseName: null,
  savedValues: {},
  coupleId: null,
  prediction: null,
};

export async function initToday() {
  const el = document.getElementById('today-date');
  if (el) el.textContent = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  [state.me] = await Promise.all([getMyMembership()]);
  if (state.me) {
    state.coupleId = state.me.couple_id;
    state.partner = await getPartnerMembership(state.me.couple_id);
  }

  state.cur = state.me?.tracks_cycle ? 'elle' : 'lui';
  document.body.dataset.cur = state.cur;

  // Charger cycle + historique + entrées en parallèle
  const [cycle, history] = await Promise.all([
    getCurrentCycle(),
    getCycleHistory(),
  ]);
  state.currentCycle = cycle;

  if (cycle) {
    const diff = Math.floor((Date.now() - new Date(cycle.period_start)) / 864e5);
    state.cycleDay = diff + 1;
    state.phaseName = getPhase(state.cycleDay);
  }

  state.prediction = predictNextPeriod(history);

  await loadTodayEntries();

  renderHeader();
  renderCycleControls();
  renderWhoToggle();
  await renderChart();
  renderMetrics();
  renderInsight();
  renderTip();
  renderPrediction();
  await renderEvents();

  // Realtime : rafraîchir les moments en temps réel
  if (state.coupleId) {
    subscribeToEvents(state.coupleId, () => renderEvents());
    subscribeToPartnerLogs(state.coupleId, () => {
      showToast('Ton partenaire vient de saisir sa journée.');
      showNotification('Notre rythme', 'Ton partenaire a saisi sa journée.');
    });
  }

  // Rappel quotidien (>= 19h, si pas encore saisi)
  maybeRemindToLog();

  // Toast si partenaire a déjà saisi aujourd'hui
  if (state.partner) {
    checkPartnerLoggedToday(state.partner.user_id).then(has => {
      if (has) showToast(`${state.partner.display_name} a déjà saisi aujourd'hui.`);
    });
  }
}

function getPhase(day) {
  return (PHASES.find(([a, b]) => day >= a && day <= b) || PHASES[PHASES.length - 1])[2];
}

async function loadTodayEntries() {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('log_entries').select('category_id, value').eq('log_date', today);
  state.savedValues = {};
  (data || []).forEach(r => { state.savedValues[r.category_id] = r.value; });
}

// --- Header ----------------------------------------------------------------
function renderHeader() {
  const eyebrow   = document.getElementById('eyebrow');
  const phaseName = document.getElementById('phase-name');
  if (state.cycleDay && state.phaseName) {
    if (eyebrow)   eyebrow.textContent   = `Jour ${state.cycleDay} · ${state.phaseName}`;
    if (phaseName) phaseName.textContent = state.phaseName;
  } else {
    if (eyebrow)   eyebrow.textContent   = 'Pas de cycle en cours';
    if (phaseName) phaseName.textContent = 'Notre rythme';
  }
}

// --- Cycle controls (elle uniquement) --------------------------------------
function renderCycleControls() {
  const wrap = document.getElementById('cycle-controls');
  if (!wrap) return;

  const elleIsMe = state.me?.tracks_cycle;
  if (!elleIsMe) { wrap.style.display = 'none'; return; }

  wrap.style.display = 'block';
  const btn = document.getElementById('btn-cycle-toggle');
  if (!btn) return;

  const hasOpenCycle = state.currentCycle && !state.currentCycle.period_end;

  if (hasOpenCycle) {
    btn.textContent = 'Mes règles se terminent';
    btn.dataset.action = 'end';
    btn.className = 'btn-secondary';
  } else {
    btn.textContent = 'Mes règles commencent';
    btn.dataset.action = 'start';
    btn.className = 'btn-primary';
  }

  btn.onclick = async () => {
    btn.disabled = true;
    try {
      if (btn.dataset.action === 'start') {
        state.currentCycle = await startPeriod();
        state.cycleDay = 1;
        state.phaseName = 'Menstruelle';
      } else {
        await endPeriod(state.currentCycle.id);
        state.currentCycle = { ...state.currentCycle, period_end: new Date().toISOString().split('T')[0] };
      }
      renderHeader();
      renderCycleControls();
      renderTip();
      await renderChart();
    } catch (e) {
      console.error(e);
    } finally {
      btn.disabled = false;
    }
  };
}

// --- Who toggle ------------------------------------------------------------
function renderWhoToggle() {
  document.getElementById('who-toggle')?.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => switchPerson(btn.dataset.p));
    btn.classList.toggle('on', btn.dataset.p === state.cur);
  });
}

function switchPerson(p) {
  state.cur = p;
  document.body.dataset.cur = p;
  document.getElementById('who-toggle')?.querySelectorAll('button')
    .forEach(btn => btn.classList.toggle('on', btn.dataset.p === p));
  const logTitle = document.getElementById('log-title');
  if (logTitle) logTitle.textContent = `Aujourd'hui — ${p === 'elle' ? 'Elle' : 'Lui'}`;
  renderMetrics();
  renderInsight();
  const tip = document.getElementById('tip-card');
  if (tip) tip.style.display = p === 'lui' ? 'block' : 'none';
}

// --- Chart (vraies données) ------------------------------------------------
async function renderChart() {
  const cycleStart = state.currentCycle?.period_start;
  const totalDays  = CYCLE_LEN;
  const todayIdx   = state.cycleDay ? Math.min(state.cycleDay - 1, totalDays - 1) : null;

  let elleArr, luiArr;

  if (cycleStart && state.me?.user_id) {
    // Charger les énergies des deux en parallèle
    const myEnergyProm = getEnergyByCycleDay(state.me.user_id, cycleStart, totalDays);
    const partnerEnergyProm = state.partner
      ? getPartnerEnergyByCycleDay(state.partner.user_id, cycleStart, totalDays)
      : Promise.resolve(new Array(totalDays).fill(null));

    const [myEnergy, partnerEnergy] = await Promise.all([myEnergyProm, partnerEnergyProm]);

    const elleIsMe = state.me?.tracks_cycle;
    elleArr = interpolate(elleIsMe ? myEnergy : partnerEnergy);
    luiArr  = interpolate(elleIsMe ? partnerEnergy : myEnergy);
  } else {
    // Pas de cycle — courbe plate à 0.5
    elleArr = new Array(totalDays).fill(0.5);
    luiArr  = new Array(totalDays).fill(0.5);
  }

  drawChart(elleArr, luiArr, totalDays, todayIdx);
}

function drawChart(elleData, luiData, totalDays, todayIdx) {
  const svg = document.getElementById('chart');
  if (!svg) return;
  const W = 340, H = 148, PAD = 6;
  const xP = i => PAD + (i / (totalDays - 1)) * (W - PAD * 2);
  const yP = v => H - PAD - v * (H - PAD * 2 - 10) - 5;

  function smooth(d) {
    let p = `M ${xP(0)} ${yP(d[0])}`;
    for (let i = 0; i < d.length - 1; i++) {
      const cx = (xP(i) + xP(i + 1)) / 2;
      p += ` C ${cx} ${yP(d[i])}, ${cx} ${yP(d[i + 1])}, ${xP(i + 1)} ${yP(d[i + 1])}`;
    }
    return p;
  }

  let s = '';
  PHASES.forEach(([a, b, l]) => {
    const xa = xP(Math.min(a - 1, totalDays - 1));
    const xb = xP(Math.min(b - 1, totalDays - 1));
    s += `<rect x="${xa}" y="0" width="${Math.max(0, xb - xa)}" height="${H}" fill="${PHASE_FILL[l]}"/>`;
  });

  if (todayIdx != null) {
    const tx = xP(todayIdx);
    s += `<line x1="${tx}" y1="4" x2="${tx}" y2="${H-4}" stroke="#E84375" stroke-width="1.5" stroke-dasharray="3 3" opacity=".4"/>`;
  }

  s += `<path d="${smooth(luiData)}"  fill="none" stroke="#4278C4" stroke-width="2"   opacity=".85"/>`;
  s += `<path d="${smooth(elleData)}" fill="none" stroke="#E84375" stroke-width="2.5"/>`;

  if (todayIdx != null) {
    s += `<circle cx="${xP(todayIdx)}" cy="${yP(elleData[todayIdx])}" r="4" fill="#E84375"/>`;
    s += `<circle cx="${xP(todayIdx)}" cy="${yP(luiData[todayIdx])}"  r="3.5" fill="#4278C4"/>`;
  }
  svg.innerHTML = s;
}

// --- Metrics ---------------------------------------------------------------
function renderMetrics() {
  const wrap = document.getElementById('metrics');
  if (!wrap) return;
  wrap.innerHTML = '';

  METRICS[state.cur].forEach((m, mi) => {
    const savedRaw = state.savedValues[m.id];
    const savedV   = savedRaw != null
      ? (typeof savedRaw === 'object' ? savedRaw.v : savedRaw)
      : null;
    const display  = savedV != null
      ? (m.type === 'enum' || m.type === 'boolean' ? (m.opts[savedV] ?? savedV) : savedV)
      : '—';

    let chips = '';
    if (m.type === 'enum' || m.type === 'boolean') {
      m.opts.forEach((o, i) =>
        chips += `<div class="chip${String(savedV) === String(i) ? ' sel' : ''}" data-m="${mi}" data-id="${m.id}" data-v="${i}">${o}</div>`
      );
    } else {
      for (let i = 1; i <= 5; i++)
        chips += `<div class="chip scalechip${String(savedV) === String(i) ? ' sel' : ''}" data-m="${mi}" data-id="${m.id}" data-v="${i}">${i}</div>`;
    }

    const el = document.createElement('div');
    el.className = 'metric';
    el.innerHTML = `
      <div class="ml"><span class="name">${m.label}</span><span class="val" id="val-${m.id}">${display}</span></div>
      <div class="chips">${chips}</div>`;
    wrap.appendChild(el);
  });

  wrap.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', async () => {
      chip.closest('.chips').querySelectorAll('.chip').forEach(c => c.classList.remove('sel'));
      chip.classList.add('sel');
      const catId = chip.dataset.id;
      const val   = chip.dataset.v;
      const m     = METRICS[state.cur].find(x => x.id === catId);
      const label = (m?.type === 'enum' || m?.type === 'boolean')
        ? (m.opts[val] ?? val)
        : val;
      document.getElementById(`val-${catId}`).textContent = label;

      // Si c'est l'énergie, rafraîchir le chart après sauvegarde
      const isEnergy = catId === 'energy';
      await saveEntry(catId, val);
      state.savedValues[catId] = { v: val };
      if (isEnergy) await renderChart();
    });
  });
}

async function saveEntry(categoryId, value) {
  const today = new Date().toISOString().split('T')[0];
  const { error } = await supabase.from('log_entries').upsert(
    { log_date: today, category_id: categoryId, value: { v: value }, shared: true },
    { onConflict: 'user_id,log_date,category_id' }
  );
  if (error) console.error('saveEntry:', error.message);
}

// --- Insight ---------------------------------------------------------------
const INSIGHTS_ELLE = {
  Menstruelle:  'Phase menstruelle — énergie souvent <em>basse</em>, le corps se régénère.',
  Folliculaire: 'Énergie en <em>montée</em> — bonne période pour de nouveaux projets.',
  Ovulation:    'Pic d\'énergie et de <em>vitalité</em> — moment fort du cycle.',
  Lutéale:      'Énergie qui redescend, <em>sensibilité</em> plus présente ces jours-ci.',
};
const INSIGHTS_LUI = {
  Menstruelle:  'Ton énergie tend à être <em class="s">stable</em> pendant sa phase menstruelle.',
  Folliculaire: 'Vos énergies remontent ensemble — <em class="s">synchronie</em> de début de cycle.',
  Ovulation:    'Période de haute <em class="s">énergie</em> pour tous les deux souvent.',
  Lutéale:      'Ton <em class="s">énergie</em> tend à baisser avec la sienne — phase lutéale.',
};

function renderInsight() {
  const body = document.getElementById('insight-body');
  const meta = document.getElementById('insight-meta');
  if (!body) return;
  const phase = state.phaseName || 'Lutéale';
  body.innerHTML = state.cur === 'elle' ? (INSIGHTS_ELLE[phase] || '') : (INSIGHTS_LUI[phase] || '');
  if (meta && state.prediction) {
    meta.textContent = `Basé sur ${state.prediction.cyclesUsed} cycles · cycle moyen ${state.prediction.avgCycleLength} j`;
  }
}

function renderTip() {
  const card = document.getElementById('tip-card');
  const txt  = document.getElementById('tip-text');
  if (!card) return;
  card.style.display = state.cur === 'lui' ? 'block' : 'none';
  if (txt) txt.textContent = PHASE_TIPS[state.phaseName || 'Lutéale'];
}

// --- Prédiction ------------------------------------------------------------
function renderPrediction() {
  const card = document.getElementById('prediction-card');
  if (!card) return;

  const p = state.prediction;
  const history = p?.cyclesUsed;

  if (!p || !history || history < 2) {
    card.style.display = 'none';
    return;
  }

  card.style.display = 'block';
  const nextDate = new Date(p.nextPeriodDate);
  const oDate    = new Date(p.ovulationDate);
  const today    = new Date();
  const daysUntil = Math.round((nextDate - today) / 864e5);

  const fmt = d => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  document.getElementById('pred-next').textContent =
    daysUntil > 0 ? `dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}` :
    daysUntil === 0 ? "aujourd'hui" : `il y a ${-daysUntil} j`;
  document.getElementById('pred-next-date').textContent = fmt(nextDate);
  document.getElementById('pred-ovulation').textContent = fmt(oDate);
  document.getElementById('pred-avg').textContent = `${p.avgCycleLength} j`;
}

// --- Toast in-app ----------------------------------------------------------
function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._hide);
  t._hide = setTimeout(() => t.classList.remove('show'), 3200);
}

// --- Events ----------------------------------------------------------------
const REACTION_EMOJIS = ['❤️', '✨', '😊', '💪'];

async function renderEvents() {
  const wrap = document.getElementById('events-list');
  if (!wrap || !state.coupleId) return;

  const { data } = await supabase
    .from('couple_events')
    .select('*')
    .eq('couple_id', state.coupleId)
    .order('event_date', { ascending: false })
    .limit(7);

  wrap.innerHTML = '';
  (data || []).forEach(ev => {
    const diff = Math.round((Date.now() - new Date(ev.event_date)) / 864e5);
    const when = diff === 0 ? "Aujourd'hui" : diff === 1 ? 'Hier' : `Il y a ${diff} jours`;

    // Réactions : { userId: emoji }
    const reactions = ev.reactions || {};
    const myReaction = reactions[state.me?.user_id];
    const allReactions = Object.values(reactions);
    const reactionSummary = [...new Set(allReactions)].map(e => {
      const count = allReactions.filter(x => x === e).length;
      return `<span class="ev-reaction${e === myReaction ? ' mine' : ''}">${e}${count > 1 ? ` ${count}` : ''}</span>`;
    }).join('');

    const div = document.createElement('div');
    div.className = 'ev';
    div.dataset.id = ev.id;
    div.innerHTML = `
      <div class="ico">${EVENT_ICONS[ev.event_type] || '✨'}</div>
      <div class="ev-body">
        <div class="et">${ev.note || EVENT_LABELS[ev.event_type] || ev.event_type}</div>
        <div class="ed">${when}</div>
        ${reactionSummary ? `<div class="ev-reactions">${reactionSummary}</div>` : ''}
      </div>
      <button class="ev-react-btn" data-id="${ev.id}" aria-label="Réagir">
        ${myReaction || '🫶'}
      </button>`;
    wrap.appendChild(div);
  });

  // Listeners réactions
  wrap.querySelectorAll('.ev-react-btn').forEach(btn => {
    btn.addEventListener('click', () => openReactionPicker(btn.dataset.id, btn));
  });

  document.getElementById('btn-addev')?.addEventListener('click', openEventSheet);
}

function openReactionPicker(eventId, anchorBtn) {
  // Fermer tout picker existant
  document.querySelectorAll('.reaction-picker').forEach(p => p.remove());

  const picker = document.createElement('div');
  picker.className = 'reaction-picker';
  picker.innerHTML = REACTION_EMOJIS.map(e =>
    `<button class="reaction-opt" data-emoji="${e}">${e}</button>`
  ).join('');
  anchorBtn.insertAdjacentElement('afterend', picker);

  picker.querySelectorAll('.reaction-opt').forEach(btn => {
    btn.addEventListener('click', async () => {
      picker.remove();
      await likeEvent(eventId, btn.dataset.emoji);
    });
  });

  // Fermer au clic extérieur
  const close = e => { if (!picker.contains(e.target) && e.target !== anchorBtn) { picker.remove(); document.removeEventListener('click', close, true); } };
  setTimeout(() => document.addEventListener('click', close, true), 10);
}

async function likeEvent(eventId, emoji) {
  const userId = state.me?.user_id;
  if (!userId) return;

  // Lire la réaction actuelle
  const { data: ev } = await supabase
    .from('couple_events').select('reactions').eq('id', eventId).single();
  const current = ev?.reactions || {};

  // Toggle : même emoji → retirer, sinon → mettre le nouveau
  const newReactions = { ...current };
  if (current[userId] === emoji) {
    delete newReactions[userId];
  } else {
    newReactions[userId] = emoji;
  }

  await supabase.from('couple_events')
    .update({ reactions: newReactions }).eq('id', eventId);
  // Le realtime channel va déclencher renderEvents()
}

function openEventSheet() {
  const sheet = document.getElementById('event-sheet');
  if (!sheet) return;
  sheet.classList.add('open');
  document.getElementById('event-note').value = '';
  document.querySelectorAll('.ev-type-btn').forEach(b => b.classList.remove('sel'));

  document.getElementById('btn-sheet-cancel')?.addEventListener('click', closeEventSheet, { once: true });
  document.getElementById('btn-sheet-save')?.addEventListener('click', saveEvent, { once: true });
  document.querySelectorAll('.ev-type-btn').forEach(b =>
    b.addEventListener('click', () => {
      document.querySelectorAll('.ev-type-btn').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
    })
  );
}

function closeEventSheet() {
  document.getElementById('event-sheet')?.classList.remove('open');
}

async function saveEvent() {
  const typeBtn = document.querySelector('.ev-type-btn.sel');
  const type = typeBtn?.dataset.type || 'other';
  const note = document.getElementById('event-note')?.value.trim() || null;
  const today = new Date().toISOString().split('T')[0];
  await supabase.from('couple_events').insert({
    couple_id: state.coupleId, event_date: today, event_type: type, note,
    created_by: state.me?.user_id,
    reactions: {},
  });
  closeEventSheet();
  await renderEvents();
}
