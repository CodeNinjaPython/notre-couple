// ui-feedback.js — primitives de retour utilisateur partagées.
//
// Remplace les `alert()` / `confirm()` natifs (hors de la voix de l'app, et
// bloquants en PWA iOS) par :
//   - toast(message, type)        → notification éphémère (success | error | info)
//   - confirmDialog(opts)         → bottom sheet de confirmation, Promise<boolean>
//   - friendlyError(e)            → message d'erreur lisible, dans la voix de l'app
//
// S'appuie sur les classes CSS existantes (.toast, .sheet, .sheet-backdrop) +
// quelques ajouts dans css/app.css (.toast--error, .confirm-*).

// --- Toast -----------------------------------------------------------------

export function toast(message, type = 'success') {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    document.body.appendChild(t);
  }
  t.className = 'toast' + (type === 'error' ? ' toast--error' : type === 'info' ? ' toast--info' : '');
  t.textContent = message;
  // Forcer un reflow pour relancer l'animation si un toast est déjà affiché.
  void t.offsetWidth;
  t.classList.add('show');
  clearTimeout(t._hide);
  t._hide = setTimeout(() => t.classList.remove('show'), type === 'error' ? 4200 : 3200);
}

// --- Confirmation ----------------------------------------------------------

/**
 * Affiche une confirmation dans un bottom sheet et résout avec true/false.
 * @param {object} opts
 * @param {string} opts.title          Titre (gras).
 * @param {string} [opts.message]      Texte explicatif.
 * @param {string} [opts.confirmLabel] Libellé du bouton d'action (def. « Confirmer »).
 * @param {string} [opts.cancelLabel]  Libellé d'annulation (def. « Annuler »).
 * @param {boolean} [opts.danger]      Style rouge sur le bouton d'action.
 * @returns {Promise<boolean>}
 */
export function confirmDialog({
  title,
  message = '',
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  danger = false,
} = {}) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'sheet-backdrop confirm-backdrop';
    backdrop.innerHTML = `
      <div class="sheet confirm-sheet" role="alertdialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <div class="sheet-handle"></div>
        <div class="sheet-title">${escapeHtml(title)}</div>
        ${message ? `<p class="confirm-msg">${escapeHtml(message)}</p>` : ''}
        <div class="confirm-actions">
          <button type="button" class="btn-secondary confirm-cancel">${escapeHtml(cancelLabel)}</button>
          <button type="button" class="btn-primary ${danger ? 'confirm-danger' : ''} confirm-ok">${escapeHtml(confirmLabel)}</button>
        </div>
      </div>`;
    document.body.appendChild(backdrop);

    let settled = false;
    const close = (result) => {
      if (settled) return;
      settled = true;
      backdrop.classList.remove('open');
      document.removeEventListener('keydown', onKey);
      setTimeout(() => backdrop.remove(), 300);
      resolve(result);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close(false);
    };

    backdrop.querySelector('.confirm-ok').addEventListener('click', () => close(true));
    backdrop.querySelector('.confirm-cancel').addEventListener('click', () => close(false));
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(false); });
    document.addEventListener('keydown', onKey);

    // Ouverture animée (laisse le DOM se poser avant la transition).
    requestAnimationFrame(() => {
      backdrop.classList.add('open');
      backdrop.querySelector('.confirm-ok').focus();
    });
  });
}

// --- Formulaire / saisie ---------------------------------------------------

/**
 * Bottom sheet de saisie (remplace les `prompt()` natifs). Gère plusieurs
 * champs typés et résout avec un objet { name: value } ou null si annulé.
 *
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} [opts.message]
 * @param {Array}  opts.fields   Liste de champs :
 *   { name, label, type='text'|'textarea'|'date'|'number'|'tel'|'select'|'checkbox',
 *     placeholder, options:[{value,label}], value, required, inputmode, maxlength }
 * @param {string} [opts.confirmLabel='Enregistrer']
 * @param {string} [opts.cancelLabel='Annuler']
 * @param {(values:object)=>?string} [opts.validate] Renvoie un message d'erreur ou null.
 * @returns {Promise<object|null>}
 */
