// theme.js — mode sombre global (body.dark), persisté en localStorage.
// Distinct du dark "intime" (body.intime-dark, géré dans intimacy.js).

const KEY = 'nc-dark';

// Couleurs de la barre d'état (meta theme-color) selon le thème.
const THEME_COLOR = { light: '#F6F5FF', dark: '#14131C' };

export function isDark() {
  return localStorage.getItem(KEY) === '1';
}

function applyMetaColor(dark) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? THEME_COLOR.dark : THEME_COLOR.light);
}

// À appeler au démarrage : restaure la préférence avant le rendu des vues.
export function initTheme() {
  const dark = isDark();
  document.body.classList.toggle('dark', dark);
  applyMetaColor(dark);
}

export function setDarkMode(dark) {
  document.body.classList.toggle('dark', dark);
  localStorage.setItem(KEY, dark ? '1' : '0');
  applyMetaColor(dark);
}
