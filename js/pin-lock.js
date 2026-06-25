/**
 * pin-lock.js — Verrouillage PIN 4 chiffres + masquage rapide.
 * Hash SHA-256 via Web Crypto API. Aucune lib externe.
 * Le PIN n'est JAMAIS stocké en clair — uniquement le hash.
 */

const PIN_KEY   = 'nc-pin-hash';
const PIN_SALT  = 'nc-couple-privacy-2024';
const LOCK_KEY  = 'nc-intime-locked';

// ─── Hashing ───────────────────────────────────────────────────────────────

async function hashPIN(pin) {
  const data = new TextEncoder().encode(pin + PIN_SALT);
  const buf  = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── État ──────────────────────────────────────────────────────────────────

export function hasPIN() {
  return !!localStorage.getItem(PIN_KEY);
}

export function isLocked() {
  return localStorage.getItem(LOCK_KEY) === '1';
}

export function lock() {
  localStorage.setItem(LOCK_KEY, '1');
}

export function unlock() {
  localStorage.removeItem(LOCK_KEY);
}

// ─── Définir le PIN ─────────────────────────────────────────────────────────

export async function setupPIN(pin) {
  if (!/^\d{4}$/.test(pin)) throw new Error('Le PIN doit comporter 4 chiffres.');
  const hash = await hashPIN(pin);
  localStorage.setItem(PIN_KEY, hash);
  unlock();
}

export function removePIN() {
  localStorage.removeItem(PIN_KEY);
  unlock();
}

// ─── Vérifier le PIN ───────────────────────────────────────────────────────

export async function verifyPIN(pin) {
  const stored = localStorage.getItem(PIN_KEY);
  if (!stored) return true; // pas de PIN = toujours OK
  const hash = await hashPIN(pin);
  return hash === stored;
}

// ─── Affichage de l'écran de verrouillage ──────────────────────────────────

export async function showLockScreen(onUnlock) {
  const existing = document.getElementById('pin-lock-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'pin-lock-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Écran de verrouillage');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `
    <div class="pin-lock-box">
      <div class="pin-lock-icon">🔒</div>
      <div class="pin-lock-title">Espace intime</div>
      <div class="pin-lock-sub">Entrez votre code PIN</div>
      <div class="pin-display" aria-live="polite" aria-label="Code entré">
        <span class="pin-dot" id="pd0"></span>
        <span class="pin-dot" id="pd1"></span>
        <span class="pin-dot" id="pd2"></span>
        <span class="pin-dot" id="pd3"></span>
      </div>
      <div class="pin-error" id="pin-error" role="alert" aria-live="assertive"></div>
      <div class="pin-keypad" role="group" aria-label="Pavé numérique">
        ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k =>
          `<button type="button" class="pin-key${k === '' ? ' pin-key-empty' : ''}"
            data-key="${k}" aria-label="${k === '⌫' ? 'Effacer' : k === '' ? '' : k}"
            ${k === '' ? 'disabled aria-hidden="true"' : ''}>${k}</button>`
        ).join('')}
      </div>
      <button type="button" class="btn-secondary" id="btn-pin-cancel" style="margin-top:16px;width:100%">Annuler</button>
    </div>`;

  document.body.appendChild(overlay);

  let entered = '';

  function updateDots() {
    for (let i = 0; i < 4; i++) {
      const dot = document.getElementById(`pd${i}`);
      if (dot) dot.classList.toggle('filled', i < entered.length);
    }
  }

  async function tryUnlock() {
    const ok = await verifyPIN(entered);
    if (ok) {
      unlock();
      overlay.remove();
      onUnlock?.();
    } else {
      entered = '';
      updateDots();
      const errEl = document.getElementById('pin-error');
      if (errEl) {
        errEl.textContent = 'Code incorrect. Réessayez.';
        setTimeout(() => { errEl.textContent = ''; }, 2000);
      }
      overlay.querySelector('.pin-display')?.classList.add('pin-shake');
      setTimeout(() => overlay.querySelector('.pin-display')?.classList.remove('pin-shake'), 500);
    }
  }

  overlay.querySelectorAll('.pin-key:not(.pin-key-empty)').forEach(btn => {
    btn.addEventListener('click', async () => {
      const key = btn.dataset.key;
      if (key === '⌫') {
        entered = entered.slice(0, -1);
      } else if (entered.length < 4) {
        entered += key;
      }
      updateDots();
      if (entered.length === 4) await tryUnlock();
    });
  });

  document.getElementById('btn-pin-cancel')?.addEventListener('click', () => {
    overlay.remove();
  });

  // Focus sur le premier bouton clavier
  overlay.querySelector('.pin-key')?.focus();
}

// ─── Masquage rapide ────────────────────────────────────────────────────────

export function initQuickHide() {
  // Masquer quand l'app passe en arrière-plan
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && hasPIN()) {
      lock();
      showQuickHideScreen();
    }
  });

  // Bouton "Masquer" dans l'interface
  document.getElementById('btn-quick-hide')?.addEventListener('click', () => {
    if (hasPIN()) {
      lock();
      showQuickHideScreen();
    }
  });
}

function showQuickHideScreen() {
  const existing = document.getElementById('quick-hide-screen');
  if (existing) return;

  const screen = document.createElement('div');
  screen.id = 'quick-hide-screen';
  screen.setAttribute('aria-label', 'Écran masqué');
  screen.innerHTML = `
    <div class="quick-hide-content">
      <div class="quick-hide-icon">🔒</div>
      <button type="button" class="btn-primary" id="btn-quick-unhide"
        aria-label="Déverrouiller l'espace intime">
        Déverrouiller
      </button>
    </div>`;
  document.body.appendChild(screen);

  document.getElementById('btn-quick-unhide')?.addEventListener('click', () => {
    screen.remove();
    if (hasPIN()) {
      showLockScreen(() => {
        // naviguer vers l'écran intime
        import('./router.js').then(({ navigate }) => navigate('intime'));
      });
    }
  });
}

// ─── Gestion PIN dans les réglages ─────────────────────────────────────────

export function initPINSettings() {
  const status  = document.getElementById('pin-status');
  const btnSet  = document.getElementById('btn-set-pin');
  const btnDel  = document.getElementById('btn-delete-pin');

  function updatePINUI() {
    const has = hasPIN();
    if (status)  status.textContent  = has ? 'PIN activé' : 'Pas de PIN';
    if (btnSet)  btnSet.textContent  = has ? 'Modifier le PIN' : 'Définir un PIN';
    if (btnDel)  btnDel.style.display = has ? 'block' : 'none';
  }

  updatePINUI();

  btnSet?.addEventListener('click', async () => {
    const pin = prompt('Choisissez un code PIN à 4 chiffres :');
    if (!pin || !/^\d{4}$/.test(pin)) {
      alert('Le PIN doit comporter exactement 4 chiffres.');
      return;
    }
    const confirm = prompt('Confirmez le code PIN :');
    if (pin !== confirm) { alert('Les codes ne correspondent pas.'); return; }
    await setupPIN(pin);
    updatePINUI();
  });

  btnDel?.addEventListener('click', () => {
    if (confirm('Supprimer le PIN ? L\'espace intime ne sera plus protégé.')) {
      removePIN();
      updatePINUI();
    }
  });
}
