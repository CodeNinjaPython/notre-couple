export function getPhaseFromDay(day, phasesData) {
  const phaseEntry = Object.entries(phasesData).find(([, data]) => day >= data.range[0] && day <= data.range[1]);
  return phaseEntry ? phaseEntry[0] : 'Lutéale';
}

function renderPregnancyProgress(container, { diffDays, localDateStr }) {
  const dpa = localStorage.getItem('nc-dpa-date');
  let weeks = null;
  let tri = null;
  let pct = 0;
  let remaining = null;

  if (dpa) {
    const daysToDue = diffDays(dpa, localDateStr());
    const elapsed = 280 - daysToDue;
    weeks = Math.max(0, Math.floor(elapsed / 7));
    remaining = Math.max(0, 40 - weeks);
    pct = Math.min(100, Math.max(0, Math.round(elapsed / 280 * 100)));
    tri = weeks < 13 ? 1 : weeks < 27 ? 2 : 3;
  }

  container.innerHTML = `
    <div class="preg-ring" style="--p:${pct}%" role="img"
      aria-label="${weeks != null ? `Semaine ${weeks} de grossesse` : 'Grossesse'}">
      <div class="preg-ring-inner">
        <div class="preg-week">${weeks != null ? 'S' + weeks : '🤰'}</div>
        <div class="preg-sub">${tri ? 'Trimestre ' + tri : 'Grossesse'}</div>
        ${remaining != null ? `<div class="preg-rem">${remaining} sem. restantes</div>` : ''}
      </div>
    </div>`;
}

function pregnancyWeeks({ diffDays, localDateStr }) {
  const dpa = localStorage.getItem('nc-dpa-date');
  if (!dpa) return null;
  const daysToDue = diffDays(dpa, localDateStr());
  return Math.max(0, Math.floor((280 - daysToDue) / 7));
}

function renderPregnancyMilestone({ getCycleMode, getPregnancyMilestone, diffDays, localDateStr }) {
  const card = document.getElementById('preg-milestone');
  if (!card) return;

  const weeks = pregnancyWeeks({ diffDays, localDateStr });
  if (getCycleMode() !== 'pregnancy' || weeks == null) {
    card.style.display = 'none';
    card.innerHTML = '';
    return;
  }

  const milestone = getPregnancyMilestone(weeks);
  const appt = milestone.nextAppointment
    ? `<div class="preg-appt">📅 ${milestone.nextAppointment.label} ${
      milestone.nextAppointment.inWeeks <= 0
        ? '· cette semaine'
        : `· dans ~${milestone.nextAppointment.inWeeks} sem.`
    }</div>`
    : '';

  card.innerHTML = `
    <div class="preg-ms-head">
      <span class="preg-ms-fruit" aria-hidden="true">🍃</span>
      <div>
        <h2>Semaine ${milestone.week} · grand comme ${milestone.fruit}</h2>
        <p class="preg-ms-note">${milestone.note}</p>
      </div>
    </div>
    ${appt}`;
  card.style.display = 'block';
}

