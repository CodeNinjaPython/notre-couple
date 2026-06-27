// pregnancy-milestones.js — repères semaine par semaine (mode grossesse).
//
// Contenu indicatif et non médical : taille comparée à un fruit (repère
// classique et ludique) + une note de développement courte. Cohérent avec le
// disclaimer de l'app : ceci n'est pas un avis médical.
//
// Les semaines sont exprimées en « semaines de grossesse » (SG) comptées depuis
// le début, comme le reste de l'app (compteur du header, anneau de progression).

// Taille comparée — progression classique, de la 4e à la 40e semaine.
const FRUIT_BY_WEEK = {
  4: 'une graine de pavot', 5: 'un grain de sésame', 6: 'une lentille',
  7: 'une myrtille', 8: 'une framboise', 9: 'une cerise', 10: 'une fraise',
  11: 'un citron vert', 12: 'une prune', 13: 'une pêche', 14: 'un citron',
  15: 'une pomme', 16: 'un avocat', 17: 'un oignon', 18: 'un poivron',
  19: 'une mangue', 20: 'une banane', 21: 'une carotte', 22: 'une papaye',
  23: 'un pamplemousse', 24: 'un épi de maïs', 25: 'un chou-fleur',
  26: 'une laitue', 27: 'un chou romanesco', 28: 'une aubergine',
  29: 'une courge butternut', 30: 'un chou', 31: 'une noix de coco',
  32: 'un ananas', 33: 'un melon', 34: 'un cantaloup', 35: 'un melon miel',
  36: 'une salade romaine', 37: 'une blette', 38: 'un poireau',
  39: 'une petite pastèque', 40: 'un potiron',
};

// Notes de développement pour quelques semaines repères. Les autres reçoivent
// une note générique selon le trimestre.
const NOTES = {
  6:  'Le petit cœur commence à battre.',
  9:  'Tous les organes principaux sont en place et continuent de se former.',
  12: 'Fin du premier trimestre en approche — le risque diminue, le ventre va bientôt s\'arrondir.',
  16: 'Bébé peut entendre des sons étouffés.',
  20: 'Mi-parcours. Les premiers mouvements deviennent perceptibles.',
  24: 'Les empreintes digitales se dessinent ; bébé réagit aux sons.',
  28: 'Début du troisième trimestre. Bébé ouvre les yeux.',
  32: 'Bébé prend du poids rapidement et se positionne peu à peu.',
  37: 'Bébé est considéré à terme dès cette semaine.',
  40: 'Terme prévu. La rencontre est imminente.',
};

const TRIMESTER_NOTE = {
  1: 'Premier trimestre : les fondations se mettent en place.',
  2: 'Deuxième trimestre : croissance régulière, souvent la période la plus confortable.',
  3: 'Troisième trimestre : bébé grandit et se prépare à la naissance.',
};

// Rendez-vous clés (France) — semaines indicatives (« ≈ »).
const KEY_APPOINTMENTS = [
  { week: 12, label: 'Échographie du 1er trimestre' },
  { week: 22, label: 'Échographie morphologique (2e trimestre)' },
  { week: 32, label: 'Échographie du 3e trimestre' },
];

function trimesterOf(weeks) {
  return weeks < 13 ? 1 : weeks < 27 ? 2 : 3;
}

function fruitFor(weeks) {
  if (weeks < 4) return FRUIT_BY_WEEK[4];
  if (weeks > 40) return FRUIT_BY_WEEK[40];
  // Si la semaine exacte manque, prendre la dernière connue en deçà.
  for (let w = weeks; w >= 4; w--) if (FRUIT_BY_WEEK[w]) return FRUIT_BY_WEEK[w];
  return null;
}

/**
 * Renvoie le repère de la semaine courante.
 * @param {number} weeks  Semaine de grossesse (0-40+).
 * @returns {{ week:number, trimester:number, fruit:string, note:string,
 *            nextAppointment: ?{week:number,label:string,inWeeks:number} }}
 */
export function getPregnancyMilestone(weeks) {
  const w = Math.max(0, Math.min(40, Math.round(weeks)));
  const trimester = trimesterOf(w);
  const note = NOTES[w] || TRIMESTER_NOTE[trimester];

  const upcoming = KEY_APPOINTMENTS.find(a => a.week >= w);
  const nextAppointment = upcoming
    ? { ...upcoming, inWeeks: upcoming.week - w }
    : null;

  return { week: w, trimester, fruit: fruitFor(w), note, nextAppointment };
}
