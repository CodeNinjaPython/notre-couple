/**
 * daily-log-ui.js — Composants UI pour le journal quotidien DailyLog.
 *   1. JOURNAL_CATEGORIES — schéma complet des catégories + options
 *   2. renderLogCategoryAccordion() — accordéon dynamique avec grille de cards
 *   3. renderCalendarDaySummary()  — panneau résumé pour un jour du calendrier
 */

// ═══════════════════════════════════════════════════════════════════════════
// 1. SCHÉMA DES CATÉGORIES
//    Chaque catégorie : { id, label, icon, color, fields[] }
//    Chaque field     : { key, label, type, options?, nested? }
//    Types : 'single' | 'multi' | 'number' | 'bool' | 'text'
// ═══════════════════════════════════════════════════════════════════════════

const o = (id, label, icon) => ({ id, label, icon });

export const JOURNAL_CATEGORIES = [

  // ── Flux & Saignements ── Rouge ──────────────────────────────────────────
  {
    id: 'flux', label: 'Flux & Saignements', icon: '🩸', color: '#E53935',
    fields: [
      { key: 'fluxMenstruel', label: 'Flux menstruel', type: 'single',
        options: [
          o('aucun','Aucun','○'), o('leger','Léger','🩸'),
          o('modere','Modéré','🩸🩸'), o('abondant','Abondant','🩸🩸🩸'),
        ]},
      { key: 'spotting', label: 'Spotting', type: 'single',
        options: [o('rouge','Rouge','🔴'), o('marron','Marron','🟤')]},
      { key: 'textureFlux', label: 'Texture', type: 'single',
        options: [
          o('fluide','Fluide','💧'), o('normale','Normale','◯'),
          o('epaisse','Épaisse','🔶'), o('caillotsRoses','Caillots roses','💗'),
          o('caillotsNoirs','Caillots foncés','⚫'),
        ]},
    ],
  },

  // ── Protections ── Orange ────────────────────────────────────────────────
  {
    id: 'protections', label: 'Protections', icon: '🩱', color: '#F97316',
    fields: [
      { key: 'protectionType', label: 'Type de protection', type: 'single',
        options: [
          o('serviette','Serviette','📄'), o('tampon','Tampon','◎'),
          o('coupe','Coupe','☕'), o('sous_vetements','Sous-vêtements','👙'),
          o('protegeSlip','Protège-slip','🩲'),
        ]},
      { key: 'protectionFreq', label: 'Changements par jour', type: 'number',
        unit: 'fois', min: 1, max: 10 },
    ],
  },

  // ── Émotions & SPM ── Violet ─────────────────────────────────────────────
  {
    id: 'emotions', label: 'Émotions & SPM', icon: '😊', color: '#7C5CFC',
    fields: [
      { key: 'emotionsPositives', label: 'Émotions positives', type: 'multi',
        options: [
          o('heureuse','Heureuse','😊'), o('calme','Calme','😌'),
          o('confiante','Confiante','💪'), o('aimante','Aimante','🥰'),
          o('energique','Énergique','⚡'), o('creative','Créative','🎨'),
        ]},
      { key: 'emotionsNegatives', label: 'Émotions difficiles', type: 'multi',
        options: [
          o('triste','Triste','😢'), o('irritable','Irritable','😤'),
          o('anxieuse','Anxieuse','😰'), o('deprimee','Déprimée','😞'),
          o('en_colere','En colère','😠'), o('sautes_humeur','Sautes d\'humeur','🎭'),
          o('sensible','Sensible','🥹'), o('pas_controle','Pas en contrôle','😵'),
          o('indifferente','Indifférence','😑'),
        ]},
      { key: 'etatCognitif', label: 'État cognitif', type: 'multi',
        options: [
          o('concentree','Concentrée','🎯'), o('creative','Créative','💡'),
          o('motivee','Motivée','🚀'), o('productive','Productive','✅'),
          o('distraite','Distraite','😶'), o('brouillard','Brouillard mental','🌫️'),
          o('inefficace','Inefficace','⚡'), o('stressee','Stressée','😫'),
        ]},
    ],
  },

  // ── Énergie & Sommeil ── Ambre ──────────────────────────────────────────
  {
    id: 'energie_sommeil', label: 'Énergie & Sommeil', icon: '⚡', color: '#D97706',
    fields: [
      { key: 'niveauEnergie', label: 'Niveau d\'énergie', type: 'single',
        options: [
          o('epuisee','Épuisée','🪫'), o('fatiguee','Fatiguée','😴'),
          o('normale','Normale','🔋'), o('bonne','Bonne','⚡'),
          o('excellente','Excellente','✨'),
        ]},
      { key: 'qualiteSommeil', label: 'Qualité du sommeil', type: 'single',
        options: [
          o('mauvaise','Mauvaise','💤'), o('agitee','Agitée','🌀'),
          o('normale','Normale','😴'), o('bonne','Bonne','🌙'),
          o('tres_bonne','Très bonne','✨'),
        ]},
      { key: 'dureeSommeil', label: 'Durée de sommeil (h)', type: 'number',
        unit: 'h', min: 0, max: 24, step: 0.5 },
      { key: 'symptomesSommeil', label: 'Symptômes du sommeil', type: 'multi',
        options: [
          o('insomnie','Insomnie','🚫'), o('reveils_frequents','Réveils','🔔'),
          o('reves_intenses','Rêves intenses','🌙'), o('sueurs_nocturnes','Sueurs','💦'),
          o('fatigue_reveil','Fatigue au réveil','🛌'),
          o('bouffees_chaleur','Bouffées de chaleur','🔥'),
        ]},
    ],
  },

  // ── Douleurs ── Rouge vif ────────────────────────────────────────────────
  {
    id: 'douleurs', label: 'Douleurs', icon: '💊', color: '#DC2626',
    fields: [
      { key: 'douleursPelviennes', label: 'Douleurs pelviennes', type: 'multi',
        options: [
          o('crampes','Crampes','🔥'), o('pelviennes','Pelviennes','🌡️'),
          o('dos','Dos', '🦴'), o('hanches','Hanches','🦿'), o('coccyx','Coccyx','📍'),
        ]},
      { key: 'douleursCorps', label: 'Autres douleurs', type: 'multi',
        options: [
          o('tete','Tête','🤕'), o('migraine','Migraine','💥'),
          o('migraine_aura','Migraine+aura','⚡'), o('seins_sensibles','Seins sensibles','🌡️'),
          o('seins_gonfles','Seins gonflés','💠'), o('jambes_lourdes','Jambes lourdes','🦵'),
          o('articulaires','Articulaires','🦴'), o('urinaire','Urinaire','💧'),
          o('demangeaisons','Démangeaisons','🌿'),
        ]},
    ],
  },

  // ── Digestion ── Vert lime ───────────────────────────────────────────────
  {
    id: 'digestion', label: 'Digestion', icon: '🥑', color: '#16A34A',
    fields: [
      { key: 'fringales', label: 'Fringales', type: 'multi',
        options: [
          o('sucre','Sucré','🍫'), o('sale','Salé','🧂'), o('chocolat','Chocolat','🍫'),
          o('alcool','Alcool','🍷'), o('epice','Épicé','🌶️'), o('gras','Gras','🍟'),
        ]},
      { key: 'transit', label: 'Transit', type: 'single',
        options: [
          o('normal','Normal','✅'), o('constipation','Constipation','🔒'),
          o('diarrhee','Diarrhée','💨'), o('ballonnements','Ballonnements','🫃'),
          o('flatulences','Flatulences','💨'),
        ]},
      { key: 'symptomsGastriques', label: 'Symptômes gastriques', type: 'multi',
        options: [
          o('aigreurs','Aigreurs','🔥'), o('nausees','Nausées','🤢'),
          o('vomissements','Vomissements','🤮'),
        ]},
    ],
  },

  // ── État corporel ── Bleu ────────────────────────────────────────────────
  {
    id: 'corps', label: 'État corporel', icon: '🌿', color: '#4278C4',
    fields: [
      { key: 'glaireCervicale', label: 'Glaire cervicale', type: 'single',
        options: [
          o('absence','Absente','—'), o('seche','Sèche','🏜️'),
          o('collante','Collante','🍯'), o('cremeuse','Crémeuse','☁️'),
          o('aqueuse','Aqueuse','💧'), o('blanc_oeuf','Blanc d\'œuf','🥚'),
          o('fertile','Fertile','💦'),
        ]},
      { key: 'etatPeau', label: 'Peau', type: 'multi',
        options: [
          o('normale','Normale','✨'), o('acne','Acné','🔴'),
          o('grasse','Grasse','💦'), o('seche','Sèche','🏜️'),
          o('eclatante','Éclatante','⭐'), o('sensible','Sensible','🌸'),
        ]},
      { key: 'etatCheveux', label: 'Cheveux', type: 'multi',
        options: [
          o('normaux','Normaux','✂️'), o('gras','Gras','💧'),
          o('secs','Secs','🏜️'), o('cuir_sec','Cuir sec','❄️'),
          o('racines_grasses','Racines grasses','🌊'),
        ]},
      { key: 'temperatureBasale', label: 'Température basale (°C)', type: 'number',
        unit: '°C', min: 35, max: 39, step: 0.05 },
      { key: 'poids', label: 'Poids (kg)', type: 'number',
        unit: 'kg', min: 30, max: 200, step: 0.1 },
    ],
  },

  // ── Vie quotidienne ── Olive ─────────────────────────────────────────────
  {
    id: 'quotidien', label: 'Vie quotidienne', icon: '🌅', color: '#65A30D',
    fields: [
      { key: 'activitesSociales', label: 'Activités sociales', type: 'multi',
        options: [
          o('sortie','Sortie','🎉'), o('travail','Travail','💼'),
          o('teletravail','Télétravail','🏠'), o('repos','Jour de repos','🛋️'),
          o('rencard','Rencard','💑'), o('vacances','Vacances','🏖️'),
          o('gala','Grande soirée','🥂'),
        ]},
      { key: 'exercice', label: 'Exercice', type: 'single',
        options: [
          o('aucun','Aucun','—'), o('marche','Marche','🚶'), o('yoga','Yoga','🧘'),
          o('leger','Léger','🏃'), o('modere','Modéré','💪'),
          o('intense','Intense','🏋️'), o('course','Course','🏃'),
          o('natation','Natation','🏊'),
        ]},
      { key: 'meditation', label: 'Méditation', type: 'bool', icon: '🧘' },
      { key: 'stressJournalier', label: 'Niveau de stress (1–5)', type: 'number',
        unit: '/5', min: 1, max: 5, step: 1 },
      { key: 'toxiques', label: 'Toxiques', type: 'multi',
        options: [
          o('alcool','Alcool','🍷'), o('tabac','Tabac','🚬'),
          o('cannabis','Cannabis','🌿'), o('cafeine_elevee','Caféine élevée','☕'),
        ]},
    ],
  },

  // ── Sexualité ── Rose ────────────────────────────────────────────────────
  {
    id: 'sexualite', label: 'Sexualité', icon: '❤️', color: '#E84375',
    fields: [
      { key: 'rapports', label: 'Rapports', type: 'single',
        options: [
          o('aucun','Aucun','—'), o('avec_protection','Protégé','🛡️'),
          o('sans_protection','Non protégé','💑'), o('masturbation','Masturbation','✨'),
        ]},
      { key: 'libido', label: 'Libido', type: 'single',
        options: [
          o('faible','Faible','📉'), o('normale','Normale','➡️'), o('elevee','Élevée','📈'),
        ]},
      { key: 'pratiquesIntimes', label: 'Pratiques', type: 'multi',
        options: [
          o('oral','Oral','💋'), o('vaginal','Vaginal','💑'),
          o('anal','Anal','🔒'), o('sextoys','Sextoys','✨'), o('autre','Autre','⭐'),
        ]},
      { key: 'orgasme', label: 'Orgasme', type: 'bool', icon: '⭐' },
    ],
  },

  // ── Médical & Contraception ── Bleu clair ────────────────────────────────
  {
    id: 'medical', label: 'Médical', icon: '🏥', color: '#0891B2',
    fields: [
      { key: 'contraceptionActifs', label: 'Contraception prise', type: 'multi',
        options: [
          o('pilule','Pilule','💊'), o('sterilet','Stérilet','🩺'),
          o('anneau','Anneau','◎'), o('patch','Patch','🩹'),
          o('implant','Implant','💉'), o('preservatif','Préservatif','🛡️'),
          o('diaphragme','Diaphragme','🔵'),
        ]},
      { key: 'testOvulation', label: 'Test d\'ovulation (OPK)', type: 'single',
        options: [o('negatif','Négatif','➖'), o('positif','Positif','➕')]},
      { key: 'fievre', label: 'Fièvre (°C)', type: 'number',
        unit: '°C', min: 36, max: 42, step: 0.1 },
    ],
  },

  // ── Mode Grossesse ── Rose chaud ─────────────────────────────────────────
  {
    id: 'grossesse', label: 'Grossesse', icon: '🤰', color: '#DB2777',
    showIf: (log) => log.enceinte,
    fields: [
      { key: 'enceinte', label: 'Enceinte', type: 'bool', icon: '🤰' },
      { key: 'grossesse.trimestre', label: 'Trimestre', type: 'single',
        options: [o('1','1er trimestre','1️⃣'), o('2','2e trimestre','2️⃣'), o('3','3e trimestre','3️⃣')]},
      { key: 'grossesse.symptomsGrossesse', label: 'Symptômes', type: 'multi',
        options: [
          o('nausees','Nausées','🤢'), o('vomissements','Vomissements','🤮'),
          o('fatigue','Fatigue','😴'), o('seins','Seins sensibles','🌡️'),
          o('vergetures','Vergetures','〰️'), o('oedemes','Œdèmes','💧'),
          o('reflux','Reflux','🔥'), o('contractions_braxton','Contractions de Braxton','⚡'),
        ]},
      { key: 'grossesse.superPouvoirs', label: 'Super-pouvoirs', type: 'multi',
        options: [
          o('energie','Énergie','⚡'), o('intuition','Intuition','🔮'),
          o('creativite','Créativité','🎨'), o('cheveux_brillants','Cheveux brillants','✨'),
          o('peau_rayonnante','Peau rayonnante','🌟'),
        ]},
      { key: 'grossesse.mouvementsFrequence', label: 'Mouvements fœtaux', type: 'single',
        options: [
          o('aucun','Aucun','—'), o('rares','Rares','👋'),
          o('normaux','Normaux','🤸'), o('frequents','Fréquents','🌀'),
        ]},
      { key: 'grossesse.douleursBasDos', label: 'Douleurs bas du dos', type: 'bool', icon: '🦴' },
    ],
  },

  // ── Note libre ── Gris ───────────────────────────────────────────────────
  {
    id: 'note', label: 'Note du jour', icon: '📝', color: '#6B7280',
    fields: [
      { key: 'noteDuJour', label: 'Note', type: 'text',
        placeholder: 'Écris librement ce que tu ressens…' },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 2. COMPOSANT LogCategoryAccordion
// ═══════════════════════════════════════════════════════════════════════════

/** Lit une valeur éventuellement imbriquée (ex: 'grossesse.trimestre') */
function getNestedValue(log, key) {
  const [parent, child] = key.split('.');
  return child ? (log[parent]?.[child] ?? null) : (log[key] ?? null);
}

/** Écrit une valeur éventuellement imbriquée */
function setNestedValue(log, key, value) {
  const [parent, child] = key.split('.');
  if (child) {
    if (!log[parent] || typeof log[parent] !== 'object') log[parent] = {};
    log[parent][child] = value;
  } else {
    log[key] = value;
  }
}

/**
 * Rend l'accordéon complet du journal dans un conteneur.
 * @param {Element}  container
 * @param {DailyLog} log        — objet DailyLog courant
 * @param {Function} onUpdate   — callback(log) appelé à chaque modification
 */
export function renderLogCategoryAccordion(container, log, onUpdate) {
  if (!container || !log) return;

  container.innerHTML = JOURNAL_CATEGORIES
    .filter(cat => !cat.showIf || cat.showIf(log))
    .map(cat => {
      const catColor   = cat.color;
      const hasValues  = cat.fields.some(f => {
        const v = getNestedValue(log, f.key);
        return v !== null && v !== false && !(Array.isArray(v) && !v.length);
      });

      const fieldsHtml = cat.fields.map(field => _renderField(field, log, catColor)).join('');

      return `
        <div class="lca-category collapsible-section" data-default-open="${hasValues}"
          style="--cat-color:${catColor}">
          <button type="button" class="lca-header collapsible-header"
            aria-expanded="${hasValues}">
            <span class="lca-cat-icon" aria-hidden="true">${cat.icon}</span>
            <span class="lca-cat-label">${cat.label}</span>
            ${hasValues ? `<span class="lca-active-badge">●</span>` : ''}
            <svg class="collapsible-chevron" viewBox="0 0 24 24" width="14" height="14"
              fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>
          <div class="collapsible-body lca-body">
            ${fieldsHtml}
          </div>
        </div>`;
    }).join('');

  // ─── Interactions ──────────────────────────────────────────────────────
  container.querySelectorAll('.log-card[data-field]').forEach(card => {
    card.addEventListener('click', () => {
      const { field, value, type } = card.dataset;
      const parsed = value === 'true' ? true : value === 'false' ? false : value;

      if (type === 'multi') {
        const arr = getNestedValue(log, field);
        const idx = arr.indexOf(parsed);
        if (idx >= 0) arr.splice(idx, 1); else arr.push(parsed);
        card.classList.toggle('active', idx < 0);
        card.setAttribute('aria-pressed', String(idx < 0));
      } else {
        const current = getNestedValue(log, field);
        const next    = current === parsed ? null : parsed;
        setNestedValue(log, field, next);
        const siblings = container.querySelectorAll(`.log-card[data-field="${field}"]`);
        siblings.forEach(s => {
          const match = s.dataset.value === (next ?? '__null__');
          s.classList.toggle('active', match);
          s.setAttribute('aria-pressed', String(match));
        });
      }
      onUpdate?.(log);
      _refreshBadge(container, log);
    });
  });

  // Booleans
  container.querySelectorAll('.log-bool[data-field]').forEach(btn => {
    btn.addEventListener('click', () => {
      const { field } = btn.dataset;
      const cur = getNestedValue(log, field);
      setNestedValue(log, field, !cur);
      btn.classList.toggle('active', !cur);
      btn.setAttribute('aria-pressed', String(!cur));
      onUpdate?.(log);
    });
  });

  // Inputs numériques + texte (debounce)
  container.querySelectorAll('.log-number[data-field], .log-textarea[data-field]').forEach(input => {
    let timer;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const { field } = input.dataset;
        const raw = input.value.trim();
        const v   = input.type === 'number' ? (raw ? parseFloat(raw) : null) : (raw || null);
        setNestedValue(log, field, v);
        onUpdate?.(log);
      }, 600);
    });
  });

  // Gestion de la case "enceinte" — réafficher si la catégorie grossesse change
  container.querySelector('[data-field="enceinte"]')?.addEventListener('click', () => {
    setTimeout(() => renderLogCategoryAccordion(container, log, onUpdate), 50);
  });

  // Collapsibles
  import('./collapse.js').then(({ initCollapsibles }) => {
    initCollapsibles(container, '.lca-category');
  });
}

