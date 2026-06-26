/**
 * skeleton.js — Placeholders de chargement réutilisables.
 * Utilise les classes .skeleton* déjà définies dans app.css.
 */

/** Remplit un conteneur (par id ou élément) avec un skeleton card. */
export function skeletonCard(target, { height = 120, count = 1 } = {}) {
  const el = typeof target === 'string' ? document.getElementById(target) : target;
  if (!el) return;
  el.innerHTML = Array.from({ length: count }, () =>
    `<div class="skeleton skeleton-card" style="height:${height}px"></div>`
  ).join('');
}

/** Remplit un conteneur avec des lignes de texte skeleton. */
export function skeletonLines(target, lines = 3) {
  const el = typeof target === 'string' ? document.getElementById(target) : target;
  if (!el) return;
  const widths = ['w80', 'w60', '', 'w80', 'w60'];
  el.innerHTML = Array.from({ length: lines }, (_, i) =>
    `<div class="skeleton skeleton-text ${widths[i % widths.length]}"></div>`
  ).join('');
}

/** Applique des skeletons à plusieurs conteneurs d'un coup. */
export function skeletonFill(specs) {
  specs.forEach(({ id, type = 'card', ...opts }) => {
    if (type === 'lines') skeletonLines(id, opts.lines);
    else skeletonCard(id, opts);
  });
}
