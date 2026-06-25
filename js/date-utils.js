/**
 * date-utils.js — Toutes les dates de l'app passent par ici.
 * Règle critique : on travaille toujours en date LOCALE (pas UTC).
 * `new Date().toISOString()` donne l'heure UTC → décalage au changement de jour.
 */

/** YYYY-MM-DD en heure locale */
export function localDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Retourne la date d'il y a `n` jours (locale) */
export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDateStr(d);
}

/** Ajoute `n` jours à une date YYYY-MM-DD */
export function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}

/** Différence en jours entre deux YYYY-MM-DD (a - b) */
export function diffDays(a, b) {
  return Math.round((new Date(a + 'T12:00:00') - new Date(b + 'T12:00:00')) / 864e5);
}

/** Formate une date YYYY-MM-DD en français */
export function fmtDate(dateStr, opts = { day: 'numeric', month: 'long' }) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', opts);
}

/** Lundi de la semaine courante */
export function weekStart() {
  const d = new Date();
  const dow = (d.getDay() + 6) % 7; // 0 = lundi
  return daysAgo(dow);
}

/** 7 dates de la semaine courante */
export function currentWeekDates() {
  const start = weekStart();
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}
