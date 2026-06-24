import { supabase } from './supabase.js';
import { getMyMembership, getPartnerMembership } from './pairing.js';
import { signOut } from './auth.js';
import { navigate } from './router.js';

// Phase du cycle (jours 1-indexés)
const PHASES = [
  [1, 5, 'Menstruelle'],
  [6, 13, 'Folliculaire'],
  [14, 16, 'Ovulation'],
  [17, 28, 'Lutéale'],
];
const PHASE_FILL = {
  Menstruelle:  'rgba(201,138,106,.07)',
  Folliculaire: 'rgba(217,179,106,.05)',
  Ovulation:    'rgba(217,179,106,.10)',
  Lutéale:      'rgba(147,169,143,.06)',
};
const PHASE_TIPS = {
  Menstruelle:  'Elle est en phase menstruelle. Le repos et la chaleur font souvent du bien. Un moment calme ensemble peut être apprécié.',
  Folliculaire: 'L\'énergie remonte progressivement. C\'est souvent une bonne période pour des sorties et des projets communs.',
  Ovulation:    'Pic d\'énergie et de vitalité ces jours-ci. Profitez-en pour partager des activités qui vous tiennent à cœur.',
  Lutéale:      'Énergie souvent en baisse et sensibilité en hausse ces jours-ci — une soirée tranquille tombe souvent juste.',
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

const EVENT_ICONS = { intimacy: '❤️', conflict: '💬', date_night: '🌙', other: '✨' };
const EVENT_LABELS = { intimacy: 'Intimité', conflict: 'Tension', date_night: 'Soirée', other: 'Moment' };

let state = {
  me: null,
  partner: null,
  cur: 'elle',         // 'elle' | 'lui'
  cycleDay: null,
  phaseName: null,
  savedValues: {},     // { categoryId: value }
  coupleId: null,
};

export async function initToday() {
  // Date du jour
  const d = new Date();
  const el = document.getElementById('today-date');
  if (el) el.textContent = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  // Charger données membres
  state.me = await getMyMembership();
  if (state.me) {
    state.coupleId = state.me.couple_id;
    state.partner = await getPartnerMembership(state.me.couple_id);
  }

  // Déterminer qui est "elle" (celle qui tracks_cycle)
  const elleIsMe = state.me?.tracks_cycle;
  state.cur = elleIsMe ? 'elle' : 'lui';
  document.body.dataset.cur = state.cur;

  // Charger les données du cycle courant pour calculer le jour
  await loadCycleDay();

  // Charger les entrées du jour
  await loadTodayEntries();

  // Rendre les widgets
  renderHeader();
  renderWhoToggle();
  renderChart();
  renderMetrics();
  renderInsight();
  renderTip();
  await renderEvents();

  // Déconnexion depuis cette vue (bouton dans le header)
  const btnOut = document.getElementById('btn-signout');
  if (btnOut) {
    btnOut.addEventListener('click', async () => {
      await signOut();
      navigate('auth');
    });
  }
}

async function loadCycleDay() {
  // Cherche le cycle en cours (period_start <= today, period_end null ou >= today)
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('cycles')
    .select('*')
    .lte('period_start', today)
    .order('period_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data) {
    const start = new Date(data.period_start);
    const diff = Math.floor((new Date() - start) / (1000 * 60 * 60 * 24));
    state.cycleDay = diff + 1;
    state.phaseName = getPhase(state.cycleDay);
  } else {
    state.cycleDay = null;
    state.phaseName = null;
  }
}

function getPhase(day) {
  const phase = PHASES.find(([a, b]) => day >= a && day <= b);
  return phase ? phase[2] : 'Lutéale';
}

async function loadTodayEntries() {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('log_entries')
    .select('category_id, value')
    .eq('log_date', today);

  state.savedValues = {};
  (data || []).forEach(row => { state.savedValues[row.category_id] = row.value; });
}

function renderHeader() {
  const eyebrow = document.getElementById('eyebrow');
  const phaseName = document.getElementById('phase-name');
  if (state.cycleDay && state.phaseName) {
    if (eyebrow) eyebrow.textContent = `Jour ${state.cycleDay} · ${state.phaseName}`;
    if (phaseName) phaseName.textContent = state.phaseName;
  } else {
    if (eyebrow) eyebrow.textContent = 'Aucun cycle en cours';
    if (phaseName) phaseName.textContent = 'Notre rythme';
  }
}

function renderWhoToggle() {
  const who = document.getElementById('who-toggle');
  if (!who) return;

  who.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => switchPerson(btn.dataset.p));
    btn.classList.toggle('on', btn.dataset.p === state.cur);
  });
}

