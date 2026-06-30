/**
 * intimacy-library.js — Bibliothèque offline de positions + suggestions contextuelles.
 * Bibliothèque illustrée (84 positions Kamasutra) rangée en 3 niveaux : confortable,
 * sportive, acrobatique. Chaque position porte une image (icons/positions/…).
 * Aucun appel API : fonctionne hors-ligne (images servies en statique).
 */
import { localDateStr } from './date-utils.js';

// Rendu visuel d'une position : <img> si illustration, sinon ancien SVG (fallback).
export function posThumb(p) {
  if (p?.img) return `<img class="pos-thumb" src="${p.img}" alt="" loading="lazy">`;
  return p?.svg || '';
}

// ─── Bibliothèque de 84 positions illustrées ───────────────────────────────

export const POSITIONS = [
  { id: 'confortable_l_alignement_parfait', label: 'L’alignement parfait', desc: 'Position confortable et accessible, idéale pour la douceur.',
    intensity: 1, comfort: 1, category: 'confortable',
    phases: ['menstruelle', 'luteale', 'folliculaire'], img: 'icons/positions/Positions%20kamasutra%20confortables/L-alignement-parfait.jpeg' },
  { id: 'confortable_l_approche_du_tigre', label: 'L’approche du tigre', desc: 'Position confortable et accessible, idéale pour la douceur.',
    intensity: 1, comfort: 1, category: 'confortable',
    phases: ['menstruelle', 'luteale', 'folliculaire'], img: 'icons/positions/Positions%20kamasutra%20confortables/L-approche-du-tigre.jpeg' },
  { id: 'confortable_l_etoile_de_mer', label: 'L’étoile de mer', desc: 'Position confortable et accessible, idéale pour la douceur.',
    intensity: 1, comfort: 1, category: 'confortable',
    phases: ['menstruelle', 'luteale', 'folliculaire'], img: 'icons/positions/Positions%20kamasutra%20confortables/L-etoile-de-mer.jpeg' },
  { id: 'confortable_l_herboriste', label: 'L’herboriste', desc: 'Position confortable et accessible, idéale pour la douceur.',
    intensity: 1, comfort: 1, category: 'confortable',
    phases: ['menstruelle', 'luteale', 'folliculaire'], img: 'icons/positions/Positions%20kamasutra%20confortables/L-herboriste.jpeg' },
  { id: 'confortable_l_union_de_l_indra', label: 'L’union de l’Indra', desc: 'Position confortable et accessible, idéale pour la douceur.',
    intensity: 1, comfort: 1, category: 'confortable',
    phases: ['menstruelle', 'luteale', 'folliculaire'], img: 'icons/positions/Positions%20kamasutra%20confortables/L-union-de-l-Indra.jpeg' },
  { id: 'confortable_l_union_de_l_aigle', label: 'L’union de l’aigle', desc: 'Position confortable et accessible, idéale pour la douceur.',
    intensity: 1, comfort: 1, category: 'confortable',
    phases: ['menstruelle', 'luteale', 'folliculaire'], img: 'icons/positions/Positions%20kamasutra%20confortables/L-union-de-l-aigle.jpeg' },
  { id: 'confortable_l_union_de_l_huitre', label: 'L’union de l’huître', desc: 'Position confortable et accessible, idéale pour la douceur.',
    intensity: 1, comfort: 1, category: 'confortable',
    phases: ['menstruelle', 'luteale', 'folliculaire'], img: 'icons/positions/Positions%20kamasutra%20confortables/L-union-de-l-huitre.jpeg' },
  { id: 'confortable_l_union_de_la_pie', label: 'L’union de la pie', desc: 'Position confortable et accessible, idéale pour la douceur.',
    intensity: 1, comfort: 1, category: 'confortable',
    phases: ['menstruelle', 'luteale', 'folliculaire'], img: 'icons/positions/Positions%20kamasutra%20confortables/L-union-de-la-pie.jpeg' },
  { id: 'confortable_l_union_de_la_pieuvre', label: 'L’union de la pieuvre', desc: 'Position confortable et accessible, idéale pour la douceur.',
    intensity: 1, comfort: 1, category: 'confortable',
    phases: ['menstruelle', 'luteale', 'folliculaire'], img: 'icons/positions/Positions%20kamasutra%20confortables/L-union-de-la-pieuvre.jpeg' },
  { id: 'confortable_l_union_de_la_tortue', label: 'L’union de la tortue', desc: 'Position confortable et accessible, idéale pour la douceur.',
    intensity: 1, comfort: 1, category: 'confortable',
    phases: ['menstruelle', 'luteale', 'folliculaire'], img: 'icons/positions/Positions%20kamasutra%20confortables/L-union-de-la-tortue.jpeg' },
  { id: 'confortable_l_union_du_chat', label: 'L’union du chat', desc: 'Position confortable et accessible, idéale pour la douceur.',
    intensity: 1, comfort: 1, category: 'confortable',
    phases: ['menstruelle', 'luteale', 'folliculaire'], img: 'icons/positions/Positions%20kamasutra%20confortables/L-union-du-chat.jpeg' },
  { id: 'confortable_l_union_du_lotus', label: 'L’union du lotus', desc: 'Position confortable et accessible, idéale pour la douceur.',
    intensity: 1, comfort: 1, category: 'confortable',
    phases: ['menstruelle', 'luteale', 'folliculaire'], img: 'icons/positions/Positions%20kamasutra%20confortables/L-union-du-lotus.jpeg' },
  { id: 'confortable_l_union_du_tigre', label: 'L’union du tigre', desc: 'Position confortable et accessible, idéale pour la douceur.',
    intensity: 1, comfort: 1, category: 'confortable',
    phases: ['menstruelle', 'luteale', 'folliculaire'], img: 'icons/positions/Positions%20kamasutra%20confortables/L-union-du-tigre.jpeg' },
  { id: 'confortable_la_balle_gagnante', label: 'La balle gagnante', desc: 'Position confortable et accessible, idéale pour la douceur.',
    intensity: 1, comfort: 1, category: 'confortable',
    phases: ['menstruelle', 'luteale', 'folliculaire'], img: 'icons/positions/Positions%20kamasutra%20confortables/La-balle-gagnante.jpeg' },
  { id: 'confortable_la_cravate_de_notaire', label: 'La cravate de notaire', desc: 'Position confortable et accessible, idéale pour la douceur.',
    intensity: 1, comfort: 1, category: 'confortable',
    phases: ['menstruelle', 'luteale', 'folliculaire'], img: 'icons/positions/Positions%20kamasutra%20confortables/La-cravate-de-notaire.jpeg' },
  { id: 'confortable_la_deesse_au_cheveux_longs', label: 'La déesse au cheveux longs', desc: 'Position confortable et accessible, idéale pour la douceur.',
    intensity: 1, comfort: 1, category: 'confortable',
    phases: ['menstruelle', 'luteale', 'folliculaire'], img: 'icons/positions/Positions%20kamasutra%20confortables/La-deesse-au-cheveux-longs.jpeg' },
  { id: 'confortable_la_langue_de_chat', label: 'La langue de chat', desc: 'Position confortable et accessible, idéale pour la douceur.',
    intensity: 1, comfort: 1, category: 'confortable',
    phases: ['menstruelle', 'luteale', 'folliculaire'], img: 'icons/positions/Positions%20kamasutra%20confortables/La-langue-de-chat.jpeg' },
  { id: 'confortable_la_mysterieuse_entrevue', label: 'La mystérieuse entrevue', desc: 'Position confortable et accessible, idéale pour la douceur.',
    intensity: 1, comfort: 1, category: 'confortable',
    phases: ['menstruelle', 'luteale', 'folliculaire'], img: 'icons/positions/Positions%20kamasutra%20confortables/La-mysterieuse-entrevue.jpeg' },
  { id: 'confortable_la_position_de_l_arc_en_ciel', label: 'La position de l’arc en ciel', desc: 'Position confortable et accessible, idéale pour la douceur.',
    intensity: 1, comfort: 1, category: 'confortable',
    phases: ['menstruelle', 'luteale', 'folliculaire'], img: 'icons/positions/Positions%20kamasutra%20confortables/La-position-de-l-arc-en-ciel.jpeg' },
  { id: 'confortable_la_position_de_l_epicurien', label: 'La position de l’épicurien', desc: 'Position confortable et accessible, idéale pour la douceur.',
    intensity: 1, comfort: 1, category: 'confortable',
    phases: ['menstruelle', 'luteale', 'folliculaire'], img: 'icons/positions/Positions%20kamasutra%20confortables/La-position-de-l-epicurien.jpeg' },
  { id: 'confortable_la_position_de_l_indolent', label: 'La position de l’indolent', desc: 'Position confortable et accessible, idéale pour la douceur.',
    intensity: 1, comfort: 1, category: 'confortable',
    phases: ['menstruelle', 'luteale', 'folliculaire'], img: 'icons/positions/Positions%20kamasutra%20confortables/La-position-de-l-indolent.jpeg' },
  { id: 'confortable_la_position_de_la_courtisane', label: 'La position de la courtisane', desc: 'Position confortable et accessible, idéale pour la douceur.',
    intensity: 1, comfort: 1, category: 'confortable',
    phases: ['menstruelle', 'luteale', 'folliculaire'], img: 'icons/positions/Positions%20kamasutra%20confortables/La-position-de-la-courtisane.jpeg' },
  { id: 'confortable_la_position_du_noeud_coulant', label: 'La position du nœud coulant', desc: 'Position confortable et accessible, idéale pour la douceur.',
    intensity: 1, comfort: 1, category: 'confortable',
    phases: ['menstruelle', 'luteale', 'folliculaire'], img: 'icons/positions/Positions%20kamasutra%20confortables/La-position-du-noeud-coulant.jpeg' },
  { id: 'confortable_la_posture_de_la_balance', label: 'La posture de la balance', desc: 'Position confortable et accessible, idéale pour la douceur.',
    intensity: 1, comfort: 1, category: 'confortable',
    phases: ['menstruelle', 'luteale', 'folliculaire'], img: 'icons/positions/Positions%20kamasutra%20confortables/La-posture-de-la-balance.jpeg' },
  { id: 'confortable_la_posture_de_la_balancoire', label: 'La posture de la balançoire', desc: 'Position confortable et accessible, idéale pour la douceur.',
    intensity: 1, comfort: 1, category: 'confortable',
    phases: ['menstruelle', 'luteale', 'folliculaire'], img: 'icons/positions/Positions%20kamasutra%20confortables/La-posture-de-la-balancoire.jpeg' },
  { id: 'confortable_la_posture_des_cuilleres', label: 'La posture des cuillères', desc: 'Position confortable et accessible, idéale pour la douceur.',
    intensity: 1, comfort: 1, category: 'confortable',
    phases: ['menstruelle', 'luteale', 'folliculaire'], img: 'icons/positions/Positions%20kamasutra%20confortables/La-posture-des-cuilleres.jpeg' },
  { id: 'confortable_le_69', label: 'Le soixante-neuf', desc: 'Position confortable et accessible, idéale pour la douceur.',
    intensity: 1, comfort: 1, category: 'confortable',
    phases: ['menstruelle', 'luteale', 'folliculaire'], img: 'icons/positions/Positions%20kamasutra%20confortables/Le-69.jpeg' },
  { id: 'confortable_le_cache_cache', label: 'Le cache-cache', desc: 'Position confortable et accessible, idéale pour la douceur.',
    intensity: 1, comfort: 1, category: 'confortable',
    phases: ['menstruelle', 'luteale', 'folliculaire'], img: 'icons/positions/Positions%20kamasutra%20confortables/Le-cache-cache.jpeg' },
  { id: 'confortable_le_missionnaire', label: 'Le missionnaire', desc: 'Position confortable et accessible, idéale pour la douceur.',
    intensity: 1, comfort: 1, category: 'confortable',
    phases: ['menstruelle', 'luteale', 'folliculaire'], img: 'icons/positions/Positions%20kamasutra%20confortables/Le-missionnaire.jpeg' },
  { id: 'confortable_le_reveur_ardent', label: 'Le rêveur ardent', desc: 'Position confortable et accessible, idéale pour la douceur.',
    intensity: 1, comfort: 1, category: 'confortable',
    phases: ['menstruelle', 'luteale', 'folliculaire'], img: 'icons/positions/Positions%20kamasutra%20confortables/Le-reveur-ardent.jpeg' },
  { id: 'confortable_le_tape_cul', label: 'Le tape-cul', desc: 'Position confortable et accessible, idéale pour la douceur.',
    intensity: 1, comfort: 1, category: 'confortable',
    phases: ['menstruelle', 'luteale', 'folliculaire'], img: 'icons/positions/Positions%20kamasutra%20confortables/Le-tape-cul.jpeg' },
  { id: 'confortable_le_vol_des_mouettes', label: 'Le vol des mouettes', desc: 'Position confortable et accessible, idéale pour la douceur.',
    intensity: 1, comfort: 1, category: 'confortable',
    phases: ['menstruelle', 'luteale', 'folliculaire'], img: 'icons/positions/Positions%20kamasutra%20confortables/Le-vol-des-mouettes.jpeg' },
  { id: 'sportive_l_arbre_a_fruits', label: 'L’arbre à fruits', desc: 'Position dynamique, un peu d’effort pour beaucoup d’intensité.',
    intensity: 2, comfort: 2, category: 'sportive',
    phases: ['folliculaire', 'ovulation'], img: 'icons/positions/Positions%20kamasutra%20sportives/L-arbre-a-fruits.jpeg' },
  { id: 'sportive_l_union_de_l_abeille', label: 'L’union de l’abeille', desc: 'Position dynamique, un peu d’effort pour beaucoup d’intensité.',
    intensity: 2, comfort: 2, category: 'sportive',
    phases: ['folliculaire', 'ovulation'], img: 'icons/positions/Positions%20kamasutra%20sportives/L-union-de-l-abeille.jpeg' },
  { id: 'sportive_l_union_de_l_elephant', label: 'L’union de l’éléphant', desc: 'Position dynamique, un peu d’effort pour beaucoup d’intensité.',
    intensity: 2, comfort: 2, category: 'sportive',
    phases: ['folliculaire', 'ovulation'], img: 'icons/positions/Positions%20kamasutra%20sportives/L-union-de-l-elephant.jpeg' },
  { id: 'sportive_l_union_de_la_deesse', label: 'L’union de la déesse', desc: 'Position dynamique, un peu d’effort pour beaucoup d’intensité.',
    intensity: 2, comfort: 2, category: 'sportive',
    phases: ['folliculaire', 'ovulation'], img: 'icons/positions/Positions%20kamasutra%20sportives/L-union-de-la-deesse.jpeg' },
  { id: 'sportive_l_union_de_la_grenouille', label: 'L’union de la grenouille', desc: 'Position dynamique, un peu d’effort pour beaucoup d’intensité.',
    intensity: 2, comfort: 2, category: 'sportive',
    phases: ['folliculaire', 'ovulation'], img: 'icons/positions/Positions%20kamasutra%20sportives/L-union-de-la-grenouille.jpeg' },
  { id: 'sportive_l_union_des_amants', label: 'L’union des amants', desc: 'Position dynamique, un peu d’effort pour beaucoup d’intensité.',
    intensity: 2, comfort: 2, category: 'sportive',
    phases: ['folliculaire', 'ovulation'], img: 'icons/positions/Positions%20kamasutra%20sportives/L-union-des-amants.jpeg' },
  { id: 'sportive_l_union_du_papillon', label: 'L’union du papillon', desc: 'Position dynamique, un peu d’effort pour beaucoup d’intensité.',
    intensity: 2, comfort: 2, category: 'sportive',
    phases: ['folliculaire', 'ovulation'], img: 'icons/positions/Positions%20kamasutra%20sportives/L-union-du-papillon.jpeg' },
  { id: 'sportive_la_barque', label: 'La barque', desc: 'Position dynamique, un peu d’effort pour beaucoup d’intensité.',
    intensity: 2, comfort: 2, category: 'sportive',
    phases: ['folliculaire', 'ovulation'], img: 'icons/positions/Positions%20kamasutra%20sportives/La-barque.jpeg' },
  { id: 'sportive_la_berceuse', label: 'La berceuse', desc: 'Position dynamique, un peu d’effort pour beaucoup d’intensité.',
    intensity: 2, comfort: 2, category: 'sportive',
    phases: ['folliculaire', 'ovulation'], img: 'icons/positions/Positions%20kamasutra%20sportives/La-berceuse.jpeg' },
  { id: 'sportive_la_levrette', label: 'La levrette', desc: 'Position dynamique, un peu d’effort pour beaucoup d’intensité.',
    intensity: 2, comfort: 2, category: 'sportive',
    phases: ['folliculaire', 'ovulation'], img: 'icons/positions/Positions%20kamasutra%20sportives/La-levrette.jpeg' },
  { id: 'sportive_la_position_de_l_antilope', label: 'La position de l’antilope', desc: 'Position dynamique, un peu d’effort pour beaucoup d’intensité.',
    intensity: 2, comfort: 2, category: 'sportive',
    phases: ['folliculaire', 'ovulation'], img: 'icons/positions/Positions%20kamasutra%20sportives/La-position-de-l-antilope.jpeg' },
  { id: 'sportive_la_position_de_l_homme_debout', label: 'La position de l’homme debout', desc: 'Position dynamique, un peu d’effort pour beaucoup d’intensité.',
    intensity: 2, comfort: 2, category: 'sportive',
    phases: ['folliculaire', 'ovulation'], img: 'icons/positions/Positions%20kamasutra%20sportives/La-position-de-l-homme-debout.jpeg' },
  { id: 'sportive_la_position_de_la_grenouille_a_la_nage', label: 'La position de la grenouille à la nage', desc: 'Position dynamique, un peu d’effort pour beaucoup d’intensité.',
    intensity: 2, comfort: 2, category: 'sportive',
    phases: ['folliculaire', 'ovulation'], img: 'icons/positions/Positions%20kamasutra%20sportives/La-position-de-la-grenouille-a-la-nage.jpeg' },
  { id: 'sportive_la_position_du_cheval_au_galop', label: 'La position du cheval au galop', desc: 'Position dynamique, un peu d’effort pour beaucoup d’intensité.',
    intensity: 2, comfort: 2, category: 'sportive',
    phases: ['folliculaire', 'ovulation'], img: 'icons/positions/Positions%20kamasutra%20sportives/La-position-du-cheval-au-galop.jpeg' },
  { id: 'sportive_la_position_du_neophyte', label: 'La position du néophyte', desc: 'Position dynamique, un peu d’effort pour beaucoup d’intensité.',
    intensity: 2, comfort: 2, category: 'sportive',
    phases: ['folliculaire', 'ovulation'], img: 'icons/positions/Positions%20kamasutra%20sportives/La-position-du-neophyte.jpeg' },
  { id: 'sportive_la_posture_de_l_enclume', label: 'La posture de l’enclume', desc: 'Position dynamique, un peu d’effort pour beaucoup d’intensité.',
    intensity: 2, comfort: 2, category: 'sportive',
    phases: ['folliculaire', 'ovulation'], img: 'icons/positions/Positions%20kamasutra%20sportives/La-posture-de-l-enclume.jpeg' },
  { id: 'sportive_la_posture_de_la_lune', label: 'La posture de la Lune', desc: 'Position dynamique, un peu d’effort pour beaucoup d’intensité.',
    intensity: 2, comfort: 2, category: 'sportive',
    phases: ['folliculaire', 'ovulation'], img: 'icons/positions/Positions%20kamasutra%20sportives/La-posture-de-la-Lune.jpeg' },
  { id: 'sportive_la_posture_du_roseau', label: 'La posture du roseau', desc: 'Position dynamique, un peu d’effort pour beaucoup d’intensité.',
    intensity: 2, comfort: 2, category: 'sportive',
    phases: ['folliculaire', 'ovulation'], img: 'icons/positions/Positions%20kamasutra%20sportives/La-posture-du-roseau.jpeg' },
  { id: 'sportive_le_l', label: 'Le L', desc: 'Position dynamique, un peu d’effort pour beaucoup d’intensité.',
    intensity: 2, comfort: 2, category: 'sportive',
    phases: ['folliculaire', 'ovulation'], img: 'icons/positions/Positions%20kamasutra%20sportives/Le-L.jpeg' },
  { id: 'sportive_le_cerf_en_rut', label: 'Le cerf en rut', desc: 'Position dynamique, un peu d’effort pour beaucoup d’intensité.',
    intensity: 2, comfort: 2, category: 'sportive',
    phases: ['folliculaire', 'ovulation'], img: 'icons/positions/Positions%20kamasutra%20sportives/Le-cerf-en-rut.jpeg' },
  { id: 'sportive_le_cheval_inverse', label: 'Le cheval inversé', desc: 'Position dynamique, un peu d’effort pour beaucoup d’intensité.',
    intensity: 2, comfort: 2, category: 'sportive',
    phases: ['folliculaire', 'ovulation'], img: 'icons/positions/Positions%20kamasutra%20sportives/Le-cheval-inverse.jpeg' },
  { id: 'sportive_le_chevauchement', label: 'Le chevauchement', desc: 'Position dynamique, un peu d’effort pour beaucoup d’intensité.',
    intensity: 2, comfort: 2, category: 'sportive',
    phases: ['folliculaire', 'ovulation'], img: 'icons/positions/Positions%20kamasutra%20sportives/Le-chevauchement.jpeg' },
  { id: 'sportive_le_marteau_piqueur', label: 'Le marteau piqueur', desc: 'Position dynamique, un peu d’effort pour beaucoup d’intensité.',
    intensity: 2, comfort: 2, category: 'sportive',
    phases: ['folliculaire', 'ovulation'], img: 'icons/positions/Positions%20kamasutra%20sportives/Le-marteau-piqueur.jpeg' },
  { id: 'sportive_le_moulin_a_vent', label: 'Le moulin à vent', desc: 'Position dynamique, un peu d’effort pour beaucoup d’intensité.',
    intensity: 2, comfort: 2, category: 'sportive',
    phases: ['folliculaire', 'ovulation'], img: 'icons/positions/Positions%20kamasutra%20sportives/Le-moulin-a-vent.jpeg' },
  { id: 'sportive_le_tendre_amant', label: 'Le tendre amant', desc: 'Position dynamique, un peu d’effort pour beaucoup d’intensité.',
    intensity: 2, comfort: 2, category: 'sportive',
    phases: ['folliculaire', 'ovulation'], img: 'icons/positions/Positions%20kamasutra%20sportives/Le-tendre-amant.jpeg' },
  { id: 'sportive_les_nageurs', label: 'Les nageurs', desc: 'Position dynamique, un peu d’effort pour beaucoup d’intensité.',
    intensity: 2, comfort: 2, category: 'sportive',
    phases: ['folliculaire', 'ovulation'], img: 'icons/positions/Positions%20kamasutra%20sportives/Les-nageurs.jpeg' },
  { id: 'sportive_position_d_andromaque', label: 'Position d’Andromaque', desc: 'Position dynamique, un peu d’effort pour beaucoup d’intensité.',
    intensity: 2, comfort: 2, category: 'sportive',
    phases: ['folliculaire', 'ovulation'], img: 'icons/positions/Positions%20kamasutra%20sportives/Position-d-Andromaque.jpeg' },
  { id: 'sportive_posture_de_la_charrue', label: 'Posture de la charrue', desc: 'Position dynamique, un peu d’effort pour beaucoup d’intensité.',
    intensity: 2, comfort: 2, category: 'sportive',
    phases: ['folliculaire', 'ovulation'], img: 'icons/positions/Positions%20kamasutra%20sportives/Posture-de-la-charrue.jpeg' },
  { id: 'acrobatique_l_etreinte_du_panda', label: 'L’étreinte du panda', desc: 'Position acrobatique, pour les jours pleins d’énergie.',
    intensity: 3, comfort: 3, category: 'acrobatique',
    phases: ['ovulation'], img: 'icons/positions/Positions%20kamasutra%20acrobatiques/L-etreinte-du-panda.jpeg' },
  { id: 'acrobatique_l_offrande_secrete', label: 'L’offrande secrète', desc: 'Position acrobatique, pour les jours pleins d’énergie.',
    intensity: 3, comfort: 3, category: 'acrobatique',
    phases: ['ovulation'], img: 'icons/positions/Positions%20kamasutra%20acrobatiques/L-offrande-secrete.jpeg' },
  { id: 'acrobatique_l_union_du_loup', label: 'L’union du loup', desc: 'Position acrobatique, pour les jours pleins d’énergie.',
    intensity: 3, comfort: 3, category: 'acrobatique',
    phases: ['ovulation'], img: 'icons/positions/Positions%20kamasutra%20acrobatiques/L-union-du-loup.jpeg' },
  { id: 'acrobatique_l_union_du_scorpion', label: 'L’union du scorpion', desc: 'Position acrobatique, pour les jours pleins d’énergie.',
    intensity: 3, comfort: 3, category: 'acrobatique',
    phases: ['ovulation'], img: 'icons/positions/Positions%20kamasutra%20acrobatiques/L-union-du-scorpion.jpeg' },
  { id: 'acrobatique_l_union_suspendue', label: 'L’union suspendue', desc: 'Position acrobatique, pour les jours pleins d’énergie.',
    intensity: 3, comfort: 3, category: 'acrobatique',
    phases: ['ovulation'], img: 'icons/positions/Positions%20kamasutra%20acrobatiques/L-union-suspendue.jpeg' },
  { id: 'acrobatique_la_brouette_thailandaise', label: 'La brouette thaïlandaise', desc: 'Position acrobatique, pour les jours pleins d’énergie.',
    intensity: 3, comfort: 3, category: 'acrobatique',
    phases: ['ovulation'], img: 'icons/positions/Positions%20kamasutra%20acrobatiques/La-brouette-thailandaise.jpeg' },
  { id: 'acrobatique_la_brouette', label: 'La brouette', desc: 'Position acrobatique, pour les jours pleins d’énergie.',
    intensity: 3, comfort: 3, category: 'acrobatique',
    phases: ['ovulation'], img: 'icons/positions/Positions%20kamasutra%20acrobatiques/La-brouette.jpeg' },
  { id: 'acrobatique_la_chaise_magique', label: 'La chaise magique', desc: 'Position acrobatique, pour les jours pleins d’énergie.',
    intensity: 3, comfort: 3, category: 'acrobatique',
    phases: ['ovulation'], img: 'icons/positions/Positions%20kamasutra%20acrobatiques/La-chaise-magique.jpeg' },
  { id: 'acrobatique_la_culbute', label: 'La culbute', desc: 'Position acrobatique, pour les jours pleins d’énergie.',
    intensity: 3, comfort: 3, category: 'acrobatique',
    phases: ['ovulation'], img: 'icons/positions/Positions%20kamasutra%20acrobatiques/La-culbute.jpeg' },
  { id: 'acrobatique_la_danse_du_missionnaire', label: 'La danse du missionnaire', desc: 'Position acrobatique, pour les jours pleins d’énergie.',
    intensity: 3, comfort: 3, category: 'acrobatique',
    phases: ['ovulation'], img: 'icons/positions/Positions%20kamasutra%20acrobatiques/La-danse-du-missionnaire.jpeg' },
  { id: 'acrobatique_la_fleur_beante', label: 'La fleur béante', desc: 'Position acrobatique, pour les jours pleins d’énergie.',
    intensity: 3, comfort: 3, category: 'acrobatique',
    phases: ['ovulation'], img: 'icons/positions/Positions%20kamasutra%20acrobatiques/La-fleur-beante.jpeg' },
  { id: 'acrobatique_la_position_de_l_amazone', label: 'La position de l’Amazone', desc: 'Position acrobatique, pour les jours pleins d’énergie.',
    intensity: 3, comfort: 3, category: 'acrobatique',
    phases: ['ovulation'], img: 'icons/positions/Positions%20kamasutra%20acrobatiques/La-position-de-l-Amazone.jpeg' },
  { id: 'acrobatique_la_position_de_l_acrobate', label: 'La position de l’acrobate', desc: 'Position acrobatique, pour les jours pleins d’énergie.',
    intensity: 3, comfort: 3, category: 'acrobatique',
    phases: ['ovulation'], img: 'icons/positions/Positions%20kamasutra%20acrobatiques/La-position-de-l-acrobate.jpeg' },
  { id: 'acrobatique_la_position_de_l_artilleur', label: 'La position de l’artilleur', desc: 'Position acrobatique, pour les jours pleins d’énergie.',
    intensity: 3, comfort: 3, category: 'acrobatique',
    phases: ['ovulation'], img: 'icons/positions/Positions%20kamasutra%20acrobatiques/La-position-de-l-artilleur.jpeg' },
  { id: 'acrobatique_la_position_de_l_equerre', label: 'La position de l’équerre', desc: 'Position acrobatique, pour les jours pleins d’énergie.',
    intensity: 3, comfort: 3, category: 'acrobatique',
    phases: ['ovulation'], img: 'icons/positions/Positions%20kamasutra%20acrobatiques/La-position-de-l-equerre.jpeg' },
  { id: 'acrobatique_la_position_de_la_bete_a_deux_tetes', label: 'La position de la bête à deux têtes', desc: 'Position acrobatique, pour les jours pleins d’énergie.',
    intensity: 3, comfort: 3, category: 'acrobatique',
    phases: ['ovulation'], img: 'icons/positions/Positions%20kamasutra%20acrobatiques/La-position-de-la-bete-a-deux-tetes.jpeg' },
  { id: 'acrobatique_la_position_de_la_tigresse', label: 'La position de la tigresse', desc: 'Position acrobatique, pour les jours pleins d’énergie.',
    intensity: 3, comfort: 3, category: 'acrobatique',
    phases: ['ovulation'], img: 'icons/positions/Positions%20kamasutra%20acrobatiques/La-position-de-la-tigresse.jpeg' },
  { id: 'acrobatique_la_position_des_chimpanzes', label: 'La position des chimpanzés', desc: 'Position acrobatique, pour les jours pleins d’énergie.',
    intensity: 3, comfort: 3, category: 'acrobatique',
    phases: ['ovulation'], img: 'icons/positions/Positions%20kamasutra%20acrobatiques/La-position-des-chimpanzes.jpeg' },
  { id: 'acrobatique_la_posture_de_la_tige', label: 'La posture de la tige', desc: 'Position acrobatique, pour les jours pleins d’énergie.',
    intensity: 3, comfort: 3, category: 'acrobatique',
    phases: ['ovulation'], img: 'icons/positions/Positions%20kamasutra%20acrobatiques/La-posture-de-la-tige.jpeg' },
  { id: 'acrobatique_le_charmeur_de_serpent', label: 'Le charmeur de serpent', desc: 'Position acrobatique, pour les jours pleins d’énergie.',
    intensity: 3, comfort: 3, category: 'acrobatique',
    phases: ['ovulation'], img: 'icons/positions/Positions%20kamasutra%20acrobatiques/Le-charmeur-de-serpent.jpeg' },
  { id: 'acrobatique_le_collier_de_venus', label: 'Le collier de Vénus', desc: 'Position acrobatique, pour les jours pleins d’énergie.',
    intensity: 3, comfort: 3, category: 'acrobatique',
    phases: ['ovulation'], img: 'icons/positions/Positions%20kamasutra%20acrobatiques/Le-collier-de-Venus.jpeg' },
  { id: 'acrobatique_le_grand_ecart', label: 'Le grand écart', desc: 'Position acrobatique, pour les jours pleins d’énergie.',
    intensity: 3, comfort: 3, category: 'acrobatique',
    phases: ['ovulation'], img: 'icons/positions/Positions%20kamasutra%20acrobatiques/Le-grand-ecart.jpeg' },
  { id: 'acrobatique_le_lateral', label: 'Le latéral', desc: 'Position acrobatique, pour les jours pleins d’énergie.',
    intensity: 3, comfort: 3, category: 'acrobatique',
    phases: ['ovulation'], img: 'icons/positions/Positions%20kamasutra%20acrobatiques/Le-lateral.jpeg' },
  { id: 'acrobatique_le_petit_pont', label: 'Le petit pont', desc: 'Position acrobatique, pour les jours pleins d’énergie.',
    intensity: 3, comfort: 3, category: 'acrobatique',
    phases: ['ovulation'], img: 'icons/positions/Positions%20kamasutra%20acrobatiques/Le-petit-pont.jpeg' },
];

