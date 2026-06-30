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
  confortable_l_alignement_parfait: "Le ou la partenaire pénétré·e est allongé·e sur le dos, jambes serrées et tendues, tandis que l'autre s'allonge de tout son long par-dessus. Ce contact corps à corps maximal favorise une grande intimité et une stimulation clitoridienne par frottement.",
  confortable_l_approche_du_tigre: "Variante du missionnaire où la personne pénétrée replie ses genoux contre sa poitrine, le ou la partenaire s'accroupissant ou se penchant en avant. Le mouvement est vertical et profond, offrant une excellente stimulation du point G.",
  confortable_l_etoile_de_mer: "La personne pénétrée est allongée sur le dos, bras et jambes largement écartés, l'autre se plaçant au-dessus. Les va-et-vient sont fluides et demandent très peu d'efforts, idéal pour la relaxation.",
  confortable_l_herboriste: "La personne pénétrée est sur le dos, une jambe pliée et l'autre tendue, le ou la partenaire entre ses cuisses. Cette asymétrie modifie l'angle de pénétration et stimule des zones inhabituelles.",
  confortable_l_union_de_l_indra: "Les deux partenaires sont assis face à face, l'un sur les cuisses de l'autre, bras et jambes enlacés. Le mouvement se fait par de légères ondulations du bassin, pour une connexion intense et un contact visuel continu.",
  confortable_l_union_de_l_aigle: "La personne pénétrée est sur le dos et lève les jambes très haut, parfois sur les épaules du ou de la partenaire à genoux face à elle. Pénétration très profonde et vue dégagée pour les deux.",
  confortable_l_union_de_l_huitre: "La personne pénétrée est sur le dos et ramène ses pieds vers sa tête, refermant son corps comme une huître tandis que l'autre pénètre par le haut. Le mouvement est restreint mais la profondeur est maximale.",
  confortable_l_union_de_la_pie: "Les deux partenaires sont assis face à face, l'un enveloppant la taille de l'autre avec ses jambes. Le balancier d'avant en arrière permet de contrôler précisément le rythme et la profondeur.",
  confortable_l_union_de_la_pieuvre: "Les partenaires sont enlacés face à face, assis ou couchés, bras et jambes entremêlés. Les mouvements sont lents et sinueux, mettant l'accent sur la sensualité et le contact de la peau.",
  confortable_l_union_de_la_tortue: "La personne pénétrée est sur le dos, genoux repliés et serrés contre la poitrine, l'autre se couchant par-dessus en l'enveloppant. Mouvement court et contenu, maximisant la sensation d'étreinte protectrice.",
  confortable_l_union_du_chat: "Proche du missionnaire, la personne pénétrée croise ses chevilles derrière le dos du ou de la partenaire allongé·e sur elle. La friction permet une stimulation intense et continue du clitoris.",
  confortable_l_union_du_lotus: "Les partenaires sont assis en tailleur face à face, l'un sur les cuisses de l'autre, jambes autour du dos. Les mouvements se font par balancements du bassin, pour une stimulation douce et une grande complicité.",
  confortable_l_union_du_tigre: "Dérivée de la levrette, la personne pénétrée est à quatre pattes mais abaisse buste et tête contre le lit, fesses surélevées, l'autre pénétrant par l'arrière. Pénétration profonde, sensation de lâcher-prise.",
  confortable_la_balle_gagnante: "La personne pénétrée est sur le dos, jambes repliées sur le bassin, l'autre par-dessus exerçant une pression constante. La rotation du bassin optimise le contact avec le point G.",
  confortable_la_cravate_de_notaire: "La personne pénétrée est sur le dos et place ses jambes sur les épaules du ou de la partenaire agenouillé·e. Le va-et-vient vertical offre un angle de pénétration très direct et stimulant.",
  confortable_la_deesse_au_cheveux_longs: "La personne pénétrée est sur le dos au bord du lit, jambes pendantes ou posées sur l'autre, qui se tient debout ou à genoux face à elle. Mouvement horizontal facilité, confort optimal pour la personne allongée.",
  confortable_la_langue_de_chat: "Axée sur le cunnilingus ou l'anulingus : la personne est allongée sur le dos, jambes écartées, pendant que l'autre utilise sa langue par mouvements circulaires et de va-et-vient. Stimulation ciblée des zones érogènes externes.",
  confortable_la_mysterieuse_entrevue: "Les partenaires sont allongés sur le côté, face à face, jambes entrecroisées pour permettre la pénétration. Mouvement doux et berçant, idéal pour les rapports prolongés et sans effort.",
  confortable_la_position_de_l_arc_en_ciel: "La personne pénétrée place un coussin sous ses fesses pour cambrer le bassin, l'autre se plaçant au-dessus. Le mouvement suit la courbure du corps, stimulant intensément la paroi vaginale antérieure.",
  confortable_la_position_de_l_epicurien: "Le ou la partenaire pénétrant·e est assis·e confortablement, l'autre s'asseyant sur lui ou elle, de face ou de dos. Le mouvement, géré par la personne du dessus, permet de choisir l'inclinaison exacte.",
  confortable_la_position_de_l_indolent: "Les deux partenaires sont allongés sur le côté dans la même direction (cuillères), la personne pénétrante derrière. Mouvement lent et de faible amplitude, idéal pour un réveil en douceur.",
  confortable_la_position_de_la_courtisane: "La personne pénétrée est sur le dos, une jambe allongée et l'autre sur l'épaule du ou de la partenaire à genoux. Le va-et-vient asymétrique permet d'ajuster l'ouverture pour des sensations variées.",
  confortable_la_position_du_noeud_coulant: "Les partenaires sont face à face, l'un assis et l'autre sur ses cuisses, jambes enserrant fermement le torse. Le va-et-vient vertical très serré accentue les frictions et la sensation d'étreinte.",
  confortable_la_posture_de_la_balance: "Les partenaires sont assis face à face, jambes tendues les unes contre les autres, se tenant par les mains pour basculer d'avant en arrière. Ce balancier rythmé sollicite les abdos et offre une pénétration régulière.",
  confortable_la_posture_de_la_balancoire: "La personne pénétrée est assise au bord d'une table ou d'un meuble haut, l'autre debout face à elle. Le va-et-vient horizontal est fluide et sans contrainte pour les articulations.",
  confortable_la_posture_des_cuilleres: "Les deux partenaires sont allongés sur le côté, l'un derrière l'autre, blottis. Le va-et-vient discret et relaxant favorise une grande tendresse et un endormissement complice.",
  confortable_le_69: "Les partenaires sont allongés tête-bêche, l'un sur l'autre ou sur le côté, chaque bouche au niveau du sexe de l'autre. Stimulation bucco-génitale simultanée.",
  confortable_le_cache_cache: "La personne pénétrée est sur le ventre, jambes serrées, l'autre s'allongeant par-dessus pour la pénétrer par l'arrière. Le glissement superficiel mais serré offre des sensations intenses à l'entrée.",
  confortable_le_missionnaire: "La personne pénétrée est sur le dos, jambes écartées, l'autre au-dessus entre ses cuisses. Le va-et-vient classique permet contact visuel permanent et baisers faciles.",
  confortable_le_reveur_ardent: "La personne pénétrée est sur le dos, jambes levées et pliées à 90°, l'autre en appui sur ses avant-bras au-dessus d'elle. Mouvement vertical et cadencé, alliant confort dorsal et profondeur.",
  confortable_le_tape_cul: "En position assise face à face, le ou la partenaire du dessus effectue des mouvements de haut en bas en prenant appui sur ses pieds ou ses genoux. Ce rebond offre des pressions changeantes.",
  confortable_le_vol_des_mouettes: "La personne pénétrée est sur le dos au bord du lit, jambes levées et largement écartées, soutenues par le ou la partenaire debout. Mouvement ample et profond, zone pelvienne entièrement dégagée.",
  sportive_l_arbre_a_fruits: "Le ou la partenaire pénétrant·e est debout et porte l'autre, qui enroule ses jambes autour de sa taille. Le mouvement, géré par les flexions du porteur, demande de la force et procure une sensation de lévitation.",
  sportive_l_union_de_l_abeille: "La personne pénétrée est sur le dos, fesses surélevées par un coussin, et effectue de rapides vibrations du bassin pendant la pénétration. Ce mouvement vibratoire accentue les sensations clitoridiennes et vaginales.",
  sportive_l_union_de_l_elephant: "Les deux partenaires sont allongés sur le ventre, l'un sur l'autre, la personne pénétrante glissant ses jambes entre celles du dessous. Le mouvement lourd et frottant crée une forte pression sur le pubis.",
  sportive_l_union_de_la_deesse: "La personne du dessus (Andromaque) se penche complètement en arrière, cambrant son corps, l'autre allongé·e sur le dos. Demande de la souplesse, offre une pénétration profonde et un contrôle total du rythme.",
  sportive_l_union_de_la_grenouille: "La personne pénétrée est accroupie sur le lit, genoux très écartés, l'autre derrière elle également accroupi·e. Le va-et-vient physique sollicite les cuisses et ouvre grand le bassin.",
  sportive_l_union_des_amants: "Les partenaires sont debout face à face, l'un levant une jambe pour l'enrouler autour de la hanche de l'autre. Demande un bon équilibre et permet un rapport dynamique hors du lit.",
  sportive_l_union_du_papillon: "La personne pénétrée est sur le dos au bord d'un meuble haut, jambes relevées et battant l'air, l'autre debout. Le mouvement horizontal rapide stimule intensément l'entrée du vagin.",
  sportive_la_barque: "Les partenaires sont assis face à face, jambes entrelacées et mains jointes, basculant d'avant en arrière en tendant alternativement les jambes. Ce mouvement de rame sollicite les abdos et varie la profondeur.",
  sportive_la_berceuse: "En position assise face à face, le ou la partenaire du dessous bascule son buste d'avant en arrière, l'autre suivant le mouvement. Va-et-vient fluide, cadencé et presque hypnotique.",
  sportive_la_levrette: "La personne pénétrée est à quatre pattes, l'autre derrière elle pour la pénétrer. Le va-et-vient libre et puissant offre une grande profondeur.",
  sportive_la_position_de_l_antilope: "La personne pénétrée est sur le dos, une jambe tendue au sol et l'autre pliée contre le torse, tenue par l'autre à genoux. Le mouvement asymétrique oriente précisément vers les zones les plus érogènes.",
  sportive_la_position_de_l_homme_debout: "Les deux partenaires sont debout face à face, la personne pénétrée soulevée ou en appui contre un mur. Le mouvement vertical ou horizontal est intense et demande de l'endurance.",
  sportive_la_position_de_la_grenouille_a_la_nage: "La personne pénétrée est sur le ventre, cuisses écartées et genoux pliés sur les côtés, l'autre allongé·e par-dessus par l'arrière. La friction à plat offre un contact pubien très fort.",
  sportive_la_position_du_cheval_au_galop: "En Andromaque, la personne du dessus effectue des mouvements d'avant en arrière très rapides et énergiques, comme un galop. Rythme soutenu, sensations intenses et fatigue rapide des cuisses.",
  sportive_la_position_du_neophyte: "Le ou la partenaire pénétrant·e est à genoux, l'autre allongé·e sur le dos, jambes détendues et écartées au maximum. Mouvement simple et direct, idéal pour se concentrer sur les sensations internes.",
  sportive_la_posture_de_l_enclume: "La personne pénétrée est sur le dos, jambes complètement ramenées par-dessus la tête, reposant sur le torse de l'autre qui pénètre par le haut. Le mouvement vertical descendant est extrêmement profond.",
  sportive_la_posture_de_la_lune: "La personne pénétrée est en appui sur les coudes et les genoux, dos bien cambré, l'autre s'approchant par l'arrière debout ou demi-genou. Le mouvement oblique ascendant cible intensément le point G.",
  sportive_la_posture_du_roseau: "La personne pénétrée est sur le dos et tend ses deux jambes verticalement ensemble, l'autre par-dessus pour la pénétrer. Mouvement serré et linéaire, sensation d'étroitesse maximale.",
  sportive_le_l: "L'un·e est allongé·e sur le dos et l'autre assis·e perpendiculairement, les corps formant un angle droit. Le mouvement se fait par torsions et oscillations du bassin, modifiant constamment les points de contact.",
  sportive_le_cerf_en_rut: "Variante de la levrette où la personne pénétrée lève une jambe en l'air ou la pose sur le côté, accentuant l'asymétrie, l'autre pénétrant par l'arrière. Mouvement vigoureux qui sollicite les parois latérales.",
  sportive_le_cheval_inverse: "La personne pénétrée est assise au-dessus de l'autre allongé·e, mais en lui tournant le dos. Le mouvement de haut en bas ou d'avant en arrière, géré par le dessus, offre une grande autonomie.",
  sportive_le_chevauchement: "Position classique où la personne pénétrée est au-dessus de l'autre allongé·e, de face. Le mouvement, guidé par le dessus, facilite le contrôle de l'amplitude, de la vitesse et de l'orgasme.",
  sportive_le_marteau_piqueur: "La personne pénétrée est sur le dos, jambes relevées sur le torse de l'autre qui effectue des va-et-vient très rapides, verticaux et percutants. Position à haute intensité axée sur la vitesse.",
  sportive_le_moulin_a_vent: "En Andromaque, la personne du dessus effectue des mouvements circulaires du bassin plutôt que de haut en bas. Cette rotation frotte toutes les parois et stimule le clitoris en continu.",
  sportive_le_tendre_amant: "Les partenaires sont assis face à face, étroitement enlacés, l'un tirant doucement avec ses bras pour rapprocher les bassins. Mouvement minimal mais friction cutanée et proximité des visages maximales.",
  sportive_les_nageurs: "Les deux partenaires sont allongés sur le ventre, côte à côte et légèrement imbriqués, mimant une nage synchronisée pour bouger le bassin. Mouvement horizontal et rasant, sensations de glisse très douces.",
  sportive_position_d_andromaque: "La personne pénétrée se place au-dessus de l'autre allongé·e, gérant entièrement la pénétration. Les mouvements verticaux ou d'avant en arrière régulent le plaisir et stimulent le clitoris contre le pubis.",
  sportive_posture_de_la_charrue: "Inspirée du yoga : la personne pénétrée est sur le dos et bascule jambes et bassin au-dessus de sa tête, l'autre pénétrant par le haut. Mouvement très profond qui demande une excellente souplesse.",
  acrobatique_l_etreinte_du_panda: "Le ou la partenaire pénétrant·e est assis·e et l'autre se suspend à son cou et sa taille, jambes enroulées, sans toucher le sol. Le mouvement, à la force des bras et des reins, crée une fusion en apesanteur.",
  acrobatique_l_offrande_secrete: "La personne pénétrée est sur le ventre, fesses très relevées sur des coussins, tête basse, l'autre par-dessus par l'arrière. Le mouvement plongeant et incliné permet une pénétration profonde sans effort pour le dos.",
  acrobatique_l_union_du_loup: "Variante de la levrette où la personne pénétrée est debout, penchée en avant à 90°, l'autre la pénétrant par l'arrière en la tenant par les hanches. Mouvement horizontal puissant qui demande une bonne stabilité.",
  acrobatique_l_union_du_scorpion: "La personne pénétrée est sur le ventre et relève ses jambes vers l'arrière comme un dard, l'autre s'approchant par l'arrière. Cette cambrure extrême rend la pénétration très intense dès l'entrée.",
  acrobatique_l_union_suspendue: "Le ou la partenaire pénétrant·e est debout et soulève complètement l'autre contre un mur, jambes encerclant sa taille. Le mouvement vertical demande une force athlétique et procure une intensité sauvage.",
  acrobatique_la_brouette_thailandaise: "Le ou la partenaire pénétrant·e est debout et tient les jambes de l'autre, en appui au sol uniquement sur ses mains. Les va-et-vient demandent beaucoup de force dans les bras, pour un rapport très athlétique.",
  acrobatique_la_brouette: "La personne pénétrée est en appui sur les mains au sol, l'autre debout tenant ses cuisses pour la pénétrer par l'arrière. Mouvement dynamique guidé par le ou la partenaire debout, fort gainage des deux corps.",
  acrobatique_la_chaise_magique: "Le ou la partenaire pénétrant·e fait la chaise contre un mur et l'autre s'assoit sur ses cuisses, de face. Le mouvement vertical, à la force des cuisses, vaut un véritable exercice physique.",
  acrobatique_la_culbute: "Pendant l'acte, la personne pénétrée passe du dos au ventre sans rompre la pénétration, obligeant l'autre à pivoter. Cette transition demande de l'agilité et change instantanément les sensations.",
  acrobatique_la_danse_du_missionnaire: "À partir du missionnaire, les partenaires ajoutent des roulis latéraux au va-et-vient, balançant les corps de gauche à droite. Ce mouvement tridimensionnel stimule de nouvelles zones à l'entrée du vagin.",
  acrobatique_la_fleur_beante: "La personne pénétrée est sur le dos, jambes écartées au maximum et pliées pour que les pieds touchent les hanches, ouvrant grand la vulve. L'autre pénètre verticalement, exposition totale et pénétration sans barrière.",
  acrobatique_la_position_de_l_amazone: "La personne pénétrée est au-dessus, accroupie sur ses pieds plutôt qu'à genoux, et effectue des va-et-vient verticaux rapides en poussant sur ses jambes. Ce squat donne un contrôle millimétré de la profondeur.",
  acrobatique_la_position_de_l_acrobate: "La personne pénétrée réalise un appui tendu renversé contre un mur, l'autre debout la pénétrant. Le mouvement vertical inversé modifie l'afflux sanguin et offre des sensations de gravité inédites.",
  acrobatique_la_position_de_l_artilleur: "La personne pénétrée est sur le dos, jambes sur les épaules de l'autre qui, accroupi·e, la saisit par les fesses pour la soulever. Mouvement direct et puissant, ciblant le fond avec force.",
  acrobatique_la_position_de_l_equerre: "L'un·e est assis·e jambes tendues devant, l'autre s'assoit sur son sexe en tendant aussi les jambes parallèlement. Mouvement horizontal qui demande une grande souplesse des ischio-jambiers.",
  acrobatique_la_position_de_la_bete_a_deux_tetes: "Les partenaires sont allongés tête-bêche sur le côté, s'enlaçant par les jambes pour la pénétration. Mouvement restreint et sinueux, axé sur la souplesse et la symétrie.",
  acrobatique_la_position_de_la_tigresse: "Variante intense d'Andromaque où la personne du dessus s'agrippe au torse de l'autre en effectuant des va-et-vient saccadés et sauvages. L'atout : une domination sensuelle et un rythme effréné.",
  acrobatique_la_position_des_chimpanzes: "Les deux partenaires sont accroupis face à face, s'accrochant par les bras pour garder l'équilibre pendant le va-et-vient. Le rebond sollicite les genoux et libère le mouvement du bassin.",
  acrobatique_la_posture_de_la_tige: "Le ou la partenaire pénétrant·e est debout et l'autre suspendu·e, une jambe enroulée autour de sa hanche et l'autre tendue vers le bas. Le mouvement vertical asymétrique requiert de la force de portage.",
  acrobatique_le_charmeur_de_serpent: "La personne pénétrée est sur le dos et ondule son corps comme un serpent pendant que l'autre, à genoux, maintient une pénétration stable. Cette ondulation crée des vagues de plaisir variables.",
  acrobatique_le_collier_de_venus: "La personne pénétrée est sur le dos et enroule ses jambes autour du cou de l'autre, penché·e au-dessus d'elle. Le va-et-vient très rapproché offre une pénétration profonde et enveloppante.",
  acrobatique_le_grand_ecart: "La personne pénétrée effectue un grand écart, facial ou latéral, l'autre se plaçant au centre pour la pénétrer. Souplesse extrême et ouverture pelvienne maximale, pour des sensations très distinctes.",
  acrobatique_le_lateral: "Les partenaires sont allongés perpendiculairement, formant un T, la pénétration se faisant par le côté. Le va-et-vient asymétrique frotte les parois latérales de manière inédite.",
  acrobatique_le_petit_pont: "La personne pénétrée fait le pont (en appui sur mains et pieds, dos cambré vers le ciel), l'autre se glissant dessous ou par-dessus pour la pénétrer. Très exigeant, il sollicite toute la chaîne postérieure.",
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
