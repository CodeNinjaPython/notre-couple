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
  const day = cycleObj?.getDayInCycle(state.logDate) ?? 1;
  const totalDays = p?.avgCycleLength ?? cycleObj?.dureeCycle ?? 28;
  const periodDays = p?.avgPeriodDuration ?? cycleObj?.dureeRegles ?? 5;
  const fertileStartDay = p?.fertileStartDay ?? cycleObj?.getFertileWindow().start ?? 9;
  const fertileEndDay = p?.fertileEndDay ?? cycleObj?.getFertileWindow().end ?? 15;
  const ovulationDay = p?.ovulationDay ?? cycleObj?.getFertileWindow().ovulation ?? 14;
  const phaseName = p?.phaseDuCycle ?? (cycleObj ? Cycle.phaseName(day, totalDays, periodDays) : '');

  const loggedSet = new Set(Object.keys(state.savedValues).length ? [day] : []);

  const fmtCourt = s => s
    ? new Date(s + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    : '';
  const centerTop = `Aujourd'hui, ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`;
  let centerMain = phaseName
    ? (phaseName.startsWith('Retard') ? phaseName : `Vous êtes en phase ${phaseName.toLowerCase()}`)
    : `Jour ${day}`;
  let centerToggleLabel = '';
  let centerAlt = '';
  if (p?.nextPeriodDate) {
    centerMain = `Vos prochaines règles sont le ${fmtCourt(p.nextPeriodDate)}`;
    if (p.fertileStart && p.ovulationDate) {
      centerToggleLabel = 'Jour fertile probable';
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
    centerTop,
    centerMain,
    centerToggleLabel,
    centerAlt,
  });

  renderRingLegend(legend);
}
