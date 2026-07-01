function ratingFlags(position, positionId) {
  const hay = `${positionId} ${position?.label || ''} ${position?.category || ''}`.toLowerCase();
  if (/massage/.test(hay)) return { first: 'Trop fort', second: 'Détente' };
  if (/oral|fellation|cunni|bouche|langue/.test(hay)) return { first: 'Trop rapide', second: 'Doux' };
  return { first: 'Douleur', second: 'Trop profond' };
}

export function syncPositionRatings({ wrap, selectedIds, positions, ratingState, escapeHtml }) {
  if (!wrap) return;

  Object.keys(ratingState).forEach(id => {
    if (!selectedIds.includes(id)) delete ratingState[id];
  });

  wrap.innerHTML = selectedIds.map(id => {
    const pos = positions.find(p => p.id === id);
    const prev = ratingState[id] || (ratingState[id] = { score: 0, pain: false, too_deep: false });
    const rawName = pos?.label || (id.startsWith('custom:') ? `✨ ${id.replace('custom:', '')}` : id);
    const displayName = escapeHtml(rawName);
    const flags = ratingFlags(pos, id);
    return `<div class="pos-rate-row" data-id="${escapeHtml(id)}">
      <div class="pos-rate-name">${displayName}</div>
      <div class="pos-rate-controls">
        <input type="range" class="pos-rate-score" min="0" max="10" value="${prev.score}" aria-label="Note sur 10 — ${displayName}">
        <span class="pos-rate-val">${prev.score ? prev.score + '/10' : '—'}</span>
        <button type="button" class="pos-rate-flag ${prev.pain ? 'on' : ''}" data-flag="pain" aria-pressed="${prev.pain}">${flags.first}</button>
        <button type="button" class="pos-rate-flag ${prev.too_deep ? 'on' : ''}" data-flag="too_deep" aria-pressed="${prev.too_deep}">${flags.second}</button>
      </div>
    </div>`;
  }).join('');

  wrap.querySelectorAll('.pos-rate-row').forEach(row => {
    const id = row.dataset.id;
    const range = row.querySelector('.pos-rate-score');
    const val = row.querySelector('.pos-rate-val');

    range.addEventListener('input', () => {
      ratingState[id].score = parseInt(range.value, 10);
      val.textContent = ratingState[id].score ? ratingState[id].score + '/10' : '—';
    });

    row.querySelectorAll('.pos-rate-flag').forEach(button => {
      button.addEventListener('click', () => {
        const flag = button.dataset.flag;
        ratingState[id][flag] = !ratingState[id][flag];
        button.classList.toggle('on', ratingState[id][flag]);
        button.setAttribute('aria-pressed', String(ratingState[id][flag]));
      });
    });
  });
}