export function formDialog({
  title,
  message = '',
  fields = [],
  confirmLabel = 'Enregistrer',
  cancelLabel = 'Annuler',
  validate,
} = {}) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'sheet-backdrop confirm-backdrop';
    backdrop.innerHTML = `
      <div class="sheet confirm-sheet form-sheet" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <div class="sheet-handle"></div>
        <div class="sheet-title">${escapeHtml(title)}</div>
        ${message ? `<p class="confirm-msg">${escapeHtml(message)}</p>` : ''}
        <form class="form-dialog-body">
          ${fields.map(renderField).join('')}
          <p class="form-error" hidden></p>
          <div class="confirm-actions">
            <button type="button" class="btn-secondary form-cancel">${escapeHtml(cancelLabel)}</button>
            <button type="submit" class="btn-primary form-ok">${escapeHtml(confirmLabel)}</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(backdrop);

    const form    = backdrop.querySelector('.form-dialog-body');
    const errEl   = backdrop.querySelector('.form-error');
    let settled = false;

    const close = (result) => {
      if (settled) return;
      settled = true;
      backdrop.classList.remove('open');
      document.removeEventListener('keydown', onKey);
      setTimeout(() => backdrop.remove(), 300);
      resolve(result);
    };
    const onKey = (e) => { if (e.key === 'Escape') close(null); };

    const collect = () => {
      const values = {};
      for (const f of fields) {
        const node = form.querySelector(`[data-name="${f.name}"]`);
        if (!node) continue;
        values[f.name] = f.type === 'checkbox' ? node.checked : node.value.trim();
      }
      return values;
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const values = collect();
      for (const f of fields) {
        if (f.required && !values[f.name]) {
          showFieldError(`« ${f.label} » est requis.`);
          form.querySelector(`[data-name="${f.name}"]`)?.focus();
          return;
        }
      }
      const msg = validate ? validate(values) : null;
      if (msg) { showFieldError(msg); return; }
      close(values);
    });
    backdrop.querySelector('.form-cancel').addEventListener('click', () => close(null));
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(null); });
    document.addEventListener('keydown', onKey);

    function showFieldError(text) {
      errEl.textContent = text;
      errEl.hidden = false;
    }

    requestAnimationFrame(() => {
      backdrop.classList.add('open');
      form.querySelector('[data-name]')?.focus();
    });
  });
}

function renderField(f) {
  const id = `fd-${f.name}`;
  const common = `id="${id}" data-name="${escapeHtml(f.name)}"`
    + (f.placeholder ? ` placeholder="${escapeHtml(f.placeholder)}"` : '')
    + (f.inputmode ? ` inputmode="${escapeHtml(f.inputmode)}"` : '')
    + (f.maxlength ? ` maxlength="${f.maxlength}"` : '');
  const val = f.value != null ? escapeHtml(String(f.value)) : '';

  if (f.type === 'checkbox') {
    return `<label class="form-check">
      <input type="checkbox" ${common} ${f.value ? 'checked' : ''}>
      <span>${escapeHtml(f.label)}</span>
    </label>`;
  }
  let control;
  if (f.type === 'textarea') {
    control = `<textarea ${common} rows="3">${val}</textarea>`;
  } else if (f.type === 'select') {
    control = `<select ${common}>${(f.options || []).map(o =>
      `<option value="${escapeHtml(o.value)}"${String(o.value) === String(f.value) ? ' selected' : ''}>${escapeHtml(o.label)}</option>`
    ).join('')}</select>`;
  } else {
    const t = f.type === 'date' || f.type === 'number' || f.type === 'tel' ? f.type : 'text';
    control = `<input type="${t}" ${common} value="${val}">`;
  }
  return `<div class="field">
    <label for="${id}">${escapeHtml(f.label)}</label>
    ${control}
  </div>`;
}

// --- Erreurs ---------------------------------------------------------------

/**
 * Traduit une erreur (réseau, Supabase, exception) en message court et lisible,
 * dans la voix de l'app. Ne jamais exposer de stack ou de jargon brut.
 */
export function friendlyError(e) {
  const raw = (e && (e.message || e.error_description || e.msg)) || String(e || '');
  const low = raw.toLowerCase();

  if (!navigator.onLine || low.includes('failed to fetch') || low.includes('network') || low.includes('networkerror')) {
    return 'Connexion perdue. Vérifie ton réseau et réessaie.';
  }
  if (low.includes('jwt') || low.includes('not authenticated') || low.includes('non authentifié') || low.includes('401')) {
    return 'Session expirée. Reconnecte-toi pour continuer.';
  }
  if (low.includes('row-level security') || low.includes('permission') || low.includes('policy') || low.includes('403')) {
    return "Action non autorisée. Tes données restent privées.";
  }
  if (low.includes('timeout') || low.includes('timed out')) {
    return 'Le serveur met du temps à répondre. Réessaie dans un instant.';
  }
  return raw || 'Une erreur est survenue. Réessaie.';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
