export function createTodayMetricsController({
  getState,
  metricsByPerson,
  isPartnerView,
  faceFor,
  escapeHtml,
  saveEntry,
  renderChart,
}) {
  async function handleMetricClick(event) {
    if (isPartnerView()) return;
    const chip = event.target.closest('.chip');
    if (!chip) return;

    const state = getState();
    const { id: metricId, v: value } = chip.dataset;
    const metric = metricsByPerson[state.cur].find(m => m.id === metricId);
    if (!metric) return;

    chip.closest('.chips').querySelectorAll('.chip').forEach(c => c.classList.remove('sel'));
    chip.classList.add('sel');

    const face = faceFor(metric, value);
    const displayValue = face ? face.e
      : (metric.type === 'enum' || metric.type === 'boolean') ? (metric.opts[value] ?? value)
      : value;
    chip.closest('.metric').querySelector('.val').textContent = displayValue;

    await saveEntry(metricId, value);
    state.savedValues[metricId] = { v: value };

    if (metricId === 'energy') {
      await renderChart();
    }
  }

  function getMetricDisplayValue(metric, value) {
    if (value == null) return '—';
    if (metric.faces) {
      const f = faceFor(metric, value);
      return f ? f.e : '—';
    }
    if (metric.type === 'enum' || metric.type === 'boolean') return metric.opts[value] ?? value;
    if (metric.type === 'bbt') return value ? `${value}°C` : '—';
    if (metric.type === 'text') {
      return value ? String(value).slice(0, 22) + (String(value).length > 22 ? '…' : '') : '—';
    }
    return value;
  }

  function getMetricChipsHTML(metric, savedValue, readonly = false) {
    const ro = readonly ? ' disabled' : '';

    if (metric.type === 'bbt') {
      return `<div class="bbt-input-wrap">
        <input type="number" class="bbt-input" data-id="${metric.id}"
          min="35.0" max="38.5" step="0.1" placeholder="36.5"
          value="${savedValue || ''}" aria-label="Température basale"${ro}>
        <span class="bbt-unit">°C</span>
      </div>`;
    }

    if (metric.type === 'text') {
      return `<textarea class="note-input" data-id="${metric.id}"
        placeholder="${readonly ? '—' : 'Écris quelque chose…'}" rows="2"${ro}>${savedValue || ''}</textarea>`;
    }

    const isSelected = v => String(savedValue) === String(v) ? ' sel' : '';
    const options = (metric.type === 'enum' || metric.type === 'boolean')
      ? metric.opts
      : Array.from({ length: 5 }, (_, i) => i + 1);

    return options.map((opt, i) => {
      const value = (metric.type === 'enum' || metric.type === 'boolean') ? i : opt;
      if (metric.faces) {
        const f = metric.faces[i] || { e: opt, l: '' };
        return `<button type="button" class="chip facechip${isSelected(value)}" data-id="${metric.id}" data-v="${value}">
          <span class="facechip-e">${f.e}</span><span class="facechip-l">${f.l}</span></button>`;
      }
      const chipClass = metric.type === 'scale' ? 'chip scalechip' : 'chip';
      return `<div class="${chipClass}${isSelected(value)}" data-id="${metric.id}" data-v="${value}">${opt}</div>`;
    }).join('');
  }

  function renderMetrics() {
    const wrap = document.getElementById('metrics');
    if (!wrap) return;

    const state = getState();
    const partnerView = isPartnerView();
    const values = partnerView ? (state.partnerValues || {}) : state.savedValues;

    if (partnerView && !state.partner) {
      wrap.removeAttribute('data-readonly');
      wrap.innerHTML = `<div class="empty-state-inline"><div class="es-icon">🔗</div>
        <p>Pas encore de partenaire relié.<br>Reliez-vous pour voir sa saisie.</p></div>`;
      return;
    }

    if (partnerView) wrap.setAttribute('data-readonly', '1');
    else wrap.removeAttribute('data-readonly');

    const banner = partnerView
      ? `<div class="metrics-readonly-note">👀 Lecture seule — ce que ${escapeHtml(state.partner?.display_name || (state.cur === 'elle' ? 'Elle' : 'Lui'))} a partagé. Tu ne modifies que ta propre saisie.</div>`
      : '';

    wrap.innerHTML = banner + metricsByPerson[state.cur].map(metric => {
      const savedRaw = values[metric.id];
      const savedValue = savedRaw != null ? (savedRaw.v ?? savedRaw) : null;
      return `
      <div class="metric">
        <div class="ml">
          <span class="name">${metric.label}</span>
          <span class="val" id="val-${metric.id}">${getMetricDisplayValue(metric, savedValue)}</span>
        </div>
        <div class="chips">${getMetricChipsHTML(metric, savedValue, partnerView)}</div>
      </div>`;
    }).join('');

    if (partnerView) return;

    wrap.removeEventListener('click', handleMetricClick);
    wrap.addEventListener('click', handleMetricClick);

    wrap.querySelectorAll('.bbt-input').forEach(input => {
      let timer;
      input.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
          const val = parseFloat(input.value);
          if (isNaN(val) || val < 35 || val > 39) return;
          const id = input.dataset.id;
          document.getElementById(`val-${id}`).textContent = `${val.toFixed(1)}°C`;
          await saveEntry(id, String(val.toFixed(1)));
          getState().savedValues[id] = { v: String(val.toFixed(1)) };
        }, 800);
      });
    });

    wrap.querySelectorAll('.note-input').forEach(ta => {
      let timer;
      ta.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
          const id = ta.dataset.id;
          const val = ta.value.trim();
          document.getElementById(`val-${id}`).textContent = val
            ? val.slice(0, 22) + (val.length > 22 ? '…' : '') : '—';
          await saveEntry(id, val);
          getState().savedValues[id] = { v: val };
        }, 900);
      });
    });
  }

  return { renderMetrics };
}
