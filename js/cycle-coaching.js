/**
 * cycle-coaching.js — Moteur de conseils bien-être par phase + profil de contraception.
 *
 * Implémente :
 *   §33-34 — Profil de contraception & altération du cycle (impact + conseils ciblés).
 *   §35-36 — Conseils holistiques par phase (sport, nutrition, productivité, sommeil, peau)
 *            avec un léger lien libido.
 *
 * N'effectue aucun appel réseau : pur calcul à partir de la phase (state.phaseName,
 * clés 'Menstruelle' | 'Folliculaire' | 'Ovulation' | 'Lutéale') et du profil stocké
 * localement (localStorage 'nc-contraception').
 */

// ═══════════════════════════════════════════════════════════════════════════
// 1. PROFILS DE CONTRACEPTION (§33-34)
// ═══════════════════════════════════════════════════════════════════════════

// cycleImpact :
//   'naturel'                       → vrai cycle conservé
//   'naturel_amplifie'              → cycle naturel, règles/crampes amplifiées (cuivre)
//   'bloque_saignements_artificiels'→ pas d'ovulation, hémorragies de privation (combinées)
//   'bloque_continu'                → ovulation bloquée, aménorrhée ou spotting (progestatifs)
const PROFILES = {
  naturel: {
    profil: 'Naturel',
    cycleImpact: 'naturel',
    analyse: 'Cycle hormonal 100 % naturel : vraie ovulation, vrai SPM, fluctuations réelles de la libido.',
    conseils: [],
  },
  A: {
    profil: 'Hormones combinées',
    cycleImpact: 'bloque_saignements_artificiels',
    analyse: 'Pas d\'ovulation ni de vrai cycle. Les saignements de la pause sont des hémorragies de privation artificielles. Libido potentiellement lissée, sécheresse fréquente.',
    conseils: [
      'Ne pas attendre de « pic de libido d\'ovulation » : il n\'y en a pas sous ce mode.',
      'Lubrifiant (eau ou silicone) recommandé en continu pour éviter les micro-lésions de friction.',
      'Oubli hors délai de sécurité → double protection (préservatif) pendant 7 jours.',
      'Possibilité d\'enchaîner les plaquettes pour supprimer les saignements lors d\'un événement.',
    ],
  },
  B: {
    profil: 'Progestatif seul',
    cycleImpact: 'bloque_continu',
    analyse: 'Climat hormonal stable à dominance progestative, ovulation bloquée. Aménorrhée fréquente ou spotting imprévisible. SPM souvent réduit.',
    conseils: [
      'Aménorrhée (absence de règles) : normale et sans danger sous ce mode.',
      'Spotting pendant un rapport → positions limitant le contact avec le col (cuillère, andromaque lente) ou non-pénétratif.',
      'Lubrifiant hyper-fluide si spotting fréquent, pour éviter les irritations de frottement.',
    ],
  },
  C: {
    profil: 'DIU au cuivre',
    cycleImpact: 'naturel_amplifie',
    analyse: 'Cycle naturel conservé. Le cuivre crée une inflammation locale bénigne qui amplifie le volume des règles (+20 à +50 %) et l\'intensité des crampes.',
    conseils: [
      'Pense à vérifier la présence des fils du DIU juste après les règles.',
    ],
  },
};

// Méthodes proposées dans le réglage → profil associé.
export const CONTRACEPTION_OPTIONS = [
  { id: 'aucune',              label: 'Aucune / méthode naturelle', profile: 'naturel' },
  { id: 'preservatif',         label: 'Préservatif',                profile: 'naturel' },
  { id: 'diu_cuivre',          label: 'DIU au cuivre',              profile: 'C' },
  { id: 'pilule_combinee',     label: 'Pilule combinée',            profile: 'A' },
  { id: 'anneau',              label: 'Anneau vaginal',             profile: 'A' },
  { id: 'patch',               label: 'Patch',                      profile: 'A' },
  { id: 'implant',             label: 'Implant',                    profile: 'B' },
  { id: 'diu_hormonal',        label: 'DIU hormonal',               profile: 'B' },
  { id: 'pilule_progestative', label: 'Pilule progestative',        profile: 'B' },
  { id: 'vasectomie',          label: 'Vasectomie / ligature',      profile: 'naturel' },
];