function _renderField(field, log, catColor) {
  const value = getNestedValue(log, field.key);

  if (field.type === 'text') {
    return `<div class="lca-field">
      <div class="lca-field-label">${field.label}</div>
      <textarea class="note-input log-textarea" data-field="${field.key}"
        placeholder="${field.placeholder || ''}"
        rows="3" aria-label="${field.label}">${value ?? ''}</textarea>
    </div>`;
  }

  if (field.type === 'number') {
    return `<div class="lca-field lca-inline">
      <div class="lca-field-label">${field.label}</div>
      <div class="bbt-input-wrap" style="width:130px">
        <input type="number" class="bbt-input log-number" data-field="${field.key}"
          min="${field.min}" max="${field.max}" step="${field.step || 1}"
          value="${value ?? ''}" aria-label="${field.label}">
        <span class="bbt-unit">${field.unit}</span>
      </div>
    </div>`;
  }

  if (field.type === 'bool') {
    const active = !!value;
    return `<div class="lca-field">
      <button type="button" class="log-bool log-card${active ? ' active' : ''}"
        data-field="${field.key}" aria-pressed="${active}"
        aria-label="${field.label}" style="--cat-color:${catColor}">
        <span class="log-card-icon" aria-hidden="true">${field.icon || '✓'}</span>
        <span class="log-card-label">${field.label}</span>
      </button>
    </div>`;
  }

  // single ou multi
  const isMulti = field.type === 'multi';
  const selected = isMulti
    ? new Set(Array.isArray(value) ? value : [])
    : new Set(value !== null ? [value] : []);

  const cards = field.options.map(opt => {
    const active = selected.has(opt.id);
    return `<button type="button"
      class="log-card${active ? ' active' : ''}"
      data-field="${field.key}" data-value="${opt.id}" data-type="${field.type}"
      aria-pressed="${active}" aria-label="${opt.label}"
      style="--cat-color:${catColor}">
      <span class="log-card-icon" aria-hidden="true">${opt.icon}</span>
      <span class="log-card-label">${opt.label}</span>
    </button>`;
  }).join('');

  return `<div class="lca-field">
    <div class="lca-field-label">${field.label}</div>
    <div class="lca-grid">${cards}</div>
  </div>`;
}

