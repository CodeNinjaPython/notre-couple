/**
 * intimacy-library.js — Bibliothèque offline de positions + suggestions contextuelles.
 * Tout le contenu est embarqué en JS (aucun appel API, fonctionne hors-ligne).
 * SVG minimalistes line-art : silhouettes abstraites, style haut de gamme.
 * Charte : rose (#E84375) = elle · bleu (#4278C4) = lui.
 */
import { localDateStr } from './date-utils.js';

// ─── SVG builder : formes abstraites (ellipse + cercle) ────────────────────
const E = '#E84375'; // elle
const B = '#4278C4'; // lui
const SW = '1.8';    // stroke-width commun

// Traits arrondis (linecap/linejoin) → rendu « sketch filaire » continu.
const svg = (body) =>
  `<svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g fill="none" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;

// Corps : capsule (forme de stade) au lieu d'une ellipse → lit comme un
// torse/membre continu, plus « dessiné » que des ovales disjoints.
const body  = (cx, cy, rx, ry, rot, col) => {
  const sx = rx - ry; // demi-longueur de la partie droite
  if (sx <= 0)
    return `<circle cx="${cx}" cy="${cy}" r="${rx}" transform="rotate(${rot} ${cx} ${cy})" stroke="${col}" stroke-width="${SW}"/>`;
  const x1 = cx - sx, x2 = cx + sx, yt = cy - ry, yb = cy + ry;
  return `<path d="M ${x1} ${yt} L ${x2} ${yt} A ${ry} ${ry} 0 0 1 ${x2} ${yb} L ${x1} ${yb} A ${ry} ${ry} 0 0 1 ${x1} ${yt} Z" transform="rotate(${rot} ${cx} ${cy})" stroke="${col}" stroke-width="${SW}"/>`;
};
const head  = (cx, cy, col) =>
  `<circle cx="${cx}" cy="${cy}" r="4.2" stroke="${col}" stroke-width="${SW}"/>`;

// ─── Bibliothèque de 40 positions ─────────────────────────────────────────

export const POSITIONS = [
  // ── Face à face couché ──────────────────────────────────────────────────
  {
    id: 'missionary', label: 'Missionnaire',
    desc: 'Contact visuel, proximité émotionnelle maximale.',
    intensity: 1, comfort: 1, category: 'face-a-face',
    phases: ['folliculaire', 'ovulation'],
    svg: svg(
      head(12,20,E) + body(30,25,18,7,0,E) +
      head(48,38,B) + body(30,35,18,7,0,B)
    ),
  },
  {
    id: 'missionary_legs_up', label: 'Jambes levées',
    desc: 'Variante missionnaire, pénétration plus profonde.',
    intensity: 2, comfort: 2, category: 'face-a-face',
    phases: ['ovulation', 'folliculaire'],
    svg: svg(
      head(12,30,E) + body(28,32,16,7,0,E) +
      `<line x1="20" y1="28" x2="30" y2="14" stroke="${E}" stroke-width="${SW}"/>` +
      head(48,28,B) + body(32,28,16,7,0,B)
    ),
  },
  {
    id: 'missionary_pillow', label: 'Missionnaire + coussin',
    desc: 'Coussin sous les hanches, angle confortable.',
    intensity: 1, comfort: 1, category: 'face-a-face',
    phases: ['menstruelle', 'folliculaire'],
    svg: svg(
      head(12,24,E) + body(30,28,17,7,0,E) +
      `<rect x="18" y="30" width="24" height="5" rx="2" stroke="${E}" stroke-width="1"/>` +
      head(48,36,B) + body(30,38,17,7,0,B)
    ),
  },
  {
    id: 'face_hug', label: 'Face à face enlacé',
    desc: 'Allongés face à face, mouvements lents et doux.',
    intensity: 1, comfort: 1, category: 'face-a-face',
    phases: ['menstruelle', 'luteale'],
    svg: svg(
      head(18,18,E) + body(26,28,10,6,-20,E) +
      head(42,18,B) + body(34,28,10,6,20,B)
    ),
  },

  // ── Côté à côté / cuillère ──────────────────────────────────────────────
  {
    id: 'spoon', label: 'Cuillère',
    desc: 'Intimate et reposant, idéal pour les moments doux.',
    intensity: 1, comfort: 1, category: 'cote-a-cote',
    phases: ['menstruelle', 'luteale'],
    svg: svg(
      head(14,24,E) + body(30,28,16,7,0,E) +
      head(10,32,B) + body(28,36,16,7,0,B)
    ),
  },
  {
    id: 'reverse_spoon', label: 'Cuillère inversée',
    desc: 'Elle enveloppe, il se laisse aller.',
    intensity: 1, comfort: 1, category: 'cote-a-cote',
    phases: ['menstruelle', 'folliculaire'],
    svg: svg(
      head(46,24,E) + body(30,28,16,7,0,E) +
      head(50,32,B) + body(32,36,16,7,0,B)
    ),
  },
  {
    id: 'tandem', label: 'Tandem',
    desc: 'Côte à côte, même direction, rythme commun.',
    intensity: 2, comfort: 2, category: 'cote-a-cote',
    phases: ['folliculaire', 'ovulation'],
    svg: svg(
      head(14,22,E) + body(30,26,16,6,-15,E) +
      head(12,36,B) + body(30,38,16,6,-10,B)
    ),
  },

  // ── Elle au-dessus ──────────────────────────────────────────────────────
  {
    id: 'cowgirl', label: 'Cavalière',
    desc: 'Elle choisit le rythme et la profondeur.',
    intensity: 2, comfort: 1, category: 'elle-dessus',
    phases: ['folliculaire', 'ovulation'],
    svg: svg(
      head(30,10,E) + body(30,22,7,14,0,E) +
      head(46,38,B) + body(30,42,18,7,0,B)
    ),
  },
  {
    id: 'reverse_cowgirl', label: 'Cavalière inversée',
    desc: 'Elle lui tourne le dos, contrôle total du mouvement.',
    intensity: 2, comfort: 2, category: 'elle-dessus',
    phases: ['ovulation', 'folliculaire'],
    svg: svg(
      head(30,10,B) + body(30,22,7,14,0,E) +
      head(14,38,B) + body(30,42,18,7,0,B)
    ),
  },
  {
    id: 'cowgirl_leaning', label: 'Cavalière penchée',
    desc: 'Elle se penche en avant pour plus de contact.',
    intensity: 2, comfort: 1, category: 'elle-dessus',
    phases: ['ovulation'],
    svg: svg(
      body(24,20,14,6,-30,E) + head(14,12,E) +
      head(46,38,B) + body(30,42,18,7,0,B)
    ),
  },
  {
    id: 'amazon', label: 'Amazone',
    desc: 'Elle contrôle le rythme en position verticale.',
    intensity: 3, comfort: 2, category: 'elle-dessus',
    phases: ['ovulation'],
    svg: svg(
      head(30,8,E) + body(30,20,6,12,0,E) +
      head(14,40,B) + body(30,44,16,8,20,B)
    ),
  },

  // ── Par derrière ────────────────────────────────────────────────────────
  {
    id: 'doggy', label: 'À quatre pattes',
    desc: 'Pénétration profonde, grande liberté de mouvement.',
    intensity: 2, comfort: 2, category: 'par-derriere',
    phases: ['folliculaire', 'ovulation'],
    svg: svg(
      head(16,20,E) + body(30,26,16,7,15,E) +
      `<line x1="16" y1="26" x2="16" y2="38" stroke="${E}" stroke-width="${SW}"/>` +
      head(48,30,B) + body(34,34,12,7,-5,B)
    ),
  },
  {
    id: 'doggy_low', label: 'À quatre pattes bas',
    desc: 'Elle baisse les épaules — confort et douceur.',
    intensity: 1, comfort: 2, category: 'par-derriere',
    phases: ['luteale', 'menstruelle'],
    svg: svg(
      head(16,28,E) + body(30,30,16,6,5,E) +
      head(48,26,B) + body(36,30,12,6,-10,B)
    ),
  },
  {
    id: 'spoon_penetration', label: 'Cuillère intime',
    desc: 'Cuillère avec pénétration, très doux.',
    intensity: 1, comfort: 1, category: 'par-derriere',
    phases: ['menstruelle', 'luteale'],
    svg: svg(
      head(14,22,E) + body(29,27,15,6,0,E) +
      head(12,34,B) + body(31,37,15,6,0,B)
    ),
  },
  {
    id: 'standing_rear', label: 'Debout par derrière',
    desc: 'Debout, elle s\'appuie, prise dès la nuque.',
    intensity: 2, comfort: 2, category: 'par-derriere',
    phases: ['ovulation', 'folliculaire'],
    svg: svg(
      head(24,10,E) + body(24,26,6,16,0,E) +
      head(36,12,B) + body(36,28,6,16,0,B)
    ),
  },

  // ── Assis / semi-assis ──────────────────────────────────────────────────
  {
    id: 'lotus', label: 'Lotus',
    desc: 'Assis face à face, mouvements de bascule lents.',
    intensity: 1, comfort: 2, category: 'assis',
    phases: ['menstruelle', 'luteale'],
    svg: svg(
      head(22,14,E) + body(22,26,9,12,0,E) +
      head(38,14,B) + body(38,26,9,12,0,B) +
      `<line x1="22" y1="38" x2="38" y2="38" stroke="${E}" stroke-width="1" stroke-dasharray="3"/>`,
    ),
  },
  {
    id: 'lap_dance', label: 'Sur les genoux',
    desc: 'Elle assise sur lui, assis tous les deux.',
    intensity: 1, comfort: 1, category: 'assis',
    phases: ['luteale', 'menstruelle'],
    svg: svg(
      head(30,10,E) + body(30,22,7,12,0,E) +
      head(46,26,B) + body(32,36,16,8,10,B)
    ),
  },
  {
    id: 'edge_of_bed', label: 'Bord du lit',
    desc: 'Elle allongée au bord, lui debout ou à genoux.',
    intensity: 2, comfort: 1, category: 'assis',
    phases: ['folliculaire', 'ovulation'],
    svg: svg(
      head(12,28,E) + body(28,30,16,7,0,E) +
      `<line x1="4" y1="34" x2="44" y2="34" stroke="#ccc" stroke-width="2"/>` +
      head(48,22,B) + body(44,30,6,12,0,B)
    ),
  },
  {
    id: 'seated_face', label: 'Assis face à face (chaise)',
    desc: 'Elle sur ses genoux en le regardant, contrôle partagé.',
    intensity: 1, comfort: 2, category: 'assis',
    phases: ['folliculaire', 'luteale'],
    svg: svg(
      head(26,10,E) + body(26,22,7,12,0,E) +
      head(34,26,B) + body(34,36,7,14,0,B) +
      `<rect x="24" y="44" width="20" height="4" rx="2" stroke="#ccc" stroke-width="1"/>`
    ),
  },

  // ── Debout ──────────────────────────────────────────────────────────────
  {
    id: 'standing_face', label: 'Debout face à face',
    desc: 'Debout, contre un mur ou non.',
    intensity: 2, comfort: 2, category: 'debout',
    phases: ['ovulation', 'folliculaire'],
    svg: svg(
      head(22,10,E) + body(22,26,6,16,0,E) +
      head(38,10,B) + body(38,26,6,16,0,B)
    ),
  },
  {
    id: 'standing_lift', label: 'Portée debout',
    desc: 'Il la soulève, elle s\'enroule autour de lui.',
    intensity: 3, comfort: 3, category: 'debout',
    phases: ['ovulation'],
    svg: svg(
      head(30,12,E) + body(28,26,8,14,15,E) +
      head(34,8,B) + body(34,28,6,20,0,B)
    ),
  },
  {
    id: 'bent_over', label: 'Penchée en avant',
    desc: 'Elle se penche sur un meuble, lui derrière.',
    intensity: 2, comfort: 2, category: 'debout',
    phases: ['folliculaire', 'ovulation'],
    svg: svg(
      head(12,20,E) + body(24,28,14,6,-25,E) +
      `<rect x="4" y="30" width="28" height="4" rx="1" stroke="#ccc" stroke-width="1"/>` +
      head(46,20,B) + body(42,30,6,14,0,B)
    ),
  },

  // ── Positions douces / menstruelle ──────────────────────────────────────
  {
    id: 'spooning_gentle', label: 'Cuillère douce',
    desc: 'Pas de pénétration nécessaire, chaleur et contact.',
    intensity: 1, comfort: 1, category: 'douceur',
    phases: ['menstruelle', 'luteale'],
    svg: svg(
      head(14,22,E) + body(30,26,15,6,5,E) +
      head(10,30,B) + body(30,34,15,6,5,B) +
      `<line x1="20" y1="26" x2="20" y2="34" stroke="${B}" stroke-width="1" stroke-dasharray="2"/>`
    ),
  },
  {
    id: 'head_lap', label: 'Câlin sur les genoux',
    desc: 'Elle allongée, tête sur ses genoux — connexion et douceur.',
    intensity: 1, comfort: 1, category: 'douceur',
    phases: ['menstruelle', 'luteale'],
    svg: svg(
      head(12,30,E) + body(30,32,18,6,0,E) +
      head(50,18,B) + body(50,30,6,12,0,B) +
      body(40,36,10,6,30,B)
    ),
  },
  {
    id: 'massage_position', label: 'Massage intime',
    desc: 'Allongée sur le ventre, massage du dos puis plus.',
    intensity: 1, comfort: 1, category: 'douceur',
    phases: ['menstruelle', 'luteale', 'folliculaire'],
    svg: svg(
      head(12,28,E) + body(30,30,18,7,0,E) +
      `<ellipse cx="30" cy="20" rx="16" ry="5" stroke="${B}" stroke-width="1.2" stroke-dasharray="3"/>`
    ),
  },

  // ── Variations / intermédiaires ─────────────────────────────────────────
  {
    id: 'pretzel', label: 'Bretzel',
    desc: 'Elle sur le côté, jambes croisées — profondeur et contact.',
    intensity: 2, comfort: 2, category: 'variations',
    phases: ['folliculaire', 'ovulation'],
    svg: svg(
      head(14,20,E) + body(26,26,13,6,-10,E) +
      `<ellipse cx="30" cy="34" rx="12" ry="5" stroke="${E}" stroke-width="1.2" transform="rotate(15 30 34)"/>` +
      head(46,28,B) + body(42,36,10,6,5,B)
    ),
  },
  {
    id: 'scissors', label: 'Ciseaux',
    desc: 'Jambes entrecroisées, rythme lent et profond.',
    intensity: 2, comfort: 2, category: 'variations',
    phases: ['folliculaire', 'luteale'],
    svg: svg(
      head(12,20,E) + body(30,24,16,6,20,E) +
      head(48,40,B) + body(30,36,16,6,-20,B)
    ),
  },
  {
    id: 'butterfly', label: 'Papillon',
    desc: 'Elle sur le bord, bassin surélevé par un coussin.',
    intensity: 2, comfort: 1, category: 'variations',
    phases: ['ovulation', 'folliculaire'],
    svg: svg(
      head(12,28,E) + body(28,30,15,7,0,E) +
      `<line x1="20" y1="26" x2="26" y2="16" stroke="${E}" stroke-width="${SW}"/>` +
      `<line x1="36" y1="26" x2="30" y2="16" stroke="${E}" stroke-width="${SW}"/>` +
      head(48,24,B) + body(44,30,6,12,0,B)
    ),
  },
  {
    id: 'cat', label: 'CAT (Coital Alignment)',
    desc: 'Missionnaire décalé pour la stimulation clitoridienne.',
    intensity: 1, comfort: 1, category: 'variations',
    phases: ['luteale', 'folliculaire'],
    svg: svg(
      head(14,22,E) + body(30,26,16,7,0,E) +
      head(46,30,B) + body(32,36,16,7,5,B)
    ),
  },
  {
    id: 'x_position', label: 'Position X',
    desc: 'Jambes en X, contact profond, rythme lent.',
    intensity: 2, comfort: 2, category: 'variations',
    phases: ['ovulation'],
    svg: svg(
      head(12,26,E) + body(28,30,14,6,15,E) +
      head(48,26,B) + body(34,30,14,6,-15,B) +
      `<line x1="28" y1="36" x2="34" y2="36" stroke="${E}" stroke-width="1" stroke-dasharray="2"/>`
    ),
  },
  {
    id: 'doggy_lying', label: 'À plat ventre',
    desc: 'Elle allongée sur le ventre, lui sur elle — profond et doux.',
    intensity: 2, comfort: 2, category: 'par-derriere',
    phases: ['folliculaire', 'luteale'],
    svg: svg(
      head(12,28,E) + body(30,30,18,7,0,E) +
      head(48,20,B) + body(30,22,17,7,0,B)
    ),
  },

  // ── Positions avancées / acrobatiques ───────────────────────────────────
  {
    id: 'standing_split', label: 'Jambe levée debout',
    desc: 'Debout, une jambe levée sur son épaule.',
    intensity: 3, comfort: 3, category: 'avancees',
    phases: ['ovulation'],
    svg: svg(
      head(22,10,E) + body(22,24,6,14,0,E) +
      `<line x1="22" y1="36" x2="36" y2="20" stroke="${E}" stroke-width="${SW}"/>` +
      head(38,12,B) + body(38,28,6,16,0,B)
    ),
  },
  {
    id: 'reverse_lotus', label: 'Lotus inversé',
    desc: 'Elle face aux pieds, assis en tailleur.',
    intensity: 2, comfort: 3, category: 'avancees',
    phases: ['folliculaire', 'ovulation'],
    svg: svg(
      head(22,36,E) + body(22,26,9,12,0,E) +
      head(38,10,B) + body(38,22,9,12,0,B)
    ),
  },
  {
    id: 'wheelbarrow', label: 'Brouette',
    desc: 'Elle portée par les hanches, bras au sol.',
    intensity: 3, comfort: 3, category: 'avancees',
    phases: ['ovulation'],
    svg: svg(
      body(24,34,16,6,-15,E) + head(10,26,E) +
      `<line x1="10" y1="30" x2="10" y2="44" stroke="${E}" stroke-width="${SW}"/>` +
      head(46,24,B) + body(42,34,6,12,0,B)
    ),
  },
  {
    id: 'suspended', label: 'Suspendue',
    desc: 'Elle dans les bras de lui, debout — force et confiance.',
    intensity: 3, comfort: 3, category: 'avancees',
    phases: ['ovulation'],
    svg: svg(
      head(28,10,E) + body(24,24,10,14,15,E) +
      head(36,12,B) + body(36,28,6,18,0,B) +
      `<line x1="36" y1="20" x2="28" y2="22" stroke="${B}" stroke-width="${SW}"/>`
    ),
  },

  // ── Jeux / préliminaires ────────────────────────────────────────────────
  {
    id: 'sixty_nine', label: 'Soixante-neuf',
    desc: 'Partage simultané du plaisir oral.',
    intensity: 1, comfort: 2, category: 'preliminaires',
    phases: ['folliculaire', 'ovulation', 'luteale'],
    svg: svg(
      head(12,20,E) + body(30,26,17,6,5,E) +
      head(48,40,B) + body(30,36,17,6,-5,B)
    ),
  },
  {
    id: 'massage_full', label: 'Massage corps entier',
    desc: 'Prélude doux, connexion par le toucher.',
    intensity: 1, comfort: 1, category: 'preliminaires',
    phases: ['menstruelle', 'luteale', 'folliculaire'],
    svg: svg(
      head(30,14,E) + body(30,32,8,17,0,E) +
      `<ellipse cx="14" cy="28" rx="8" ry="4" transform="rotate(-30 14 28)" stroke="${B}" stroke-width="1.5"/>` +
      `<ellipse cx="46" cy="28" rx="8" ry="4" transform="rotate(30 46 28)" stroke="${B}" stroke-width="1.5"/>`
    ),
  },

  // ── Positions spécifiques phases ────────────────────────────────────────
  {
    id: 'gentle_hip', label: 'Bascule du bassin',
    desc: 'Très doux, idéal en cas de crampes légères.',
    intensity: 1, comfort: 1, category: 'douceur',
    phases: ['menstruelle'],
    svg: svg(
      head(14,24,E) + body(28,30,14,7,0,E) +
      head(48,36,B) + body(32,38,14,7,0,B) +
      `<path d="M24,34 Q30,40 36,34" stroke="${E}" stroke-width="1.5" fill="none"/>`
    ),
  },
  {
    id: 'energy_spike', label: 'Impulsion',
    desc: 'Rythme soutenu, pic d\'énergie — idéal à l\'ovulation.',
    intensity: 3, comfort: 2, category: 'elle-dessus',
    phases: ['ovulation'],
    svg: svg(
      head(30,8,E) + body(30,20,7,12,0,E) +
      `<path d="M24,18 L30,8 L36,18" stroke="${E}" stroke-width="${SW}" fill="none"/>` +
      head(46,36,B) + body(30,40,18,7,0,B)
    ),
  },
  {
    id: 'tender_wrap', label: 'Enveloppé·e',
    desc: 'Elle l\'entoure de ses jambes, contact maximal.',
    intensity: 1, comfort: 1, category: 'face-a-face',
    phases: ['luteale', 'menstruelle'],
    svg: svg(
      head(22,16,E) + body(26,28,10,12,0,E) +
      `<ellipse cx="34" cy="38" rx="12" ry="5" transform="rotate(20 34 38)" stroke="${E}" stroke-width="1.2"/>` +
      head(38,18,B) + body(34,30,9,12,0,B)
    ),
  },
];

// ─── Catégories de filtres ─────────────────────────────────────────────────

export const CATEGORIES = {
  'face-a-face':    { label: '😊 Face à face', color: 'var(--elle)' },
  'cote-a-cote':   { label: '🌙 Côté à côté', color: 'var(--lui)' },
  'elle-dessus':   { label: '👑 Elle au-dessus', color: 'var(--elle)' },
  'par-derriere':  { label: '🌊 Par derrière', color: 'var(--lui)' },
  'assis':         { label: '🪑 Assis', color: 'var(--violet)' },
  'debout':        { label: '🌟 Debout', color: 'var(--violet)' },
  'douceur':       { label: '💗 Douceur', color: 'var(--elle)' },
  'variations':    { label: '🔄 Variations', color: 'var(--lui)' },
  'preliminaires': { label: '✨ Préliminaires', color: 'var(--gold)' },
  'avancees':      { label: '⚡ Avancées', color: 'var(--red)' },
};

export const PHASES_LABELS = {
  menstruelle:  { label: 'Menstruelle',  color: '#E53935' },
  folliculaire: { label: 'Folliculaire', color: '#4278C4' },
  ovulation:    { label: 'Ovulation',    color: '#7C5CFC' },
  luteale:      { label: 'Lutéale',      color: '#E84375' },
};

// ─── Filtre ────────────────────────────────────────────────────────────────

export function filterPositions({ category, intensity, phase, comfort } = {}) {
  return POSITIONS.filter(p => {
    if (category  && p.category  !== category)  return false;
    if (intensity  && p.intensity > intensity)   return false;
    if (comfort    && p.comfort   > comfort)     return false;
    if (phase      && !p.phases.includes(phase)) return false;
    return true;
  });
}

// ─── Suggestions contextuelles (phase × humeur partenaire) ─────────────────

const SUGGESTIONS = {
  menstruelle: {
    lui_high:  ['Massage corps entier', 'Câlin sur les genoux', 'Cuillère douce'],
    lui_low:   ['Cuillère douce', 'Câlin sur les genoux'],
    generic:   ['Bascule du bassin', 'Cuillère douce', 'Massage intime', 'Cuillère intime'],
  },
  folliculaire: {
    lui_high:  ['Cavalière', 'Missionnaire', 'À quatre pattes'],
    lui_low:   ['Cuillère', 'Face à face enlacé', 'Lotus'],
    generic:   ['Missionnaire', 'Cavalière', 'Cuillère', 'Assis face à face'],
  },
  ovulation: {
    lui_high:  ['Cavalière', 'Debout face à face', 'À quatre pattes', 'Impulsion'],
    lui_low:   ['Cavalière', 'Missionnaire', 'Papillon'],
    generic:   ['Cavalière', 'Missionnaire jambes levées', 'Impulsion', 'Portée debout'],
  },
  luteale: {
    lui_high:  ['Cuillère', 'Face à face enlacé', 'Enveloppé·e'],
    lui_low:   ['Cuillère douce', 'Câlin sur les genoux', 'Massage intime'],
    generic:   ['Cuillère', 'Enveloppé·e', 'Lotus', 'Face à face enlacé'],
  },
};

export function getSuggestions(phase, luiMood) {
  const group = SUGGESTIONS[phase] || SUGGESTIONS.folliculaire;
  const labels = luiMood >= 4 ? group.lui_high
               : luiMood <= 2 ? group.lui_low
               : group.generic;
  return POSITIONS.filter(p => labels.includes(p.label)).slice(0, 3);
}

// ─── Rendu de la bibliothèque ──────────────────────────────────────────────

export function renderLibrary(container, filter = {}, loggedToday = new Set()) {
  if (!container) return;
  const positions = filterPositions(filter);

  if (!positions.length) {
    container.innerHTML = '<p class="intime-empty">Aucune position ne correspond aux filtres.</p>';
    return;
  }

  container.innerHTML = positions.map(p => {
    const intLabel  = p.intensity === 1 ? 'Douce' : p.intensity === 2 ? 'Modérée' : 'Intense';
    const comfLabel = p.comfort   === 1 ? 'Facile' : p.comfort   === 2 ? 'Intermédiaire' : 'Acrobatique';
    const phaseStr  = p.phases.map(ph => PHASES_LABELS[ph]?.label || ph).join(', ');
    const isLogged = loggedToday.has(p.label);

    return `<div class="pos-card ${isLogged ? 'pos-card--logged' : ''}" data-id="${p.id}" role="button" tabindex="0"
      aria-label="${p.label} — ${p.desc}">
      <div class="pos-svg">${p.svg}</div>
      <div class="pos-info">
        <div class="pos-label">${p.label}</div>
        <div class="pos-desc">${p.desc}</div>
        <div class="pos-meta">
          <span class="pos-tag">${intLabel}</span>
          <span class="pos-tag">${comfLabel}</span>
          <span class="pos-phase">${phaseStr}</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ─── Mode Date Night : suggestions contextuelles ───────────────────────────

const DATE_NIGHT_IDEAS = {
  menstruelle:  ['Soirée film sous une couverture', 'Bain chaud aux bougies', 'Massage aux huiles chaudes', 'Dîner fait maison'],
  folliculaire: ['Pique-nique improvisé', 'Soirée danse à la maison', 'Jeu de rôles léger', 'Découvrir un restaurant'],
  ovulation:    ['Aventure dehors', 'Soirée spontanée', 'Défi Date Night', 'Nuit à l\'hôtel'],
  luteale:      ['Soirée calme au coin du feu', 'Séance de peinture ou dessin ensemble', 'Playlist et câlins', 'Silence confortable'],
};

export function getDateNightIdeas(phase) {
  return DATE_NIGHT_IDEAS[phase] || DATE_NIGHT_IDEAS.folliculaire;
}
