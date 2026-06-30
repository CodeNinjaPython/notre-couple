/**
 * daily-log-ui.js — Composants UI pour le journal quotidien DailyLog.
 *   1. JOURNAL_CATEGORIES — schéma complet des catégories + options
 *   2. renderLogCategoryAccordion() — accordéon dynamique avec grille de cards
 *   3. renderCalendarDaySummary()  — panneau résumé pour un jour du calendrier
 */
import { formatTag } from './labels.js';

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
          o('aucun','Aucun','○'), o('legeres','Légères','🩸'),
          o('modere','Modérées','🩸🩸'), o('abondant','Abondantes','🩸🩸🩸'),
          o('tres_abondant','Très abondant','🩸🩸🩸🩸'),
        ]},
      { key: 'spotting', label: 'Spotting', type: 'single',
        options: [
          o('rouge','Rouge','🔴'), o('marron','Marron','🟤'),
          o('rose','Rose','🩷'),   o('taches','Taches','•'),
        ]},
      { key: 'textureFlux', label: 'Texture', type: 'single',
        options: [
          o('fluide','Fluide','💧'), o('visqueux','Visqueux','🍯'),
          o('normale','Normale','◯'), o('epaisse','Épaisse','🔶'),
          o('caillotsRoses','Caillots roses','💗'), o('caillotsNoirs','Caillots foncés','⚫'),
        ]},
    ],
  },

  // ── Protections ── Orange ────────────────────────────────────────────────
  {
    id: 'protections', label: 'Protections', icon: '🩱', color: '#F97316',
    fields: [
      { key: 'protectionType', label: 'Type de protection', type: 'single',
        options: [
          o('tampon','Tampon','◎'), o('serviette','Serviette','📄'),
          o('protegeSlip','Protège-slip','🩲'), o('coupe','Coupe menstruelle','☕'),
          o('culotte_regles','Culotte de règles','👙'),
        ]},
      { key: 'protectionFreq', label: 'Fréquence de changement', type: 'single',
        options: [
          o('normal','Normal','✅'), o('frequent','Fréquent','⚠️'), o('tres_frequent','Très fréquent','🔴'),
        ]},
    ],
  },

  // ── Émotions & SPM ── Violet ─────────────────────────────────────────────
  {
    id: 'emotions', label: 'Émotions & SPM', icon: '😊', color: '#7C5CFC',
    fields: [
      { key: 'emotions', label: 'Humeur', type: 'multi',
        options: [
          o('rien','Rien','—'), o('heureuse','Heureuse','😊'), o('triste','Triste','😢'),
          o('en_colere','En colère','😠'), o('sensible','Sensible','🥹'),
          o('anxieuse','Anxieuse','😰'), o('irritable','Irritable','😤'),
          o('stressee','Stressée','😫'), o('calme','Calme','😌'),
          o('confiante','Confiante','💪'), o('reconnaissante','Reconnaissante','🙏'),
          o('sautes_humeur',"Sautes d'humeur",'🎭'),
          o('pas_controle','Pas en contrôle','😵'),
        ]},
      { key: 'etatCognitif', label: 'État cognitif', type: 'multi',
        options: [
          o('brouillard','Brouillard mental','🌫️'), o('trous_memoire','Trous de mémoire','🕳️'),
          o('distraite','Distraite','😶'), o('hyper_concentree','Hyper-concentrée','🎯'),
          o('creative','Créative','💡'), o('pas_motivation','Pas de motivation','📉'),
          o('concentree','Concentrée','✅'), o('motivee','Motivée','🚀'),
          o('productive','Productive','⚡'), o('inefficace','Inefficace','🚫'),
        ]},
    ],
  },

  // ── Énergie & Sommeil ── Ambre ──────────────────────────────────────────
  {
    id: 'energie_sommeil', label: 'Énergie & Sommeil', icon: '⚡', color: '#D97706',
    fields: [
      { key: 'niveauEnergie', label: 'Énergie', type: 'single',
        options: [
          o('epuisee','Épuisée','🪫'), o('fatiguee','Fatiguée','😴'),
          o('ok','OK','🔋'), o('en_forme','En forme','⚡'),
        ]},
      { key: 'symptomesSommeil', label: 'Qualité du sommeil', type: 'multi',
        options: [
          o('dur_endormir',"Dur de s'endormir",'🌙'), o('reveil_en_forme','Réveil en forme','☀️'),
          o('fatigue_reveil','Fatigue au réveil','😩'), o('sommeil_agite','Sommeil agité','🌀'),
          o('insomnie','Insomnie','🚫'), o('reves_intenses','Rêves intenses','💭'),
          o('sueurs_nocturnes','Sueurs nocturnes','💦'),
        ]},
      { key: 'dureeSommeil', label: 'Durée de sommeil (h)', type: 'number',
        unit: 'h', min: 0, max: 24, step: 0.5 },
    ],
  },

  // ── Douleurs ── Rouge vif ────────────────────────────────────────────────
  {
    id: 'douleurs', label: 'Douleurs', icon: '💊', color: '#DC2626',
    fields: [
      { key: 'douleursPelviennes', label: 'Zone pelvienne', type: 'multi',
        options: [
          o('aucune','Aucune douleur','✅'), o('crampes','Crampes','🔥'),
          o('ovulation','Ovulation','🥚'), o('tiraillements','Tiraillements','〰️'),
        ]},
      { key: 'douleursCorps', label: 'Zone corporelle', type: 'multi',
        options: [
          o('seins_sensibles','Seins sensibles','🌡️'), o('seins_douloureux','Seins douloureux','💠'),
          o('lombaires','Lombaires','🦴'), o('migraine','Migraine','💥'),
          o('migraine_aura','Migraine avec aura','✨'),
          o('tete','Mal de tête','🤕'), o('articulaires','Articulaires','🦿'),
          o('jambes_lourdes','Jambes lourdes','🦵'),
        ]},
    ],
  },

  // ── Digestion ── Vert lime ───────────────────────────────────────────────
  {
    id: 'digestion', label: 'Digestion', icon: '🥑', color: '#16A34A',
    fields: [
      { key: 'fringales', label: 'Fringales & Appétit', type: 'multi',
        options: [
          o('sucre','Sucré','🍫'), o('sale','Salé','🧂'),
          o('gras','Gras','🍟'), o('epice','Épicé','🌶️'),
          o('perte_appetit','Perte d\'appétit','🚫'), o('nausees','Nausées','🤢'),
        ]},
      { key: 'transit', label: 'Transit', type: 'single',
        options: [
          o('ok','OK','✅'), o('constipation','Constipation','🔒'),
          o('diarrhee','Diarrhée','💨'), o('ballonnements','Ballonnements','🫃'),
          o('flatulences','Flatulences','💨'), o('aigreurs','Aigreurs','🔥'),
        ]},
    ],
  },

  // ── État corporel ── Bleu ────────────────────────────────────────────────
  {
    id: 'corps', label: 'État corporel', icon: '🌿', color: '#4278C4',
    fields: [
      { key: 'glaireCervicale', label: 'Glaire cervicale', type: 'single',
        options: [
          o('aucune','Aucune','—'), o('visqueuses','Visqueuses','🍯'),
          o('cremeuses','Crémeuses','☁️'), o('blanches','Blanches','⬜'),
          o('filantes','Filantes','🥚'), o('aqueuse','Aqueuse','💧'),
        ]},
      { key: 'urineSymptomes', label: 'Urine', type: 'multi',
        options: [
          o('envie_frequente','Envie fréquente','🚽'),
          o('brulure','Sensation de brûlure','🔥'),
          o('fuites','Fuites','💧'),
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
      { key: 'vieSociale', label: 'Vie sociale', type: 'multi',
        options: [
          o('sociable','Sociable','😄'), o('introversion','Introversion','🙈'),
          o('solidaire','Solidaire','🤝'), o('conflictuelle','Conflictuelle','⚡'),
        ]},
      { key: 'loisirs', label: 'Loisirs & Voyages', type: 'multi',
        options: [
          o('vacances','Vacances','🏖️'), o('voyage','Voyage','✈️'), o('rencard','Rencard','💑'),
        ]},
      { key: 'fete', label: 'Fête & Sorties', type: 'multi',
        options: [
          o('alcool','Alcool','🍷'), o('cigarettes','Cigarettes','🚬'),
          o('grosse_soiree','Grosse soirée','🥂'), o('gueule_de_bois','Gueule de bois','😵'),
        ]},
      { key: 'exercice', label: 'Exercice', type: 'single',
        options: [
          o('aucun','Aucun','—'), o('course','Course','🏃'), o('natation','Natation','🏊'),
          o('yoga','Yoga','🧘'), o('velo','Vélo','🚴'), o('marche','Marche','🚶'),
          o('musculation','Musculation','🏋️'),
        ]},
      { key: 'meditation', label: 'Méditation (min)', type: 'number',
        unit: 'min', min: 0, max: 180, step: 5 },
    ],
  },

  // ── Sexualité ── Rose ────────────────────────────────────────────────────
  {
    id: 'sexualite', label: 'Sexualité', icon: '❤️', color: '#E84375',
    fields: [
      { key: 'rapports', label: 'Activité principale', type: 'single',
        options: [
          o('avec_protection','Avec protection','🛡️'),
          o('sans_protection','Sans protection','💑'),
          o('retrait','Retrait','⬅️'),
          o('pas_sexe','Pas de sexe','—'),
        ]},
      { key: 'libidoPratiques', label: 'Pratiques', type: 'multi',
        options: [
          o('oral','Sexe oral','💋'),
          o('touche_sensuel','Touché sensuel','🤲'),
          o('want_cute_kiss','Bisous tendres','😘'),
          o('masturbation','Masturbation','✨'),
          o('sexting','Sexting','📱'),
          o('fantasmes','Fantasmes','💭'),
          o('libido_elevee','Libido haute','📈'),
          o('libido_basse','Libido basse','📉'),
        ]},
      { key: 'libidoScale', label: 'Ma libido (1-5)', type: 'scale', min: 1, max: 5 },
      { key: 'libidoPartenaireScale', label: 'Libido partenaire (1-5)', type: 'scale', min: 1, max: 5 },
      { key: 'orgasme', label: 'Orgasme (moi)', type: 'bool', icon: '⭐' },
      { key: 'orgasmes.toi.count', label: 'Nombre d\'orgasmes (moi)', type: 'number',
        unit: '', min: 0, max: 10, step: 1 },
      { key: 'orgasmes.toi.types', label: 'Type (moi)', type: 'multi',
        options: [
          o('clitoridien','Clitoridien','🌸'), o('vaginal','Vaginal','💜'),
          o('mixte','Mixte','💫'), o('multiple','Multiple','🌟'), o('anal','Anal','🔮'),
        ]},
      { key: 'orgasmes.partenaire.count', label: 'Nombre d\'orgasmes (partenaire)', type: 'number',
        unit: '', min: 0, max: 10, step: 1 },
      { key: 'orgasmes.partenaire.types', label: 'Type (partenaire)', type: 'multi',
        options: [
          o('prostatique','Prostatique','💙'), o('pénien','Pénien','💙'),
          o('multiple','Multiple','🌟'), o('retardé','Retardé','⏳'),
        ]},
      { key: 'satisfactionSexuelle',   label: 'Ma satisfaction (1-10)', type: 'scale', min: 1, max: 10 },
      { key: 'satisfactionPartenaire', label: 'Satisfaction partenaire (1-10)', type: 'scale', min: 1, max: 10 },
      { key: 'positionsUtilisees', label: 'Positions', type: 'multi',
        options: [
          o('missionnaire','Missionnaire','💑'), o('levrette','Levrette','🍑'),
          o('cowgirl','Cowgirl','🤠'), o('reverse_cowgirl','Reverse Cowgirl','🔄'),
          o('cuillere','Cuillère','🥄'), o('lotus','Lotus','🌸'),
          o('69','69','💋'), o('debout','Debout','🧍'),
          o('doggy','Doggy style','🐕'), o('amazon','Amazon','👑'),
          o('spooning','Spooning','🤗'), o('mur','Contre le mur','🧱'),
          o('table','Sur la table','🍽️'),
        ]},
      { key: 'positionsPersonnalisees', label: 'Positions perso', type: 'tags',
        placeholder: 'Ajouter une position…' },
      { key: 'masturElle', label: 'Masturbation — elle', type: 'multi',
        options: [
          o('doigts_clito','Doigts clito','🖐️'), o('doigts_interne','Doigts interne','🤞'),
          o('humping','Humping','🛏️'), o('douche','Pommeau de douche','🚿'),
          o('vibromasseur','Vibromasseur','🌙'), o('dildo','Dildo','💜'),
          o('suction','Suction toy','🌀'), o('wand','Wand','⚡'),
          o('plug','Plug anal','💎'), o('squirting','Squirting','💦'),
          o('edging','Edging','🌡️'), o('mutuelle','Mutuelle','💑'),
          o('regarder','En regardant l\'autre','👁️'),
        ]},
      { key: 'masturLui', label: 'Masturbation — lui', type: 'multi',
        options: [
          o('main','Main','🖐️'), o('fleshlight','Fleshlight','🔮'),
          o('prostate','Prostate massager','💙'), o('edging','Edging','🌡️'),
          o('ruined','Ruined orgasm','⏸️'), o('mutuelle','Mutuelle','💑'),
          o('regarder','En regardant l\'autre','👁️'),
        ]},
      { key: 'sextoys', label: 'Sextoys utilisés', type: 'multi',
        options: [
          o('vibromasseur','Vibromasseur','🌙'), o('gode','Gode','💜'),
          o('plug','Plug anal','💎'), o('anneau','Anneau pénien','💍'),
          o('sextoy_couple','Sextoy couple','💑'),
        ]},
      { key: 'lubrifiant', label: 'Lubrifiant', type: 'bool', icon: '💧' },
      { key: 'aftercare', label: 'Aftercare fait', type: 'bool', icon: '🤗' },
      { key: 'aftercareNote', label: 'Note aftercare', type: 'text',
        placeholder: 'Ce qui a aidé à se sentir bien après…', maxlength: 500 },
      { key: 'kinksDate', label: 'Kinks pratiqués', type: 'tags',
        placeholder: 'Ajouter un kink…' },
      { key: 'notePrivee', label: 'Note privée', type: 'text',
        placeholder: 'Visible par toi seul·e — non partagée avec ton partenaire', maxlength: 2000 },
    ],
  },

  // ── Facteurs couple ── Rose vif ─────────────────────────────────────────
  {
    id: 'couple', label: 'Facteurs couple', icon: '💑', color: '#E84375',
    fields: [
      { key: 'stressCouple', label: 'Ambiance du couple', type: 'single',
        options: [
          o('bonne_ambiance','Super bien','💑'),
          o('aucun','Normal','😊'),
          o('tension','Tensions','⚡'),
          o('dispute','Dispute','🌩️'),
          o('reconciliation','Réconciliation','🤝'),
        ]},
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

  // ── Périménopause ── Gris bleu ───────────────────────────────────────────
  {
    id: 'perimenopauses', label: 'Périménopause', icon: '🌸', color: '#7E5BAE',
    fields: [
      { key: 'perimenopauses.bouffeesChaleur', label: 'Bouffées de chaleur', type: 'single',
        options: [
          o('pas_aujourd_hui','Pas aujourd\'hui','✅'),
          o('legeres','Légères','🌡️'), o('moderees','Modérées','🔥'), o('intenses','Intenses','🔥🔥'),
        ]},
      { key: 'perimenopauses.secheresseVaginale', label: 'Sécheresse vaginale', type: 'bool', icon: '💧' },
    ],
  },

  // ── Note & Tags ── Gris ───────────────────────────────────────────────────
  {
    id: 'note', label: 'Note & Tags', icon: '📝', color: '#6B7280',
    fields: [
      { key: 'noteDuJour', label: 'Note du jour (3000 caractères max)', type: 'text',
        placeholder: 'Écris librement ce que tu ressens…', maxlength: 3000 },
      { key: 'tags', label: 'Tags personnalisés', type: 'tags',
        placeholder: 'Ajouter un tag…' },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 2. COMPOSANT LogCategoryAccordion
// ═══════════════════════════════════════════════════════════════════════════

/** Lit une valeur imbriquée à profondeur arbitraire (ex: 'orgasmes.toi.count') */
function getNestedValue(log, key) {
  return key.split('.').reduce((obj, k) => (obj != null ? (obj[k] ?? null) : null), log);
}

/** Écrit une valeur imbriquée à profondeur arbitraire */
function setNestedValue(log, key, value) {
  const parts = key.split('.');
  const last  = parts.pop();
  const parent = parts.reduce((obj, k) => {
    if (!obj[k] || typeof obj[k] !== 'object') obj[k] = {};
    return obj[k];
  }, log);
  parent[last] = value;
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

  // Tags personnalisés
  container.querySelectorAll('.tag-input').forEach(input => {
    const wrap = input.closest('.tags-wrap');
    const field = wrap?.dataset?.field;
    input.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ',') return;
      e.preventDefault();
      const tag = input.value.trim().replace(/,/g, '');
      if (!tag) return;
      const arr = getNestedValue(log, field) || [];
      if (!arr.includes(tag)) { arr.push(tag); setNestedValue(log, field, arr); onUpdate?.(log); }
      input.value = '';
      // Re-render les pills
      wrap.querySelectorAll('.tag-pill').forEach(p => p.remove());
      arr.forEach(t => {
        const pill = document.createElement('span');
        pill.className = 'tag-pill';
        pill.innerHTML = `${t}<button type="button" class="tag-remove" data-tag="${t}" aria-label="Retirer ${t}">×</button>`;
        wrap.insertBefore(pill, input);
      });
      wrap.querySelectorAll('.tag-remove').forEach(btn => {
        btn.addEventListener('click', () => {
          const arr2 = getNestedValue(log, field) || [];
          const idx  = arr2.indexOf(btn.dataset.tag);
          if (idx >= 0) arr2.splice(idx, 1);
          setNestedValue(log, field, arr2);
          btn.closest('.tag-pill').remove();
          onUpdate?.(log);
        });
      });
    });
  });

  // Compteur note
  container.querySelectorAll('.log-textarea').forEach(ta => {
    const counter = ta.nextElementSibling;
    if (!counter?.classList.contains('note-counter')) return;
    ta.addEventListener('input', () => {
      const max = parseInt(ta.getAttribute('maxlength'));
      counter.textContent = `${ta.value.length}/${max}`;
      counter.style.color = ta.value.length > max * 0.9 ? 'var(--red)' : 'var(--faint)';
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

  if (field.type === 'tags') {
    const tagsArr = Array.isArray(value) ? value : [];
    return `<div class="lca-field">
      <div class="lca-field-label">${field.label}</div>
      <div class="tags-wrap" data-field="${field.key}">
        ${tagsArr.map(t => `<span class="tag-pill">${t}<button type="button" class="tag-remove" data-tag="${t}" aria-label="Retirer ${t}">×</button></span>`).join('')}
        <input type="text" class="tag-input" placeholder="${field.placeholder || 'Ajouter…'}"
          aria-label="Ajouter un tag personnalisé">
      </div>
    </div>`;
  }

  if (field.type === 'text') {
    return `<div class="lca-field">
      <div class="lca-field-label">${field.label}</div>
      <textarea class="note-input log-textarea" data-field="${field.key}"
        placeholder="${field.placeholder || ''}"
        rows="3" maxlength="${field.maxlength || 10000}"
        aria-label="${field.label}">${value ?? ''}</textarea>
      ${field.maxlength ? `<div class="note-counter" aria-live="polite">${(value ?? '').length}/${field.maxlength}</div>` : ''}
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

  if (field.type === 'scale') {
    const val  = getNestedValue(log, field.key);
    const min  = field.min ?? 1;
    const max  = field.max ?? 5;
    const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    const cards = steps.map(n => {
      const active = val === n;
      return `<button type="button"
        class="log-card log-scale-btn${active ? ' active' : ''}"
        data-field="${field.key}" data-value="${n}" data-type="single"
        aria-pressed="${active}" aria-label="${field.label} ${n}"
        style="--cat-color:${catColor}">
        <span class="log-card-label">${n}</span>
      </button>`;
    }).join('');
    return `<div class="lca-field">
      <div class="lca-field-label">${field.label}</div>
      <div class="lca-grid lca-scale-grid">${cards}</div>
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
    byCategory[catName].push(formatTag(value));
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
  'Fringale':'Digestion', 'Transit':'Digestion',
  'Glaire':'État corporel', 'Peau':'État corporel', 'Urine':'État corporel',
  'BBT':'État corporel', 'Poids':'État corporel',
  'Exercice':'Vie quotidienne', 'Méditation':'Vie quotidienne',
  'Social':'Vie quotidienne', 'Loisir':'Vie quotidienne', 'Fête':'Vie quotidienne',
  'Sexualité':'Sexualité', 'Pratique':'Sexualité',
  'Libido toi':'Sexualité', 'Libido partenaire':'Sexualité',
  'Orgasme':'Sexualité', 'Orgasmes toi':'Sexualité', 'Orgasmes partenaire':'Sexualité',
  'Satisfaction toi':'Sexualité', 'Satisfaction partenaire':'Sexualité',
  'Sextoy':'Sexualité', 'Lubrifiant':'Sexualité', 'Aftercare':'Sexualité', 'Kink':'Sexualité',
  'Couple':'Facteurs couple',
  'Contraception':'Médical', 'OPK':'Médical', 'Fièvre':'Médical',
  'Grossesse':'Grossesse', 'Super-pouvoir':'Grossesse',
  'Périménopause':'Périménopause',
  'Note':'Note du jour', 'Tag':'Note du jour',
};
const _findCatForLabel = label => _CAT_MAP[label] || null;