function _refreshBadge(container, log) {
  container.querySelectorAll('.lca-category').forEach(cat => {
    const catId = cat.querySelector('[data-field]')?.dataset?.field?.split('.')?.[0];
    if (!catId) return;
    const schema = JOURNAL_CATEGORIES.find(c => c.fields.some(f => f.key.startsWith(catId)));
    const hasValues = schema?.fields.some(f => {
      const v = getNestedValue(log, f.key);
      return v !== null && v !== false && !(Array.isArray(v) && !v.length);
    });
    let badge = cat.querySelector('.lca-active-badge');
    if (hasValues && !badge) {
      badge = document.createElement('span');
      badge.className = 'lca-active-badge';
      badge.textContent = '●';
      cat.querySelector('.lca-header')?.appendChild(badge);
    } else if (!hasValues && badge) {
      badge.remove();
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. COMPOSANT CalendarDaySummary
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Panneau résumé pour un jour du calendrier.
 * Affiche uniquement les champs non-vides du DailyLog.
 * @param {Element}  container
 * @param {DailyLog} log
 * @param {number}   cycleDay
 * @param {string}   phaseName
 * @param {string}   dateStr     — YYYY-MM-DD
 */
export function renderCalendarDaySummary(container, log, cycleDay, phaseName, dateStr) {
  if (!container) return;

  if (!log) {
    container.innerHTML = `<div class="cds-empty">Aucune saisie ce jour.</div>`;
    return;
  }

  const items = log.getSummaryItems();
  if (!items.length) {
    container.innerHTML = `<div class="cds-empty">Aucune donnée enregistrée ce jour.</div>`;
    return;
  }

  // Grouper les items par catégorie schéma
  const byCategory = {};
  items.forEach(({ label, value }) => {
    const catName = _findCatForLabel(label) || 'Autres';
    if (!byCategory[catName]) byCategory[catName] = [];
    byCategory[catName].push(label ? `${label} : ${value}` : value);
  });

  const groups = Object.entries(byCategory).map(([cat, vals]) => `
    <div class="cds-group">
      <div class="cds-group-label">${cat}</div>
      <div class="cds-group-items">
        ${vals.map(v => `<span class="cds-item">${v}</span>`).join('')}
      </div>
    </div>`).join('');

  const dateDisplay = dateStr
    ? new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })
    : '';

  container.innerHTML = `
    <div class="cds-header">
      <div class="cds-title">
        ${cycleDay ? `<span class="cds-day">Jour ${cycleDay}</span>` : ''}
        ${phaseName ? `<span class="cds-phase">${phaseName}</span>` : ''}
      </div>
      ${dateDisplay ? `<div class="cds-date">${dateDisplay}</div>` : ''}
    </div>
    <div class="cds-body">${groups}</div>`;
}

// Mapping simplifié label → catégorie schéma
const _CAT_MAP = {
  'Flux':'Flux & Saignements', 'Spotting':'Flux & Saignements', 'Texture':'Flux & Saignements',
  'Protection':'Protections',
  'Émotion':'Émotions & SPM', 'Mental':'Émotions & SPM',
  'Énergie':'Énergie & Sommeil', 'Sommeil':'Énergie & Sommeil', 'Durée sommeil':'Énergie & Sommeil',
  'Douleur':'Douleurs',
  'Fringale':'Digestion', 'Transit':'Digestion', 'Gastrique':'Digestion',
  'Glaire':'État corporel', 'Peau':'État corporel', 'BBT':'État corporel', 'Poids':'État corporel',
  'Exercice':'Vie quotidienne', 'Stress':'Vie quotidienne', 'Toxique':'Vie quotidienne',
  'Sexualité':'Sexualité', 'Libido':'Sexualité', 'Orgasme':'Sexualité',
  'Contraception':'Médical', 'OPK':'Médical', 'Fièvre':'Médical',
  'Grossesse':'Grossesse',
  'Note':'Note du jour',
};
const _findCatForLabel = label => _CAT_MAP[label] || null;
