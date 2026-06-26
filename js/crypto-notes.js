/**
 * crypto-notes.js — Chiffrement AES-GCM via Web Crypto API pour les notes privées.
 * Clé dérivée de : couple_id + PIN utilisateur via PBKDF2 (100 000 itérations).
 * La CryptoKey n'est jamais sérialisée ni stockée — seulement en mémoire de session.
 */

let _key = null; // CryptoKey | null — effacé à la fermeture de l'onglet

const ENC = new TextEncoder();
const DEC = new TextDecoder();

/** Dériver la clé AES-GCM depuis un couple_id et un PIN. */
export async function initNoteKey(coupleId, pin) {
  const raw = await crypto.subtle.importKey(
    'raw',
    ENC.encode(pin + coupleId),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  _key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: ENC.encode('nc-notes-' + coupleId),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/** Effacer la clé de la mémoire (par ex. au verrouillage PIN). */
export function clearNoteKey() { _key = null; }

/** Vrai si une clé est dérivée et en mémoire. */
export function isNoteKeyLoaded() { return _key !== null; }

/**
 * Chiffrer un texte.
 * @returns {string|null} base64(IV || ciphertext) ou null si aucune clé.
 */
export async function encryptNote(text) {
  if (!_key || !text) return null;
  const iv     = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, _key, ENC.encode(text));
  const out    = new Uint8Array(12 + cipher.byteLength);
  out.set(iv);
  out.set(new Uint8Array(cipher), 12);
  return btoa(String.fromCharCode(...out));
}

/**
 * Déchiffrer un texte.
 * @returns {string|null} texte déchiffré, ou null si échec (mauvaise clé / données corrompues).
 */
export async function decryptNote(b64) {
  if (!_key || !b64) return null;
  try {
    const buf    = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const iv     = buf.slice(0, 12);
    const cipher = buf.slice(12);
    const plain  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, _key, cipher);
    return DEC.decode(plain);
  } catch {
    return null; // clé incorrecte ou données corrompues
  }
}