export function renderTodayRingChart({
  state,
  getCycleMode,
  Cycle,
  renderCycleRing,
  renderRingLegend,
  diffDays,
  localDateStr,
  getPregnancyMilestone,
}) {
  const ring = document.getElementById('cycle-ring');
  const legend = document.getElementById('ring-legend');
  if (!ring) return;

  if (getCycleMode() === 'pregnancy') {
    renderPregnancyProgress(ring, { diffDays, localDateStr });
    if (legend) legend.innerHTML = '';
    renderPregnancyMilestone({ getCycleMode, getPregnancyMilestone, diffDays, localDateStr });
    return;
  }

  renderPregnancyMilestone({ getCycleMode, getPregnancyMilestone, diffDays, localDateStr });

  const cycleObj = state.currentCycle ? new Cycle(state.currentCycle) : null;

  const p = state.prediction;
  const day = cycleObj?.getDayInCycle(state.logDate) ?? p?.jourDuCycleActuel ?? 1;
  const totalDays = p?.avgCycleLength ?? cycleObj?.dureeCycle ?? 28;
  const periodDays = p?.avgPeriodDuration ?? cycleObj?.dureeRegles ?? 5;
  const fertileStartDay = p?.fertileStartDay ?? cycleObj?.getFertileWindow().start ?? 9;
  const fertileEndDay = p?.fertileEndDay ?? cycleObj?.getFertileWindow().end ?? 15;
  const ovulationDay = p?.ovulationDay ?? cycleObj?.getFertileWindow().ovulation ?? 14;
  const phaseName = p?.phaseDuCycle ?? (cycleObj ? Cycle.phaseName(day, totalDays, periodDays) : '');

  const ringLogs = Array.isArray(state.ringEntries) ? state.ringEntries : [];
  const ringUserId = state.me?.tracks_cycle ? state.me?.user_id : state.partner?.user_id;

  const flowLevelFromValue = (v) => {
    const s = String(v ?? '').toLowerCase();
    if (s === '3' || s.includes('tres') || s.includes('très') || s.includes('abond')) return 1;
    if (s === '2' || s.includes('mod')) return 0.78;
    if (s === '1' || s.includes('leg') || s.includes('lég')) return 0.55;
    if (s === '0' || s === '' || s === 'aucun') return 0.35;
    return 0.7;
  };

  const daySignal = new Map();
  let flowByDay = {};
  for (const row of ringLogs) {
    if (!row?.log_date || row?.user_id !== ringUserId) continue;
    const d = cycleObj?.getDayInCycle(row.log_date);
    if (!d || d < 1 || d > totalDays) continue;

    const cat = row.category_id;
    const raw = row.value?.v ?? row.value;

    if (cat === 'flow') {
      // Chips individuelles de Today (valeur numérique '0'–'3')
      flowByDay[d] = Math.max(flowByDay[d] || 0, flowLevelFromValue(raw));
      daySignal.set(d, 'flow');
    } else if (cat === 'journal') {
      // DailyLog complet — sauvegardé par le Calendrier ou le formulaire journal
      const journal = typeof raw === 'object' && raw !== null ? raw : {};
      const flux = journal.fluxMenstruel;
      if (flux && flux !== 'aucun') {
        flowByDay[d] = Math.max(flowByDay[d] || 0, flowLevelFromValue(flux));
        daySignal.set(d, 'flow');
      }
      // Points périphériques depuis le journal
      if (!daySignal.has(d)) {
        if (journal.libidoScale != null || journal.rapports) daySignal.set(d, 'sexuality');
        else if (journal.emotions?.length || journal.niveauEnergie) daySignal.set(d, 'mood');
        else if (Object.keys(journal).length > 0) daySignal.set(d, 'other');
      }
    } else if (cat === 'mood') {
      if (!daySignal.has(d)) daySignal.set(d, 'mood');
    } else if (cat === 'libido') {
      if (!daySignal.has(d)) daySignal.set(d, 'sexuality');
    } else if (!daySignal.has(d) && raw != null && raw !== '') {
      daySignal.set(d, 'other');
    }
  }

  const loggedSet = new Set(Array.from(daySignal.keys()));

  const peripheralDots = Array.from(daySignal.entries()).map(([d, type]) => ({ day: d, type }));

  const fmtCourt = s => s
    ? new Date(s + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    : '';

  const formatRelativeDelay = (targetDate) => {
    if (!targetDate) return '';
    const delta = Math.max(0, diffDays(targetDate, localDateStr()));
    if (delta <= 1) return 'demain';
    if (delta < 7) return `dans ${delta} jours`;
    const weeks = Math.round(delta / 7);
    return weeks <= 1 ? 'dans 1 semaine' : `dans ${weeks} semaines`;
  };

  const centerTop = `Aujourd'hui, ${new Date(localDateStr() + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
  let centerMain = phaseName
    ? (phaseName.startsWith('Retard') ? phaseName : `Vous êtes en phase ${phaseName.toLowerCase()}`)
    : `Jour ${day}`;
  let centerToggleLabel = '';
  let centerAlt = '';
  if (p?.nextPeriodDate) {
    centerMain = `Prochaines règles ${formatRelativeDelay(p.nextPeriodDate)}`;
    if (p.fertileStart && p.ovulationDate) {
      centerToggleLabel = 'Jour d\'ovulation probable';
      centerAlt = `Fenêtre fertile : ${fmtCourt(p.fertileStart)} → ${fmtCourt(p.ovulationDate)}`;
    }
  }

  renderCycleRing(ring, {
    totalDays,
    currentDay: day,
    periodDays,
    fertileStart: fertileStartDay,
    fertileEnd: fertileEndDay,
    ovulationDay,
    phaseName,
    loggedDays: loggedSet,
    peripheralDots,
    flowByDay,
    centerTop,
    centerMain,
    centerToggleLabel,
    centerAlt,
  });

  renderRingLegend(legend);
}
