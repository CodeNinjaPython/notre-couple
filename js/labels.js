/**
 * labels.js — Formatage propre des codes de données (cycle + intimité).
 * formatTag('sans_protection') → '⚠️ Sans protection' ; 'fellation' → '💋 Fellation'.
 * Codes inconnus → humanisés (underscores → espaces, 1re lettre majuscule).
 * Valeurs déjà formatées (chiffres, °, /, ✓, h, min, kg) → laissées telles quelles.
 */

const TAG_FR = {
  // Flux / saignements
  legeres: '🩸 Légères', modere: '🩸 Modéré', abondant: '🩸 Abondant',
  marron: '🟤 Marron', rouge: '🔴 Rouge', taches: '🩸 Taches', rose: '🌸 Rosé',
  // Douleurs
  crampes: '⚡ Crampes', ovulation: '🥚 Ovulation', lombaires: '🦴 Lombaires',
  tete: '🤕 Maux de tête', migraine: '🤕 Migraine', migraine_aura: '🤕 Migraine avec aura',
  seins_sensibles: '🤱 Seins sensibles', seins_douloureux: '🤱 Seins douloureux',
  jambes_lourdes: '🦵 Jambes lourdes', articulaires: '🦴 Articulaires',
  // Émotions
  irritable: '😠 Irritable', triste: '😢 Triste', sautes_humeur: '🎢 Sautes d\'humeur',
  pas_controle: '😶‍🌫️ Pas le contrôle', sensible: '🥺 Sensible', heureuse: '😊 Heureuse',
  anxieuse: '😰 Anxieuse', en_colere: '😡 En colère', calme: '😌 Calme',
  reconnaissante: '🙏 Reconnaissante', confiante: '😎 Confiante', rien: '😐 Neutre',
  // Mental
  brouillard: '🌫️ Brouillard mental', stressee: '😣 Stressée', productive: '✅ Productive',
  inefficace: '🐌 Inefficace', distraite: '🦋 Distraite', pas_motivation: '🔋 Sans motivation',
  concentree: '🎯 Concentrée', motivee: '💪 Motivée', creative: '🎨 Créative',
  // Énergie
  epuisee: '🪫 Épuisée', fatiguee: '😴 Fatiguée', ok: '🙂 OK', en_forme: '🔥 En forme',
  // Sommeil
  dur_endormir: '🌙 Dur à s\'endormir', fatigue_reveil: '😪 Fatiguée au réveil',
  sommeil_agite: '🌀 Sommeil agité', sueurs_nocturnes: '💦 Sueurs nocturnes',
  reveil_en_forme: '☀️ Réveil en forme', reves_intenses: '💭 Rêves intenses',
  // Digestion / fringales
  sucre: '🍫 Sucré', sale: '🥨 Salé', gras: '🍟 Gras', epice: '🌶️ Épicé',
  ballonnements: '🎈 Ballonnements', flatulences: '💨 Flatulences', aigreurs: '🔥 Aigreurs',
  nausees: '🤢 Nausées', constipation: '🚽 Constipation', diarrhee: '🚽 Diarrhée',
  // Glaire / peau / cheveux / urine
  cremeuses: '🥛 Crémeuses', filantes: '🥚 Filantes', visqueuses: '🍯 Visqueuses',
  aqueuse: '💧 Aqueuse', aucune: '— Aucune', blanches: '🤍 Blanches',
  acne: '🔴 Acné', seche: '🌵 Sèche', grasse: '💧 Grasse', belle: '✨ Belle peau',
  normaux: '💇 Normaux', cuir_sec: '🌵 Cuir sec', racines_grasses: '💧 Racines grasses', secs: '🌾 Secs',
  envie_frequente: '🚽 Envie fréquente', brulure: '🔥 Brûlure', fuites: '💧 Fuites',
  // Social / loisirs / fête
  sociable: '🥳 Sociable', introversion: '🫥 Retrait', solidaire: '🤝 Solidaire', conflictuelle: '⚔️ Conflits',
  rencard: '💕 Rencard', vacances: '🏖️ Vacances', voyage: '✈️ Voyage',
  grosse_soiree: '🎉 Grosse soirée', alcool: '🍷 Alcool',
  // Exercice
  musculation: '🏋️ Musculation', marche: '🚶 Marche', yoga: '🧘 Yoga',
  course: '🏃 Course', natation: '🏊 Natation',
  // Sexualité — protection / rapports
  avec_protection: '🛡️ Protégé', sans_protection: '⚠️ Sans protection', retrait: '↩️ Retrait',
  // Sexualité — pratiques
  masturbation: '✋ Masturbation', fantasmes: '💭 Fantasmes',
  libido_elevee: '🔥 Libido élevée', libido_basse: '🧊 Libido basse',
  oral: '👅 Oral', touche_sensuel: '🤲 Touché sensuel', want_cute_kiss: '😘 Bisou',
  fellation: '💋 Fellation', cunnilingus: '👅 Cunnilingus', sodomie: '🍑 Sodomie',
  anulingus: '👅 Anulingus', penetration: '🍆 Pénétration', preliminaires: '🔥 Préliminaires',
  massage: '💆 Massage', humping: '🍑 Frottement', sexting: '📱 Sexting',
  vibromasseur: '🔮 Vibromasseur', plug: '🍑 Plug', menottes: '⛓️ Menottes',
  // Humeurs de session
  tender: '🥰 Tendre', playful: '😄 Joueur', passionate: '🔥 Passionné', spontaneous: '⚡ Spontané',
};

function humanize(s) {
  const t = String(s).replace(/_/g, ' ').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
}

/** Formate un code en « emoji Libellé FR ». Sûr pour l'affichage (texte простой). */
export function formatTag(code) {
  if (code == null) return '';
  const s = String(code);
  // Tags personnalisés « custom:Nom » saisis par l'utilisateur.
  if (s.startsWith('custom:')) return '✨ ' + humanize(s.slice(7));
  // Déjà formaté (chiffres, unités, symboles) → ne pas toucher.
  if (/[0-9✓°/]/.test(s)) return s;
  return TAG_FR[s] || humanize(s);
}
