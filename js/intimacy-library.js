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
  confortable_l_alignement_parfait: "L'homme est allongé sur le dos et la femme s'allonge de tout son long sur lui en serrant ses jambes. Cette posture assure une immobilité tonique et un frottement pubien étroit favorisant l'orgasme féminin.",
  confortable_l_approche_du_tigre: "La femme est agenouillée et appuyée sur ses avant-bras, tandis que l'homme vient la recouvrir de son corps par l'arrière. Ce rapprochement maximal offre un va-et-vient stable et des sensations clitoridiennes continues.",
  confortable_l_etoile_de_mer: "La femme est allongée sur le dos avec une jambe repliée et l'autre tendue, tandis que l'homme s'assoit sur la jambe tendue en s'appuyant en arrière sur ses mains. Cette posture reposante permet des va-et-vient doux et laisse les mains de l'homme libres pour caresser la femme.",
  confortable_l_herboriste: "Les deux partenaires pratiquent l'union sexuelle de manière simple dans un cadre naturel en plein air. L'atout principal est la stimulation sensorielle offerte par l'environnement extérieur combinée à une position classique et confortable.",
  confortable_l_union_de_l_indra: "La femme est allongée sur le dos, ses jambes repliées contre son buste, tandis que l'homme est agenouillé face à elle entre ses cuisses. Très simple à réaliser, elle offre une pénétration directe et un excellent contact visuel.",
  confortable_l_union_de_l_aigle: "Les deux partenaires sont allongés sur le côté face à face, la femme enroulant ses jambes relevées autour de la taille de l'homme. Cette configuration apporte une grande stabilité, tout en favorisant la complicité visuelle et les baisers.",
  confortable_l_union_de_l_huitre: "La femme est allongée sur le dos, ses jambes étant repliées sur son propre buste et maintenues au niveau des genoux par l'homme qui est agenouillé face à elle. Cette position comprime le canal vaginal pour maximiser la friction et l'intensité des sensations internes.",
  confortable_l_union_de_la_pie: "L'homme est assis bien droit sur un support rigide tandis que la femme s'assoit face à lui, ses pieds posés à plat sur le sol pour un appui stable. Cette configuration facilite les mouvements de va-et-vient et le contrôle du rythme par la partenaire.",
  confortable_l_union_de_la_pieuvre: "La femme est allongée sur le dos et enroule ses jambes autour du bassin de l'homme. Cette étreinte fusionnelle offre à l'homme une totale liberté de mouvement avec ses mains pour caresser le corps de sa partenaire.",
  confortable_l_union_de_la_tortue: "La femme s'allonge de tout son long sur le corps de l'homme allongé sur le dos, ses jambes étant légèrement décalées de part et d'autre des siennes. L'atout réside dans le contact corporel total qui renforce l'intimité et la tendresse.",
  confortable_l_union_du_chat: "Les deux partenaires sont allongés sur le côté en face-à-face, serrés l'un contre l'autre. Bien que l'amplitude du mouvement soit réduite, elle favorise une intimité extrême et un frottement clitoridien continu très doux.",
  confortable_l_union_du_lotus: "L'homme est assis en tailleur tandis que la femme s'assoit face à lui à califourchon, ses jambes enroulées autour de son dos et ses mains sur ses épaules. Cette posture tantrique privilégie la méditation, la proximité et un échange visuel permanent.",
  confortable_l_union_du_tigre: "La femme est allongée sur le dos, jambes repliées contre son buste, tandis que l'homme au-dessus d'elle passe ses bras sous ses genoux pour les soutenir. Elle offre un excellent contrôle de l'angle et de la profondeur de pénétration pour l'homme.",
  confortable_la_balle_gagnante: "L'homme est assis sur le lit jambes fléchies tandis que la femme s'assoit sur lui en se penchant en avant pour former une boule, l'homme collant son ventre contre son dos. Elle offre une sensation d'enveloppement et de protection tout en stimulant agréablement le vagin.",
  confortable_la_cravate_de_notaire: "L'homme est allongé sur le dos tandis que la femme, à califourchon, place le sexe masculin entre ses seins et effectue des mouvements de va-et-vient avec ses mains. C'est une alternative sensuelle et visuelle idéale pour les préliminaires ou sans pénétration vaginale.",
  confortable_la_deesse_au_cheveux_longs: "L'homme est allongé sur le dos tandis que la femme s'allonge sur lui de dos, étalant sa chevelure sur le visage de son partenaire. Cette posture offre un contact sensoriel original où la chevelure stimule délicatement le visage de l'homme.",
  confortable_la_langue_de_chat: "La femme est allongée sur le dos, jambes repliées vers son torse, tandis que son partenaire positionne sa tête dans son entrejambe. L'atout réside dans une stimulation clitoridienne buccale directe et très confortable pour les deux partenaires.",
  confortable_la_mysterieuse_entrevue: "Les deux partenaires sont debout, l'homme se plaçant derrière la femme pour la pénétrer par l'arrière. Très pratique et rapide à mettre en œuvre, elle peut être réalisée dans n'importe quel endroit pour rompre la routine.",
  confortable_la_position_de_l_arc_en_ciel: "La femme est allongée sur le côté avec les jambes tendues, tandis que l'homme se couche également sur le côté et insère ses jambes à la perpendiculaire. Cette configuration modifie l'axe de frottement vaginal pour stimuler le point G différemment.",
  confortable_la_position_de_l_epicurien: "L'homme est assis jambes écartées et attend que la femme vienne se placer à quatre pattes dos à lui pour la pénétration. C'est une posture confortable et passive pour l'homme qui permet à la femme de mener le mouvement.",
  confortable_la_position_de_l_indolent: "L'homme est allongé sur le lit, les jambes pendant au sol, tandis que la femme s'assoit à califourchon dos à lui. Cette posture passive pour l'homme permet à la femme de contrôler entièrement le rythme tout en profitant d'une grande liberté de caresses clitoridiennes.",
  confortable_la_position_de_la_courtisane: "La femme est assise avec un support dorsal, ses jambes enroulées autour de la taille de l'homme qui est à genoux face à elle. Cette position favorise un face-à-face intime, les caresses et les baisers.",
  confortable_la_position_du_noeud_coulant: "Les deux partenaires sont assis face-à-face et fesse-à-fesse, chacun tenant les chevilles relevées de l'autre dans ses mains. Cette posture assure une pénétration optimale et intense grâce au verrouillage des bassins.",
  confortable_la_posture_de_la_balance: "L'homme est assis sur le bord du lit tandis que la femme s'assoit sur ses cuisses en lui tournant le dos. Cette déclinaison de la balançoire permet un mouvement de balancement doux tout en gardant les mains libres pour caresser.",
  confortable_la_posture_de_la_balancoire: "L'homme est allongé sur un canapé ou le bord du lit, et la femme s'assoit sur lui en lui tournant le dos. Simple et reposante, elle permet de modifier les angles de frottement pubien sans effort acrobatique.",
  confortable_la_posture_des_cuilleres: "Les deux partenaires sont allongés sur le côté, l'homme étant blotti juste derrière la femme en collé-serré. Très fonctionnelle et reposante, elle convient parfaitement pour un rapport prolongé et confortable.",
  confortable_le_69: "Les deux partenaires sont allongés tête-bêche sur le côté ou l'un sur l'autre, la bouche de chacun faisant face au sexe de l'autre. Cette position classique offre un plaisir buccal et lingual réciproque, simultané et très confortable.",
  confortable_le_cache_cache: "L'homme caresse et déshabille la femme en glissant sa tête sous son vêtement, tandis que la femme caresse l'homme avec ses mains sous ses habits. C'est une approche idéale pour les préliminaires, qui renforce l'excitation visuelle et sensorielle.",
  confortable_le_missionnaire: "La femme est allongée sur le dos et l'homme est étendu au-dessus d'elle en face-à-face. Cette position classique et indémodable privilégie la connexion émotionnelle, la proximité des visages et les baisers.",
  confortable_le_reveur_ardent: "La femme s'installe au-dessus du corps de son partenaire qui est endormi et en érection. Elle permet à la femme de prendre l'initiative tout en douceur et de mener le rythme à sa guise.",
  confortable_le_tape_cul: "Les partenaires sont assis l'un en face de l'autre, jambes croisées, et se tiennent par les poignets pour imprimer des mouvements de balançoire. Ce va-et-vient rythmé par un mouvement de bascule offre une stimulation ludique.",
  confortable_le_vol_des_mouettes: "La femme est allongée sur le rebord du lit avec les genoux pliés et les pieds au sol, tandis que l'homme s'invite entre ses cuisses à genoux par terre. Elle évite d'avoir à supporter le poids du partenaire tout en offrant une pénétration profonde.",
  sportive_l_arbre_a_fruits: "La femme est allongée sur le dos et soulève le bassin tandis que l'homme, agenouillé entre ses cuisses, maintient l'une de ses jambes pliée contre son torse. Cette asymétrie offre une pénétration profonde qui cible intensément le point G.",
  sportive_l_union_de_l_abeille: "L'homme est assis sur des coussins et la femme s'assoit à califourchon sur lui en lui tournant le dos, jambes repliées sous elle. Le mouvement de rotation et d'oscillation verticale de la femme stimule intensément le clitoris contre le pubis de l'homme.",
  sportive_l_union_de_l_elephant: "La femme est allongée sur le ventre tandis que l'homme s'allonge directement sur elle pour la pénétrer par l'arrière. L'atout réside dans le frottement pubien intense et les sensations d'étroitesse vaginale.",
  sportive_l_union_de_la_deesse: "L'homme est assis et la femme s'installe face à lui sur ses cuisses, en enroulant ses jambes autour de son dos. Ce sont les mouvements de la femme qui guident la cadence dans cette posture sensuelle propice aux caresses.",
  sportive_l_union_de_la_grenouille: "Les deux partenaires sont allongés l'un sur l'autre (femme au-dessus) en entrelaçant leurs pieds et chevilles. Cette étreinte serrée renforce la complicité physique et le contact fusionnel pendant le mouvement.",
  sportive_l_union_des_amants: "Les deux partenaires sont debout serrés l'un contre l'autre, la femme enroulant une de ses jambes autour de la taille de l'homme. Cette posture verticale exige une bonne complicité physique et un équilibre partagé.",
  sportive_l_union_du_papillon: "Les deux partenaires sont assis l'un face à l'autre en prenant appui sur leurs mains légèrement en arrière, les pieds de la femme posés au sol. Cette assise stable permet de synchroniser les mouvements du bassin tout en douceur.",
  sportive_la_barque: "L'homme est allongé sur le dos tandis que la femme s'assoit confortablement sur lui en amazone, les jambes écartées. Cette assise stable permet à la femme de mener la cadence avec beaucoup d'aisance.",
  sportive_la_berceuse: "L'homme s'assoit sur le lit avec une jambe allongée et l'autre repliée sous lui, tandis que la femme s'assoit sur son sexe avant de s'allonger sur le dos. Elle offre une transition douce entre l'assise et la position couchée pour un plaisir progressif.",
  sportive_la_levrette: "La femme est à quatre pattes sur le lit tandis que l'homme est agenouillé derrière elle pour la pénétration. C'est une position classique et incontournable qui offre une pénétration profonde et une grande liberté de caresses.",
  sportive_la_position_de_l_antilope: "L'homme debout soulève la femme face à lui, celle-ci enlaçant sa taille avec ses jambes. Athlétique et intense, elle procure une sensation de force et de connexion physique extrême.",
  sportive_la_position_de_l_homme_debout: "L'homme est debout et porte la femme qui enroule ses jambes autour de sa taille en la soutenant par les fesses. Idéale pour rompre la routine, elle sollicite le tonus musculaire des deux partenaires pour des sensations aériennes.",
  sportive_la_position_de_la_grenouille_a_la_nage: "La femme est allongée sur le ventre, ses jambes repliées sur les côtés, tandis que l'homme est à genoux derrière elle en maintenant ses mains. Elle offre une pénétration arrière douce avec une large ouverture du bassin.",
  sportive_la_position_du_cheval_au_galop: "L'homme assis sur ses talons accueille le bassin de la femme allongée sur le dos et la maintient fermement par les poignets. Cette posture dynamique et tonique sollicite la musculature des partenaires pour un rythme soutenu.",
  sportive_la_position_du_neophyte: "La femme est allongée sur le dos tandis que l'homme agenouillé soulève et maintient fermement son bassin pour la pénétrer. Elle simplifie l'accès vaginal tout en garantissant un excellent contrôle de l'angle de pénétration.",
  sportive_la_posture_de_l_enclume: "La femme est allongée sur le dos et place ses chevilles sur les épaules de l'homme qui la pénètre en s'appuyant sur ses cuisses. Cette posture modifie l'axe de pénétration pour la rendre particulièrement profonde et intense.",
  sportive_la_posture_de_la_lune: "L'homme est assis jambes écartées et la femme s'allonge sur le dos face à lui, ses jambes de chaque côté de sa taille. Elle combine l'étirement des jambes de la femme à une pénétration stable.",
  sportive_la_posture_du_roseau: "La femme est allongée sur le dos, jambes légèrement fléchies, tandis que l'homme se place entre ses jambes en prenant appui sur ses mains. C'est l'homme qui dirige entièrement le rythme et la cadence sous un angle légèrement incliné.",
  sportive_le_l: "L'homme est assis jambes tendues et la femme s'allonge à plat ventre sur ses jambes, bassin contre bassin. Cette posture asymétrique offre une pénétration arrière originale et un frottement stimulant pour les parois vaginales.",
  sportive_le_cerf_en_rut: "L'homme debout derrière la femme la soulève à la seule force de ses bras tandis qu'elle maintient ses genoux pliés. Cette posture aérienne et athlétique demande force et souplesse pour un va-et-vient original.",
  sportive_le_cheval_inverse: "La femme chevauche l'homme allongé sur le dos mais en lui tournant le dos, assise sur son bassin. Elle permet à la femme de guider le plaisir et de contrôler précisément la profondeur de la pénétration.",
  sportive_le_chevauchement: "L'homme est allongé sur le dos et la femme s'installe au-dessus de lui, ses genoux pliés de chaque côté de ses fesses. Cette posture classique donne à la femme le contrôle total de l'inclinaison et de la cadence.",
  sportive_le_marteau_piqueur: "La femme est installée en chandelle en se soutenant les reins, tandis que l'homme se place debout à genoux entre ses jambes. Cette posture sportive est idéale pour des va-et-vient rapides stimulant intensément l'entrée du vagin.",
  sportive_le_moulin_a_vent: "La femme est sur le dos appuyée sur ses avant-bras avec les jambes fléchies, tandis que l'homme est agenouillé face à elle. La femme alterne des va-et-vient avec ses jambes pour faire pivoter le bassin et stimuler les parois vaginales.",
  sportive_le_tendre_amant: "La femme est allongée sur le dos et glisse son bassin vers l'homme agenouillé qui soutient son fessier. Cette posture privilégie la lenteur, la complicité et des mouvements doux pour prolonger l'excitation.",
  sportive_les_nageurs: "Dans l'eau, l'homme debout se place entre les cuisses de la femme qui flotte sur le dos. L'atout réside dans la sensation de légèreté et de flottaison procurée par le milieu aquatique.",
  sportive_position_d_andromaque: "La femme s'installe à califourchon sur l'homme allongé sur le dos. C'est la position idéale pour que la partenaire contrôle son plaisir et le rythme, tout en libérant les mains de l'homme.",
  sportive_posture_de_la_charrue: "La femme s'allonge sur le lit, les fesses au bord, ses genoux contre son ventre et ses chevilles entourant la taille de l'homme debout. Elle procure une pénétration rectiligne profonde avec un excellent contact visuel.",
  acrobatique_l_etreinte_du_panda: "Allongés tête-bêche, la femme enroule ses jambes autour de l'homme pour le rapprocher tandis qu'il remue son bassin. Cette posture de proximité favorise un contact clitoridien continu et enveloppant.",
  acrobatique_l_offrande_secrete: "La femme est allongée sur le côté avec une jambe repliée sur son torse et l'autre tendue, tandis que l'homme à cheval sur la jambe tendue la pénètre doucement. Cette posture intime offre une pénétration progressive et confortable.",
  acrobatique_l_union_du_loup: "La femme se penche en avant, jambes tendues et mains au sol, tandis que l'homme debout derrière elle la pénètre par l'arrière. Cette posture acrobatique combine un étirement musculaire à une pénétration arrière profonde.",
  acrobatique_l_union_du_scorpion: "La femme réalise un appui sur les mains ou les coudes (poirier), jambes repliées au-dessus d'elle, tandis que l'homme à genoux la pénètre face à elle. Les mouvements de va-et-vient sont délicats et exigent un équilibre parfait, offrant des sensations de pénétration inversée uniques.",
  acrobatique_l_union_suspendue: "Les deux partenaires sont debout, la femme enroulant une de ses jambes autour de la cuisse de l'homme pour s'ancrer. Elle exige de la force et de l'équilibre de la part de l'homme pour assurer le va-et-vient vertical.",
  acrobatique_la_brouette_thailandaise: "La femme fait le poirier en appui sur ses mains face à l'homme debout, qui la soutient par les chevilles et se baisse légèrement. Très athlétique, elle procure une pénétration arrière extrêmement directe et profonde.",
  acrobatique_la_brouette: "La femme est en appui sur ses avant-bras tandis que l'homme debout derrière elle soulève ses jambes par les cuisses. C'est une posture dynamique classique offrant une pénétration arrière profonde et rythmée.",
  acrobatique_la_chaise_magique: "La femme est assise sur le haut du dossier d'une chaise tandis que l'homme se glisse derrière elle pour la pénétrer. L'utilisation de la chaise offre un support rigide et des sensations de pénétration arrière originales.",
  acrobatique_la_culbute: "La femme est allongée sur le dos et renverse ses jambes par-dessus son corps le plus loin possible, l'homme venant les maintenir. La gravité et la bascule offrent une pénétration rectiligne très profonde.",
  acrobatique_la_danse_du_missionnaire: "En position du missionnaire, l'homme se redresse sur ses mains et effectue des rotations circulaires et des mouvements latéraux avec son bassin. Ce mouvement en huit stimule toutes les parois du vagin et le clitoris sans nécessiter de souplesse extrême.",
  acrobatique_la_fleur_beante: "La femme est allongée sur le dos, jambes repliées au maximum contre son buste et écartées par l'homme agenouillé face à elle. Le va-et-vient horizontal et profond de l'homme ouvre de manière optimale le bassin pour une stimulation directe du point G.",
  acrobatique_la_position_de_l_amazone: "L'homme est assis et la femme le chevauche en repliant ses jambes sur le côté (position en amazone). Les mouvements de rotation latérale de la femme offrent une pénétration douce avec un frottement asymétrique très agréable pour le clitoris.",
  acrobatique_la_position_de_l_acrobate: "L'homme est assis sur un tabouret tandis que la femme s'assoit face à lui à califourchon et se penche en arrière en s'accrochant à ses genoux. Elle procure une sensation de suspension aérienne et de contrôle pour la partenaire.",
  acrobatique_la_position_de_l_artilleur: "Face à l'homme assis, la femme place ses chevilles sur ses épaules et relève le buste, l'homme la soutenant par le dos et les fesses. Cette posture acrobatique assure une pénétration profonde et un excellent contact rapproché.",
  acrobatique_la_position_de_l_equerre: "La femme est allongée sur le dos sur le rebord d'une table, le bassin dans le vide, tandis que l'homme se tient debout entre ses cuisses. Elle offre une hauteur de travail idéale et un excellent angle de pénétration directe.",
  acrobatique_la_position_de_la_bete_a_deux_tetes: "La femme est sur le dos les jambes relevées tandis que l'homme, à quatre pattes de dos, vient coller son fessier au sien. C'est une position ludique et originale qui offre un angle de pénétration arrière atypique.",
  acrobatique_la_position_de_la_tigresse: "L'homme est assis sur le lit et maintient la taille de la femme qui place ses chevilles sur ses épaules, en prenant appui sur le lit. Cette posture acrobatique accentue la cambrure pour une stimulation intense et profonde.",
  acrobatique_la_position_des_chimpanzes: "L'homme est allongé sur le dos, jambes relevées et écartées, tandis que la femme vient s'asseoir sur son sexe en lui tournant le dos et se laisse guider. Elle demande souplesse, confiance et permet à l'homme de mener doucement le mouvement.",
  acrobatique_la_posture_de_la_tige: "La femme est allongée au sol (ou sur le lit) et pose ses jambes le long du torse de l'homme agenouillé, une cheville sur son épaule. Cette posture asymétrique modifie l'axe de pénétration pour des sensations internes intenses.",
  acrobatique_le_charmeur_de_serpent: "La femme est allongée sur le bord du lit, un pied au sol et l'autre jambe sur l'épaule de l'homme placé entre ses cuisses. Elle offre un angle de pénétration direct et asymétrique facilitant la stimulation du point G.",
  acrobatique_le_collier_de_venus: "La femme prend appui sur ses mains, le dos parallèle au sol, tandis que l'homme debout enroule les chevilles de sa partenaire autour de son cou. Très athlétique, elle procure un étirement intense et un contrôle total pour le partenaire actif.",
  acrobatique_le_grand_ecart: "La femme écarte les jambes au maximum de chaque côté tandis que l'homme vient se positionner face à elle. Très exigeante physiquement, elle permet une ouverture maximale et des angles de friction uniques.",
  acrobatique_le_lateral: "La femme est allongée sur le dos et bascule ses jambes fléchies sur le côté à angle droit, tandis que l'homme prend appui sur ses bras tendus. Cette configuration modifie l'axe vaginal pour cibler des zones internes asymétriques.",
  acrobatique_le_petit_pont: "L'homme s'allonge sur le dos et se soulève en pont sur ses membres, tandis que la femme le chevauche dos à lui sur la pointe des pieds. Cette posture technique permet de combiner cambrure dynamique et contrôle de l'amplitude du mouvement.",
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