function switchPerson(p) {
  state.cur = p;
  document.body.dataset.cur = p;
  document.getElementById('who-toggle').querySelectorAll('button')
    .forEach(btn => btn.classList.toggle('on', btn.dataset.p === p));
  document.getElementById('log-title').textContent = `Aujourd'hui — ${p === 'elle' ? 'Elle' : 'Lui'}`;
  renderMetrics();
  renderInsight();
  const tipCard = document.getElementById('tip-card');
  if (tipCard) tipCard.style.display = p === 'lui' ? 'block' : 'none';
}

// --- Chart -----------------------------------------------------------------

function drawChart(elleData, luiData, totalDays, todayIdx) {
  const svg = document.getElementById('chart');
  if (!svg) return;
  const W = 340, H = 148, PAD = 6;

  const xPos = i => PAD + (i / (totalDays - 1)) * (W - PAD * 2);
  const yPos = v => H - PAD - v * (H - PAD * 2 - 10) - 5;

  function smoothPath(d) {
    let p = `M ${xPos(0)} ${yPos(d[0])}`;
    for (let i = 0; i < d.length - 1; i++) {
      const x0 = xPos(i), y0 = yPos(d[i]), x1 = xPos(i + 1), y1 = yPos(d[i + 1]);
      const cx = (x0 + x1) / 2;
      p += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
    }
    return p;
  }

  let s = '';
  PHASES.forEach(([a, b, l]) => {
    const xa = xPos(Math.min(a - 1, totalDays - 1));
    const xb = xPos(Math.min(b - 1, totalDays - 1));
    s += `<rect x="${xa}" y="0" width="${xb - xa}" height="${H}" fill="${PHASE_FILL[l]}"/>`;
  });

  if (todayIdx != null) {
    const tx = xPos(todayIdx);
    s += `<line x1="${tx}" y1="4" x2="${tx}" y2="${H - 4}" stroke="#D9B36A" stroke-width="1" stroke-dasharray="2 3" opacity=".5"/>`;
  }

  if (luiData?.length) s += `<path d="${smoothPath(luiData)}" fill="none" stroke="#93A98F" stroke-width="2" opacity=".9"/>`;
  if (elleData?.length) s += `<path d="${smoothPath(elleData)}" fill="none" stroke="#D9B36A" stroke-width="2.2"/>`;

  if (todayIdx != null) {
    if (elleData?.length) s += `<circle cx="${xPos(todayIdx)}" cy="${yPos(elleData[todayIdx])}" r="3.4" fill="#D9B36A"/>`;
    if (luiData?.length)  s += `<circle cx="${xPos(todayIdx)}" cy="${yPos(luiData[todayIdx])}"  r="3.4" fill="#93A98F"/>`;
  }

  svg.innerHTML = s;
}

async function renderChart() {
  // Pour l'instant, données de démo jusqu'à connexion des vraies entrées (étape 4)
  const DAYS = 28;
  const elle = [.15,.12,.2,.3,.42,.55,.66,.74,.8,.86,.9,.94,.97,1,.95,.82,.62,.5,.46,.44,.4,.36,.3,.26,.24,.2,.18,.16];
  const lui  = [.5,.55,.6,.58,.62,.66,.7,.68,.72,.75,.7,.74,.78,.76,.72,.66,.55,.46,.4,.38,.42,.45,.5,.54,.58,.6,.62,.6];
  const todayIdx = state.cycleDay ? Math.min(state.cycleDay - 1, DAYS - 1) : null;
  drawChart(elle, lui, DAYS, todayIdx);
}

// --- Metrics ---------------------------------------------------------------

