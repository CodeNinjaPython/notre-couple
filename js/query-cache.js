/**
 * query-cache.js — Cache mémoire court-terme pour les requêtes Supabase.
 * Évite les re-fetch lors des changements de vue (Today → Calendrier → Today…).
 * Fonctionne en mode démo (local-db.js est déjà instantané) et en production.
 * TTL par défaut : 45 secondes (rafraîchissement imperceptible).
 */

const _store  = new Map();
const DEFAULT_TTL = 45_000; // ms

/**
 * Lance `queryFn` uniquement si la clé n'est pas en cache ou si le TTL est expiré.
 * @param {string}   key     Clé unique (ex: 'sessions-couple-abc123')
 * @param {Function} queryFn Fonction async retournant { data, error }
 * @param {number}   ttl     TTL en ms (défaut: 45s)
 */
export async function cachedQuery(key, queryFn, ttl = DEFAULT_TTL) {
  const hit = _store.get(key);
  if (hit && Date.now() - hit.ts < ttl) {
    return hit.result;
  }
  const result = await queryFn();
  if (!result?.error) {
    _store.set(key, { result, ts: Date.now() });
  }
  return result;
}

/**
 * Invalide toutes les entrées dont la clé commence par `prefix`.
 * Appeler après une mutation (insert/update/delete) pour forcer le rechargement.
 */
export function invalidateCache(prefix) {
  for (const key of _store.keys()) {
    if (key.startsWith(prefix)) _store.delete(key);
  }
}

/** Vide tout le cache (ex: à la déconnexion ou au changement de couple). */
export function clearCache() {
  _store.clear();
}

/** Retourne le nombre d'entrées en cache (utile pour le debug). */
export function cacheSize() {
  return _store.size;
}