// ─── Descriptions détaillées par position ──────────────────────────────────
// Texte unique par position (posture, ressenti, petit conseil). Remplace les
// descriptions génériques. Clé = id de la position.
const POSITION_DESCRIPTIONS = {
  // Confortables
  confortable_l_alignement_parfait: "Missionnaire « remonté » : le bassin de l'homme glisse vers le haut pour que la base du pénis frotte le clitoris à chaque va-et-vient. Douce mais redoutablement efficace.",
  confortable_l_approche_du_tigre: "Levrette allongée, à plat ventre, un coussin sous le bassin. Pénétration profonde sans effort, idéale pour une fin de journée câline.",
  confortable_l_etoile_de_mer: "Allongée sur le dos, bras et jambes détendus en étoile ; le partenaire vient au-dessus. Le summum du lâcher-prise pour elle.",
  confortable_l_herboriste: "Face à face couchés sur le côté, jambes entremêlées : on se regarde, on s'embrasse, les mains restent libres pour explorer.",
  confortable_l_union_de_l_indra: "Sur le dos, genoux ramenés vers la poitrine. L'angle ouvre l'accès et accentue la profondeur tout en restant confortable.",
  confortable_l_union_de_l_aigle: "Sur le dos, jambes largement ouvertes et relevées ; le partenaire s'appuie au-dessus. Accès maximal et contact des corps rapproché.",
  confortable_l_union_de_l_huitre: "Allongés enlacés, ses jambes refermées autour de lui : une étreinte serrée et enveloppante, parfaite pour la tendresse.",
  confortable_l_union_de_la_pie: "Position latérale tête-bêche douce : caresses et oral se mêlent sans pression, à son rythme.",
  confortable_l_union_de_la_pieuvre: "Face à face, mêmes hauteurs, jambes nouées comme des tentacules : on bouge ensemble, fronts collés, dans une lenteur sensuelle.",
  confortable_l_union_de_la_tortue: "Lui assis, elle lovée sur ses cuisses, dos contre torse : mouvements courts et profonds, beaucoup de peau contre peau.",
  confortable_l_union_du_chat: "Variante féline du missionnaire : corps allongés l'un sur l'autre, bassins ondulants, friction clitoridienne continue.",
  confortable_l_union_du_lotus: "Assis face à face, elle sur ses genoux, jambes croisées autour de lui. Intimité totale : on respire ensemble plus qu'on ne « bouge ».",
  confortable_l_union_du_tigre: "Lui à genoux, elle allongée bassin relevé sur ses cuisses : pénétration profonde et maîtrisée, mains libres pour la caresser.",
  confortable_la_balle_gagnante: "Sur le dos, une jambe relevée vers l'épaule du partenaire : un petit changement d'angle pour varier la profondeur sans effort.",
  confortable_la_cravate_de_notaire: "Lui à califourchon sur le buste, sa poitrine au centre du jeu : caresses, frottements et stimulation orale réunis.",
  confortable_la_deesse_au_cheveux_longs: "Elle au-dessus, cheveux dénoués, elle mène la danse à sa cadence. Lui se laisse admirer et guider.",
  confortable_la_langue_de_chat: "Cunnilingus tout en douceur, elle allongée et détendue, lui prenant son temps avec la pointe de la langue.",
  confortable_la_mysterieuse_entrevue: "Face à face assis et enlacés au bord du lit : on se devine, on se découvre, regards plongés l'un dans l'autre.",
  confortable_la_position_de_l_arc_en_ciel: "Couchés tête-bêche sur le côté : caresses et oral se répondent dans une courbe paresseuse et joueuse.",
  confortable_la_position_de_l_epicurien: "Lui à demi-allongé adossé aux oreillers, elle blottie contre lui : le plaisir lent de qui prend tout son temps.",
  confortable_la_position_de_l_indolent: "Cuillère paresseuse au réveil : peu de mouvement, beaucoup de chaleur. Parfait pour un matin sans hâte.",
  confortable_la_position_de_la_courtisane: "Elle assise sur lui, dos cambré et appuyé en arrière sur ses mains : elle contrôle l'angle et le rythme.",
  confortable_la_position_du_noeud_coulant: "Sur le dos, ses jambes enroulées autour de la taille du partenaire pour le tenir au plus près. Étreinte serrée et profonde.",
  confortable_la_posture_de_la_balance: "Assis l'un contre l'autre, corps en équilibre, on se balance doucement d'avant en arrière au même tempo.",
  confortable_la_posture_de_la_balancoire: "Lui allongé sur le dos, elle assise au-dessus se balance d'avant en arrière plutôt que de haut en bas. Friction interne profonde.",
  confortable_la_posture_des_cuilleres: "La cuillère classique : tous deux sur le côté, lui derrière elle. Confort absolu, mains libres pour le clitoris.",
  confortable_le_69: "Le soixante-neuf : oral mutuel et simultané, allongés tête-bêche. Donner et recevoir en même temps.",
  confortable_le_cache_cache: "Levrette joueuse où l'on apparaît et disparaît au gré des mouvements : un brin de taquinerie dans la douceur.",
  confortable_le_missionnaire: "Le grand classique : elle sur le dos, lui au-dessus. Idéal pour s'embrasser, se regarder et ajuster le rythme ensemble.",
  confortable_le_reveur_ardent: "Allongé sur le dos, elle lovée sur le côté contre lui : sensualité lente, presque rêveuse, mains qui vagabondent.",
  confortable_le_tape_cul: "Levrette assise : elle à quatre pattes, lui derrière, contact rapproché des fessiers et profondeur agréable.",
  confortable_le_vol_des_mouettes: "Face à face couchés, jambes en ciseaux entrecroisées : un balancement ample et fluide, comme un vol plané.",
  // Sportives
  sportive_l_arbre_a_fruits: "Lui debout ou à genoux, elle jambes relevées « cueillies » sur ses épaules : profondeur intense, à doser ensemble.",
  sportive_l_union_de_l_abeille: "Elle au-dessus accroupie, va-et-vient vertical et vif : c'est elle qui imprime le bourdonnement du rythme.",
  sportive_l_union_de_l_elephant: "Elle à plat ventre, lui allongé dessus en levrette horizontale : corps lourds et collés, profondeur enveloppante.",
  sportive_l_union_de_la_deesse: "Elle au-dessus, debout sur les genoux, dominante : elle choisit l'angle, la vitesse et savoure son pouvoir.",
  sportive_l_union_de_la_grenouille: "Elle accroupie sur lui, pieds à plat, comme une grenouille prête à bondir : rebonds dynamiques et profonds.",
  sportive_l_union_des_amants: "Face à face debout ou assis enlacés, en mouvement : passion et intensité sans jamais se lâcher du regard.",
  sportive_l_union_du_papillon: "Elle au bord du lit, bassin surélevé par un coussin, jambes ouvertes comme des ailes : l'angle parfait pour le point G.",
  sportive_la_barque: "Assis face à face, jambes entrelacées vers l'avant, on rame ensemble d'avant en arrière. Ludique et gainant.",
  sportive_la_berceuse: "Lui assis, elle à califourchon, on se berce d'un même élan régulier : intensité montante et complicité.",
  sportive_la_levrette: "La levrette : elle à quatre pattes, lui derrière. Profondeur, puissance et stimulation du point G ; cambrez pour varier l'angle.",
  sportive_la_position_de_l_antilope: "Elle penchée en avant, appuyée sur un meuble, lui derrière debout : une levrette « debout » nerveuse et excitante.",
  sportive_la_position_de_l_homme_debout: "Lui debout porte elle, jambes nouées autour de sa taille : intense et athlétique ; adossez-vous à un mur pour tenir.",
  sportive_la_position_de_la_grenouille_a_la_nage: "Elle à plat ventre, jambes repliées et écartées comme une nageuse, lui par-dessus : profondeur et bassins bien plaqués.",
  sportive_la_position_du_cheval_au_galop: "Elle au-dessus, penchée en avant sur son torse, galop rythmé des hanches : cardio et plaisir réunis.",
  sportive_la_position_du_neophyte: "Variante de découverte du missionnaire, jambes de elle légèrement relevées : on apprend l'angle qui fait mouche.",
  sportive_la_posture_de_l_enclume: "Sur le dos, jambes relevées et posées sur les épaules du partenaire : pénétration très profonde, à introduire en douceur.",
  sportive_la_posture_de_la_lune: "Elle à genoux penchée en avant, croissant du dos cambré, lui derrière : profondeur et belle ligne du corps.",
  sportive_la_posture_du_roseau: "Debout ou à genoux, corps souples qui ondulent ensemble comme des roseaux dans le vent : fluide et sensuel.",
  sportive_le_l: "Lui allongé sur le côté, elle sur le dos perpendiculaire, jambes par-dessus lui : leurs corps dessinent un L. Angle inédit.",
  sportive_le_cerf_en_rut: "Levrette vigoureuse, mains de lui aux hanches pour imprimer le rythme : énergie animale et profondeur assumées.",
  sportive_le_cheval_inverse: "Cowgirl inversée : elle au-dessus tournée vers les pieds. Vue sur les fessiers pour lui, contrôle de l'angle pour elle.",
  sportive_le_chevauchement: "Elle chevauche lui à califourchon, buste droit : elle dose montée, descente et bascule du bassin à sa guise.",
  sportive_le_marteau_piqueur: "Elle bassin relevé, lui à genoux au-dessus, va-et-vient vertical et soutenu : intense, à réserver aux jours d'énergie.",
  sportive_le_moulin_a_vent: "Elle au-dessus, mouvements circulaires des hanches plutôt que verticaux : friction interne tournoyante et originale.",
  sportive_le_tendre_amant: "Face à face debout, enlacés et ondulants : la fougue du « sportif » mais avec toute la tendresse du regard.",
  sportive_les_nageurs: "Tous deux à plat ventre, légèrement décalés, mouvements de brasse synchronisés : étonnant, joueur et gainant.",
  sportive_position_d_andromaque: "Andromaque : elle règne au-dessus, assise bien droite. Position reine pour son plaisir et son contrôle total du tempo.",
  sportive_posture_de_la_charrue: "Elle jambes relevées vers l'arrière, bassin basculé, lui agenouillé qui « laboure » : profondeur marquée, à doser.",
  // Acrobatiques
  acrobatique_l_etreinte_du_panda: "Enlacement roulé-boulé où l'on bascule de côté en restant unis : joueur, demande souplesse et coordination.",
  acrobatique_l_offrande_secrete: "Elle, hanches très relevées et soutenues, s'offre sous un angle inhabituel : intense, prévoyez des coussins de soutien.",
  acrobatique_l_union_du_loup: "Levrette surélevée, elle en appui haut, lui dominant : sauvage et profond, pour les jours pleins d'allant.",
  acrobatique_l_union_du_scorpion: "Elle cambrée en arc, talons vers la tête, lui agenouillé : très esthétique mais exigeant pour le dos. Échauffez-vous.",
  acrobatique_l_union_suspendue: "Lui porte elle entièrement, jambes nouées : la position la plus athlétique ; un mur ou un meuble en renfort est conseillé.",
  acrobatique_la_brouette_thailandaise: "Brouette inversée, elle face au sol jambes tenues par lui : très acrobatique, gainez bien et tenez fermement.",
  acrobatique_la_brouette: "Elle en appui sur les mains, lui debout tenant ses jambes comme une brouette : force et complicité indispensables.",
  acrobatique_la_chaise_magique: "Lui assis au bord d'une chaise, elle au-dessus dos à lui : appui stable et profondeur, parfait hors du lit.",
  acrobatique_la_culbute: "Elle sur les épaules, bassin à la verticale au-dessus de la tête, lui penché : spectaculaire et à tenter avec prudence.",
  acrobatique_la_danse_du_missionnaire: "Missionnaire dynamité de torsions et de jeux de jambes : un classique poussé dans ses retranchements acrobatiques.",
  acrobatique_la_fleur_beante: "Elle pleinement ouverte, jambes écartées et relevées tenues haut : accès et profondeur maximaux, à aborder en douceur.",
  acrobatique_la_position_de_l_amazone: "Amazone : elle domine au-dessus, accroupie pieds à plat, en pleine maîtrise. Puissant pour elle, demande des cuisses solides.",
  acrobatique_la_position_de_l_acrobate: "Équilibre à deux où chacun se soutient mutuellement : la confiance et la coordination font tout le sel de la position.",
  acrobatique_la_position_de_l_artilleur: "Elle jambes haut sur ses épaules, lui en surplomb « visant » : pénétration très profonde, communiquez sur le confort.",
  acrobatique_la_position_de_l_equerre: "Corps à 90° l'un de l'autre formant une équerre : un angle géométrique inédit qui surprend les sensations.",
  acrobatique_la_position_de_la_bete_a_deux_tetes: "Face à face très enlacés et arc-boutés, on ne sait plus où commence l'un : fusion intense, souplesse requise.",
  acrobatique_la_position_de_la_tigresse: "Elle au-dessus, posture féline ramassée prête à bondir : domination joueuse et énergie féline.",
  acrobatique_la_position_des_chimpanzes: "Accroupis et agrippés l'un à l'autre, tout en équilibre bas : ludique et primal, jambes et complicité mises à l'épreuve.",
  acrobatique_la_posture_de_la_tige: "Debout, corps droits et tendus comme une tige, parfaitement plaqués : tenue et gainage à l'honneur.",
  acrobatique_le_charmeur_de_serpent: "Ondulations lentes et continues du bassin, comme un serpent qu'on charme : hypnotique, contrôle et souplesse.",
  acrobatique_le_collier_de_venus: "Ses jambes refermées en collier autour de lui pendant qu'il la soulève : étreinte fusionnelle et acrobatique.",
  acrobatique_le_grand_ecart: "Grand écart pendant l'union, pour qui a la souplesse : ouverture spectaculaire, échauffement impératif.",
  acrobatique_le_lateral: "Union latérale poussée, jambes entrecroisées en ciseaux serrés : angle profond et inhabituel, beau jeu de hanches.",
  acrobatique_le_petit_pont: "Elle en pont, bassin relevé en appui sur mains et pieds, lui au-dessus : très gainant, à tenir par courtes séquences.",
};

// Applique les descriptions détaillées (fallback sur le texte générique si manquant).
POSITIONS.forEach(p => { if (POSITION_DESCRIPTIONS[p.id]) p.desc = POSITION_DESCRIPTIONS[p.id]; });

// ─── Catégories (3 niveaux de difficulté = les 3 dossiers d'images) ────────

export const CATEGORIES = {
  'confortable': { label: '💗 Confortables', color: 'var(--elle)' },
  'sportive':    { label: '⚡ Sportives',    color: 'var(--lui)' },
  'acrobatique': { label: '🤸 Acrobatiques', color: 'var(--violet)' },
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

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getSuggestions(phase, luiMood) {
  let pool = POSITIONS.filter(p => p.phases.includes(phase));
  if (!pool.length) pool = POSITIONS.slice();
  // Humeur haute → on privilégie l'intensité ; humeur basse → le confort.
  if (luiMood >= 4) {
    const hi = pool.filter(p => p.intensity >= 2);
    if (hi.length) pool = hi;
  } else if (luiMood <= 2) {
    const lo = pool.filter(p => p.comfort === 1);
    if (lo.length) pool = lo;
  }
  return shuffle(pool).slice(0, 3);
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
      <div class="pos-svg">${posThumb(p)}</div>
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