function renderMetrics() {
  const wrap = document.getElementById('metrics');
  if (!wrap) return;
  wrap.innerHTML = '';

  const def = METRICS[state.cur] || [];
  def.forEach((m, mi) => {
    const saved = state.savedValues[m.id];
    const displayVal = saved != null ? (typeof saved === 'object' ? JSON.stringify(saved) : saved) : '—';
    const el = document.createElement('div');
    el.className = 'metric';

    let chips = '';
    if (m.type === 'enum' || m.type === 'boolean') {
      (m.opts || []).forEach((o, i) =>
        chips += `<div class="chip" data-m="${mi}" data-id="${m.id}" data-v="${i}">${o}</div>`
      );
    } else {
      for (let i = 1; i <= 5; i++)
        chips += `<div class="chip scalechip" data-m="${mi}" data-id="${m.id}" data-v="${i}">${i}</div>`;
    }

    el.innerHTML = `
      <div class="ml">
        <span class="name">${m.label}</span>
        <span class="val" id="val-${m.id}">${displayVal}</span>
      </div>
      <div class="chips">${chips}</div>`;
    wrap.appendChild(el);
  });

  // Restaurer les sélections sauvegardées
  wrap.querySelectorAll('.chip').forEach(chip => {
    const id = chip.dataset.id;
    if (state.savedValues[id] !== undefined) {
      const savedRaw = state.savedValues[id];
      const saved = typeof savedRaw === 'object' && savedRaw !== null
        ? savedRaw.v ?? savedRaw
        : savedRaw;
      if (String(chip.dataset.v) === String(saved)) chip.classList.add('sel');
    }

    chip.addEventListener('click', async () => {
      chip.closest('.chips').querySelectorAll('.chip').forEach(c => c.classList.remove('sel'));
      chip.classList.add('sel');
      const val = chip.dataset.v;
      document.getElementById(`val-${chip.dataset.id}`).textContent = chip.textContent.trim();
      await saveEntry(chip.dataset.id, val);
      state.savedValues[chip.dataset.id] = val;
    });
  });
}

async function saveEntry(categoryId, value) {
  const today = new Date().toISOString().split('T')[0];
  const { error } = await supabase.from('log_entries').upsert({
    log_date: today,
    category_id: categoryId,
    value: { v: value },
    shared: true,
  }, { onConflict: 'user_id,log_date,category_id' });
  if (error) console.error('saveEntry:', error.message);
}

// --- Insight ---------------------------------------------------------------

const INSIGHTS = {
  elle: 'Ton énergie culmine à l\'<em>ovulation</em>, autour du jour 14 — pic du cycle.',
  lui:  'Ton <em class="s">énergie</em> tend à baisser pendant sa phase <em>lutéale</em> (jours 17–28).',
};

function renderInsight() {
  const body = document.getElementById('insight-body');
  if (body) body.innerHTML = INSIGHTS[state.cur] || '';
}

function renderTip() {
  const card = document.getElementById('tip-card');
  const txt = document.getElementById('tip-text');
  if (!card) return;
  card.style.display = state.cur === 'lui' ? 'block' : 'none';
  if (txt && state.phaseName) txt.textContent = PHASE_TIPS[state.phaseName] || PHASE_TIPS.Lutéale;
}

// --- Events ----------------------------------------------------------------

async function renderEvents() {
  const wrap = document.getElementById('events-list');
  if (!wrap || !state.coupleId) return;

  const { data } = await supabase
    .from('couple_events')
    .select('*')
    .eq('couple_id', state.coupleId)
    .order('event_date', { ascending: false })
    .limit(5);

  wrap.innerHTML = '';
  (data || []).forEach(ev => {
    const d = new Date(ev.event_date);
    const diff = Math.round((new Date() - d) / (1000 * 60 * 60 * 24));
    const when = diff === 0 ? "Aujourd'hui" : diff === 1 ? 'Hier' : `Il y a ${diff} jours`;
    const div = document.createElement('div');
    div.className = 'ev';
    div.innerHTML = `
      <div class="ico">${EVENT_ICONS[ev.event_type] || '✨'}</div>
      <div>
        <div class="et">${ev.note || EVENT_LABELS[ev.event_type] || ev.event_type}</div>
        <div class="ed">${when}</div>
      </div>`;
    wrap.appendChild(div);
  });

  document.getElementById('btn-addev')?.addEventListener('click', () => openAddEvent());
}

async function openAddEvent() {
  const type = prompt('Type de moment :\n1. intimacy\n2. conflict\n3. date_night\n4. other\n\nEntrer le numéro :');
  const types = ['intimacy', 'conflict', 'date_night', 'other'];
  const chosen = types[(parseInt(type) - 1)] || 'other';
  const note = prompt('Note (optionnel) :');
  const today = new Date().toISOString().split('T')[0];
  await supabase.from('couple_events').insert({
    couple_id: state.coupleId,
    event_date: today,
    event_type: chosen,
    note: note || null,
  });
  await renderEvents();
}
