export function renderPredictionCard({ prediction, getCycleMode }) {
  const card = document.getElementById('prediction-card');
  if (!card) return;

  if (getCycleMode() === 'pregnancy') {
    card.style.display = 'none';
    return;
  }

  const p = prediction;
  const history = p?.cyclesUsed;

  if (!p || !history || history < 2) {
    card.style.display = 'none';
    return;
  }

  card.style.display = 'block';
  const nextDate = new Date(p.nextPeriodDate + 'T12:00:00');
  const oDate = new Date(p.ovulationDate + 'T12:00:00');
  const today = new Date();
  const daysUntil = Math.round((nextDate - today) / 864e5);

  const fmt = d => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  document.getElementById('pred-next').textContent =
    daysUntil > 0 ? `dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}` :
    daysUntil === 0 ? "aujourd'hui" : `il y a ${-daysUntil} j`;
  const margin = p.stdDev >= 1 ? ` ± ${Math.round(p.stdDev)} j` : '';
  document.getElementById('pred-next-date').textContent = fmt(nextDate) + margin;

  const ovConfirmedIcon = p.ovulationConfirmed
    ? ' <span style="font-size:0.85em;color:var(--violet);cursor:help" title="Confirmé par biomarqueurs">✓</span>'
    : '';
  const detectionTooltip = p.detectionMethod
    ? ` title="Méthode : ${p.detectionMethod}" style="cursor:help;border-bottom:1px dashed var(--violet)"`
    : '';
  document.getElementById('pred-ovulation').innerHTML = `<span${detectionTooltip}>${fmt(oDate)}</span>${ovConfirmedIcon}`;

  const regularityText = p.predictabilityScore != null
    ? `<br><span style="font-size:0.75em;opacity:0.7">${p.predictabilityScore}% régulier</span>`
    : '';
  document.getElementById('pred-avg').innerHTML = `${p.avgCycleLength} j${regularityText}`;
}
