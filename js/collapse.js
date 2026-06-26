/**
 * collapse.js — Système d'accordéons réutilisable.
 * Pattern : .collapsible-section[data-default-open] > .collapsible-header + .collapsible-body
 * CSS gère l'animation via max-height. JS toggle la classe .collapsed.
 */

/**
 * Initialise tous les accordéons dans un conteneur donné.
 * @param {Element|null} container  — la vue mountée (ex: document.getElementById('view'))
 * @param {string} selector         — sélecteur des sections (défaut: .collapsible-section)
 */
export function initCollapsibles(container = document, selector = '.collapsible-section') {
  container?.querySelectorAll(selector).forEach(section => {
    const btn  = section.querySelector('.collapsible-header');
    if (!btn) return;

    const isOpen = section.dataset.defaultOpen !== 'false'; // open par défaut sauf si false

    if (!isOpen) section.classList.add('collapsed');
    btn.setAttribute('aria-expanded', String(isOpen));

    btn.addEventListener('click', () => {
      const nowCollapsed = section.classList.toggle('collapsed');
      btn.setAttribute('aria-expanded', String(!nowCollapsed));
    });
  });
}

/** Ouvre tous les accordéons d'un conteneur (ex: pour une recherche). */
export function expandAll(container = document, selector = '.collapsible-section') {
  container?.querySelectorAll(selector).forEach(s => {
    s.classList.remove('collapsed');
    s.querySelector('.collapsible-header')?.setAttribute('aria-expanded', 'true');
  });
}

/** Ferme tous les accordéons (ex: changer d'onglet). */
export function collapseAll(container = document, selector = '.collapsible-section') {
  container?.querySelectorAll(selector).forEach(s => {
    s.classList.add('collapsed');
    s.querySelector('.collapsible-header')?.setAttribute('aria-expanded', 'false');
  });
}