const CONTRACEPTION_KEY = 'nc-contraception';

export function getContraception() {
  return localStorage.getItem(CONTRACEPTION_KEY) || 'aucune';
}
export function setContraception(id) {
  localStorage.setItem(CONTRACEPTION_KEY, id);
}

/** Retourne le profil ({profil, cycleImpact, analyse, conseils}) pour une méthode. */
export function getContraceptionProfile(id = getContraception()) {
  const opt = CONTRACEPTION_OPTIONS.find(o => o.id === id) || CONTRACEPTION_OPTIONS[0];
  return { id: opt.id, label: opt.label, ...PROFILES[opt.profile] };
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. CONSEILS HOLISTIQUES PAR PHASE (§35-36)
//    Clés alignées sur state.phaseName de today.js.
// ═══════════════════════════════════════════════════════════════════════════

const PHASE_COACHING = {
  Menstruelle: {
    titre: 'Règles · hormones au plus bas',
    domains: [
      { icon: '🏃', title: 'Sport', tips: [
        'Récupération active : étirements, marche, yoga postural.',
        'Évite le cardio intense (HIIT) qui fatigue le système nerveux.',
      ] },
      { icon: '🥗', title: 'Nutrition', tips: [
        'Recharge le fer (viande rouge, lentilles) + vitamine C pour l\'absorption.',
        'Magnésium contre les spasmes, hydratation chaude (infusions).',
      ] },
      { icon: '🧠', title: 'Productivité', tips: [
        'Idéal pour l\'introspection, les bilans, le tri et la planification.',
        'Allège l\'agenda des réunions stressantes.',
      ] },
    ],
    libido: 'Libido souvent en berne — la chaleur et la douceur priment sur la performance.',
  },
  Folliculaire: {
    titre: 'Folliculaire · hausse des œstrogènes',
    domains: [
      { icon: '🏋️', title: 'Sport', tips: [
        'Fenêtre idéale pour la force : renforcement lourd, fractionné intensif.',
        'Le corps tolère bien l\'effort et récupère vite.',
      ] },
      { icon: '🧠', title: 'Productivité', tips: [
        'Apprentissage et mémorisation au top — lance les projets complexes, brainstorme.',
      ] },
      { icon: '🥗', title: 'Nutrition', tips: [
        'Métabolisme efficace : protéines de qualité, glucides complexes.',
        'Crucifères (brocoli, chou) pour aider le foie à métaboliser les œstrogènes.',
      ] },
    ],
    libido: 'Libido qui remonte avec les œstrogènes — l\'envie revient progressivement.',
  },
  Ovulation: {
    titre: 'Ovulation · pic d\'œstrogènes & testostérone',
    domains: [
      { icon: '🏃', title: 'Sport', tips: [
        'Endurance au maximum.',
        '⚠️ Échauffement rigoureux : laxité ligamentaire, risque accru d\'entorses.',
      ] },
      { icon: '🗣️', title: 'Productivité', tips: [
        'Aisance verbale et sociale au zénith — prises de parole, négociations, entretiens.',
      ] },
      { icon: '✨', title: 'Peau', tips: [
        'Glow hormonal maximal — routine cosmétique minimale et légère.',
      ] },
    ],
    libido: 'Pic de libido (œstrogènes + testostérone) — le moment fort du désir.',
  },
  Lutéale: {
    titre: 'Lutéale & SPM · dominance progestérone',
    domains: [
      { icon: '🚴', title: 'Sport', tips: [
        'Cardio modéré : endurance fondamentale, natation, vélo sur le plat.',
        'Évite de chercher des records de force brute.',
      ] },
      { icon: '🥑', title: 'Nutrition', tips: [
        'Anticipe les fringales sucrées avec de bons lipides (avocat, oléagineux) et des protéines l\'après-midi.',
        'Réduis le sel pour limiter la rétention d\'eau.',
      ] },
      { icon: '😴', title: 'Sommeil', tips: [
        'Endormissement plus difficile (+0,5 °C) : baisse la chambre d\'1 °C, coupe les écrans plus tôt.',
      ] },
      { icon: '🧴', title: 'Peau', tips: [
        'Risque d\'acné hormonale : renforce le double nettoyage du soir, soins purifiants doux.',
      ] },
      { icon: '🧠', title: 'Productivité', tips: [
        'Analyse et souci du détail maximisés — relecture, compta, admin en solo.',
        'Limite la surcharge cognitive (brouillard de fin de cycle).',
      ] },
    ],
    libido: 'Libido variable, souvent décroissante en fin de phase — la connexion émotionnelle prime.',
  },
};

// Conseils génériques quand le cycle est bloqué hormonalement (pas de phase réelle).
const GENERIC_COACHING = {
  titre: 'Climat hormonal stable',
  domains: [
    { icon: '🏃', title: 'Sport', tips: [
      'Pas de phase marquée : programme régulier, adapté à ta forme du jour.',
    ] },
    { icon: '🥗', title: 'Nutrition', tips: [
      'Alimentation stable : fer, protéines et hydratation au quotidien.',
    ] },
    { icon: '😴', title: 'Sommeil', tips: [
      'Rythme régulier — l\'absence de SPM facilite un sommeil plus stable.',
    ] },
  ],
  libido: 'Sans pic d\'ovulation, la libido est plus lissée : c\'est le contexte et le désir partagé qui la portent.',
};

// ═══════════════════════════════════════════════════════════════════════════
// 3. ASSEMBLAGE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Conseils du jour combinant phase du cycle et profil de contraception.
 * @param {string|null} phaseName — 'Menstruelle'|'Folliculaire'|'Ovulation'|'Lutéale'
 * @param {string} contraceptionId
 * @returns {{ phaseLabel, profileLabel, blocked, note, domains, libido, profileConseils }|null}
 */
export function getCycleCoaching(phaseName, contraceptionId = getContraception()) {
  const profile = getContraceptionProfile(contraceptionId);
  const blocked = profile.cycleImpact === 'bloque_saignements_artificiels'
               || profile.cycleImpact === 'bloque_continu';

  // Cycle bloqué : les phases sont artificielles → conseils génériques + profil.
  if (blocked) {
    return {
      phaseLabel: GENERIC_COACHING.titre,
      profileLabel: profile.label,
      blocked: true,
      note: profile.analyse,
      domains: GENERIC_COACHING.domains,
      libido: GENERIC_COACHING.libido,
      profileConseils: profile.conseils,
    };
  }

  const base = PHASE_COACHING[phaseName];
  if (!base) return null;

  // Copie profonde légère des domaines pour pouvoir enrichir sans muter la source.
  const domains = base.domains.map(d => ({ ...d, tips: [...d.tips] }));

  // DIU cuivre : amplification des règles → conseils ciblés en phase menstruelle.
  if (profile.cycleImpact === 'naturel_amplifie' && phaseName === 'Menstruelle') {
    domains.unshift({ icon: '🩸', title: 'Flux abondant (cuivre)', tips: [
      'Flux amplifié (+20 à +50 %) : anticipe la logistique (protections dédiées, rapports sous la douche).',
      'Jours 1 à 3 : limite les pénétrations profondes (col bas, utérus contracté) pour éviter les spasmes.',
      'Privilégie les positions de décharge lombaire (cuillère, lotus).',
    ] });
  }

  return {
    phaseLabel: base.titre,
    profileLabel: profile.label,
    blocked: false,
    note: profile.cycleImpact === 'naturel_amplifie' ? profile.analyse : null,
    domains,
    libido: base.libido,
    profileConseils: profile.conseils,
  };
}
