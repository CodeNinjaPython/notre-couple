export const MOODS = { tender:'🥰', playful:'😄', passionate:'🔥', spontaneous:'⚡' };
export const MOOD_LABELS = { tender:'Tendre', playful:'Joueur·se', passionate:'Passionné·e', spontaneous:'Spontané·e' };

// Lieux à deux niveaux : catégorie → endroits précis (révélés au clic).
export const LOCATIONS_TREE = [
  ['maison', '🏠 Maison', [['chambre','🛏️ Chambre'],['lit','🛌 Lit'],['canape','🛋️ Canapé'],['salle_de_bain','🚿 Salle de bain'],['douche','💧 Douche'],['cuisine','🍳 Cuisine'],['autre_piece','🚪 Autre pièce']]],
  ['voyage', '✈️ Voyage', [['hotel','🏨 Hôtel'],['location','🏡 Location'],['camping','⛺ Camping'],['public_voyage','👀 Lieu public']]],
  ['voiture', '🚗 Voiture', []],
  ['exterieur', '🌳 Extérieur', [['plage','🏖️ Plage'],['foret','🌲 Forêt / nature'],['piscine','🏊 Piscine'],['jardin','🌿 Jardin'],['public_ext','👀 Lieu public']]],
  ['autre', '📍 Autre', []],
];

// Carte plate code → libellé (affichage des sessions enregistrées).
export const LOCATIONS = {};
LOCATIONS_TREE.forEach(([code, label, subs]) => {
  LOCATIONS[code] = label;
  (subs || []).forEach(([sc, sl]) => { LOCATIONS[sc] = sl; });
});

// Protections proposées selon le genre (Elle ♀ = suit le cycle / Lui ♂).
export const PROTECTION_ELLE = [
  ['pilule', '💊 Pilule'], ['diu', '⚓ Stérilet (DIU)'], ['implant', '💉 Implant'],
  ['anneau_vaginal', '💍 Anneau vaginal'], ['patch', '🩹 Patch'],
  ['preservatif_interne', '♀️ Préservatif interne'], ['ligature_trompes', '✂️ Ligature des trompes'],
  ['menopause', '🌸 Ménopause'], ['retrait', '⬅️ Retrait'], ['sans_penetration', '🚫 Sans pénétration'],
];

export const PROTECTION_LUI = [
  ['preservatif', '🛡️ Préservatif'], ['prep', '💊 PrEP'], ['vasectomie', '✂️ Vasectomie'],
  ['retrait', '⬅️ Retrait'], ['sans_penetration', '🚫 Sans pénétration'],
];

// Options solo par genre (Elle ♀ / Lui ♂) + tags de contexte communs.
// Sous-options « support d'excitation » (communes Elle/Lui). Films olé olé porte
// la grille d'exemples demandée ; le reste a ses propres déclinaisons.
export const EXCITATION = [
  ['fantasme', '💭 Fantasme', [['souvenir','📷 Souvenir'],['imagine','✨ Scénario imaginé'],['partenaire','💑 Mon/ma partenaire']]],
  ['films_ole_ole', '🎬 Films olé olé', [
    ['amateur','🎥 Amateur'],['couple','💑 Couple'],['pov','👁️ POV'],['massage','💆 Massage'],
    ['hentai','🌸 Hentai'],['vintage','📼 Vintage'],['romantique','💕 Romantique'],['scenario','🎭 Scénario'],['audio_asmr','🎙️ Audio / ASMR'],
  ]],
  ['audio', '🎧 Audio érotique', [['asmr','🎙️ ASMR'],['histoire','📖 Histoire audio'],['gemissements','🔊 Gémissements']]],
  ['lecture', '📖 Lecture', [['roman','📕 Roman'],['fanfiction','✍️ Fanfiction'],['bd_manga','🗯️ BD / manga'],['forum','💬 Forum / récit']]],
];

export const SOLO_ELLE = {
  practices: [
    ['clitoridienne', '💧 Clitoridienne', [['doigts','✋ Doigts'],['vibro','🔮 Vibromasseur'],['ondes_air','💨 Ondes d\'air'],['douche','🚿 Pommeau de douche']]],
    ['penetration_vaginale', '🍑 Pénétration vaginale', [['doigts','✋ Doigts'],['sextoy','🍆 Sextoy / godemichet'],['fruit_legume','🥒 Fruit / légume'],['objet','📦 Autre objet']]],
    ['humping', '🛏️ Humping', [['traversin','🛋️ Traversin'],['peluche','🧸 Peluche'],['oreiller','🛌 Oreiller'],['objet','📦 Objet']]],
    ['anal', '🍑 Anal', [['doigt','✋ Doigt'],['plug','🍑 Plug'],['sextoy','🍆 Sextoy']]],
    ['mammaire', '🤱 Mammaire'], ['multi_zones', '✨ Multi-zones'],
  ],
  accessories: [
    ['vibromasseur', '🔮 Vibromasseur'], ['ondes_air', '💨 Ondes d\'air (Satisfyer…)'],
    ['dildo', '🍆 Godemichet'], ['plug_anal', '🍑 Plug anal'], ['huile_massage', '💧 Huile'], ['lubrifiant', '💧 Lubrifiant'],
  ],
  excitation: EXCITATION,
};

export const SOLO_LUI = {
  practices: [
    ['masturbation_manuelle', '✋ Masturbation manuelle', [['main_seche','✋ Main sèche'],['lubrifiant','💧 Lubrifiant'],['gaine','🧴 Gaine']]],
    ['friction', '🛏️ Frottement', [['coussin','🛋️ Coussin'],['oreiller','🛌 Oreiller'],['matelas','🛏️ Matelas / objet']]],
    ['anal_prostatique', '🍑 Anal / Prostatique', [['doigt','✋ Doigt'],['plug','🍑 Plug'],['sextoy','🍆 Sextoy prostate']]],
    ['edging', '⏳ Edging'], ['oral_accessoire', '👄 Oral (accessoire)'],
  ],
  accessories: [
    ['gaine', '🧴 Gaine (Fleshlight…)'], ['masturbateur_auto', '🔌 Masturbateur auto'],
    ['cockring', '💍 Anneau pénien'], ['plug_prostate', '🍑 Stim. prostate'], ['lubrifiant', '💧 Lubrifiant'],
  ],
  excitation: EXCITATION,
};

export const CONTEXT_MOMENT = [
  ['reveil', '🌅 Au réveil'],
  ['journee', '☀️ En journée'],
  ['avant_dormir', '🌙 Avant de dormir'],
  ['nuit', '🌃 En pleine nuit'],
];

// Le lieu/ambiance solo est saisi via le sélecteur « Lieu » de l'étape 1 — pas de doublon ici.
export const CONTEXT_RAPIDITE = [
  ['quickie', '⚡ Quickie'],
  ['longue', '🕯️ Longue / Sensorielle'],
];
