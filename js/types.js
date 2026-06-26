/**
 * types.js — Interfaces JSDoc et enums pour DailyLog, Cycle, IntimateSession.
 * Importer ces constantes pour la cohérence des valeurs dans les autres modules.
 *
 * Usage : import { FluxMenstruel, ActivityType } from './types.js'
 */

// ═══════════════════════════════════════════════════════════════════════════
// ENUMS — Valeurs strictes pour champs à choix unique
// ═══════════════════════════════════════════════════════════════════════════

export const FluxMenstruel = Object.freeze({
  AUCUN:         'aucun',
  LEGERES:       'legeres',
  MODERE:        'modere',
  ABONDANT:      'abondant',
  TRES_ABONDANT: 'tres_abondant',
});

export const Spotting = Object.freeze({
  ROUGE: 'rouge', MARRON: 'marron', ROSE: 'rose', TACHES: 'taches',
});

export const ProtectionType = Object.freeze({
  SERVIETTE: 'serviette', TAMPON: 'tampon', COUPE: 'coupe',
  CULOTTE:   'culotte_regles', PROTEGE_SLIP: 'protegeSlip',
});

export const ProtectionFreq = Object.freeze({
  NORMAL: 'normal', FREQUENT: 'frequent', TRES_FREQUENT: 'tres_frequent',
});

export const NiveauEnergie = Object.freeze({
  EPUISEE: 'epuisee', FATIGUEE: 'fatiguee', OK: 'ok', EN_FORME: 'en_forme',
});

export const Rapports = Object.freeze({
  AVEC_PROTECTION:  'avec_protection',
  SANS_PROTECTION:  'sans_protection',
  RETRAIT:          'retrait',
  PAS_SEXE:         'pas_sexe',
});

export const ActivityType = Object.freeze({
  ORAL:          'oral',
  TOUCHE_SENSUEL:'touche_sensuel',
  WANT_CUTE_KISS:'want_cute_kiss',
  MASTURBATION:  'masturbation',
  SEXTING:       'sexting',
  FANTASMES:     'fantasmes',
  LIBIDO_ELEVEE: 'libido_elevee',
  LIBIDO_BASSE:  'libido_basse',
});

export const OrgasmeType = Object.freeze({
  // Elle
  CLITORIDIEN: 'clitoridien', VAGINAL: 'vaginal', MIXTE: 'mixte',
  MULTIPLE: 'multiple', ANAL: 'anal',
  // Lui
  PROSTATIQUE: 'prostatique', PENIEN: 'pénien', RETARDE: 'retardé',
});

export const SextoysType = Object.freeze({
  VIBROMASSEUR: 'vibromasseur', GODE: 'gode',
  PLUG: 'plug', ANNEAU: 'anneau', SEXTOY_COUPLE: 'sextoy_couple',
});

export const StressCouple = Object.freeze({
  BONNE_AMBIANCE: 'bonne_ambiance', AUCUN: 'aucun',
  TENSION: 'tension', DISPUTE: 'dispute', RECONCILIATION: 'reconciliation',
});

export const PhaseNom = Object.freeze({
  MENSTRUELLE:         'Menstruelle',
  FOLLICULAIRE_PRECOCE:'Folliculaire précoce',
  FOLLICULAIRE_TARDIVE:'Folliculaire tardive',
  OVULATION:           'Ovulation',
  LUTEALE_PRECOCE:     'Lutéale précoce',
  LUTEALE_TARDIVE:     'Lutéale tardive',
});

export const SessionType = Object.freeze({
  COUPLE:      'couple',
  SOLO:        'solo',
  DISTANCE:    'distance',
  AUTRE:       'autre',
});

// ═══════════════════════════════════════════════════════════════════════════
// @typedef — Interfaces JSDoc pour autocomplétion IDE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} OrgasmesPartner
 * @property {number|null}   count   — nombre d'orgasmes
 * @property {string[]}      types   — valeurs de OrgasmeType
 */

/**
 * @typedef {Object} DailyLogOrgasmes
 * @property {OrgasmesPartner} toi
 * @property {OrgasmesPartner} partenaire
 */

/**
 * @typedef {Object} DailyLogGrossesse
 * @property {string|null}  trimestre
 * @property {string[]}     symptomsGrossesse
 * @property {string[]}     superPouvoirs
 * @property {string|null}  mouvementsFrequence
 * @property {boolean}      douleursBasDos
 */

/**
 * @typedef {Object} DailyLogPerimenopauses
 * @property {string|null}  bouffeesChaleur
 * @property {boolean}      secheresseVaginale
 */

/**
 * @typedef {Object} DailyLogType
 * @property {string}                date
 * @property {string|null}           userId
 *
 * Flux & Saignements
 * @property {string|null}           fluxMenstruel      — FluxMenstruel
 * @property {string|null}           spotting           — Spotting
 * @property {string|null}           textureFlux
 * @property {string|null}           protectionType     — ProtectionType
 * @property {string|null}           protectionFreq     — ProtectionFreq
 *
 * Émotions
 * @property {string[]}              emotions
 * @property {string[]}              etatCognitif
 *
 * Énergie & Sommeil
 * @property {string|null}           niveauEnergie      — NiveauEnergie
 * @property {string[]}              symptomesSommeil
 * @property {number|null}           dureeSommeil       — heures
 *
 * Douleurs
 * @property {string[]}              douleursPelviennes
 * @property {string[]}              douleursCorps
 *
 * Digestion
 * @property {string[]}              fringales
 * @property {string|null}           transit
 *
 * Corps
 * @property {string|null}           glaireCervicale
 * @property {string[]}              etatPeau
 * @property {string[]}              etatCheveux
 * @property {string[]}              urineSymptomes
 * @property {number|null}           temperatureBasale  — °C
 * @property {number|null}           poids              — kg
 *
 * Lifestyle
 * @property {string[]}              vieSociale
 * @property {string[]}              loisirs
 * @property {string[]}              fete
 * @property {string|null}           exercice
 * @property {number|null}           meditation         — minutes
 *
 * Sexualité
 * @property {string|null}           rapports           — Rapports
 * @property {string[]}              libidoPratiques    — ActivityType[]
 * @property {boolean|null}          orgasme            — raccourci rétrocompat
 * @property {number|null}           libidoScale        — 1-5 (toi)
 * @property {number|null}           libidoPartenaireScale — 1-5
 * @property {DailyLogOrgasmes}      orgasmes
 * @property {number|null}           satisfactionSexuelle   — 1-10
 * @property {number|null}           satisfactionPartenaire — 1-10
 * @property {string[]}              sextoys            — SextoysType[]
 * @property {boolean}               lubrifiant
 * @property {string[]}              positionsUtilisees — ids POSITIONS
 * @property {string[]}              kinksDate          — kink ids
 * @property {boolean}               aftercare
 * @property {string|null}           aftercareNote
 *
 * Facteurs couple
 * @property {string|null}           stressCouple       — StressCouple
 *
 * Médical
 * @property {string[]}              contraceptionActifs
 * @property {string|null}           testOvulation
 * @property {string[]}              traitements
 * @property {number|null}           fievre             — °C
 * @property {string[]}              symptomsAutres
 *
 * Grossesse
 * @property {boolean}               enceinte
 * @property {DailyLogGrossesse}     grossesse
 *
 * Périménopause
 * @property {DailyLogPerimenopauses} perimenopauses
 *
 * Note & Tags
 * @property {string|null}           noteDuJour         — max 3000 chars
 * @property {string[]}              tags
 */

/**
 * @typedef {Object} IntimateSessionType
 * @property {string}         id
 * @property {string}         couple_id
 * @property {string}         date          — YYYY-MM-DD
 * @property {string}         type          — SessionType
 * @property {number}         durationMin   — minutes
 * @property {string[]}       activities    — ActivityType[]
 * @property {string[]}       positions     — position ids depuis POSITIONS
 * @property {boolean}        prelims
 * @property {number}         orgasmsElle   — compte
 * @property {number}         orgasmsLui    — compte
 * @property {number}         satisfactionElle  — 1-10
 * @property {number}         satisfactionLui   — 1-10
 * @property {string[]}       kinks         — kink ids pratiqués
 * @property {boolean}        lubrifiant
 * @property {string[]}       sextoys
 * @property {boolean}        aftercare
 * @property {string|null}    notePrivee    — note chiffrée
 * @property {string}         createdBy     — user_id
 */

/**
 * @typedef {Object} CyclePredictionType
 * @property {number|null}    jourDuCycleActuel
 * @property {string|null}    phaseDuCycle
 * @property {string|null}    dateDesProchainesRegles   — YYYY-MM-DD
 * @property {number}         avgCycleLength            — jours
 * @property {number}         avgPeriodDuration         — jours
 * @property {number}         variabilite               — écart-type en jours
 * @property {string|null}    ovulationDate             — YYYY-MM-DD
 * @property {string|null}    fertileStart              — YYYY-MM-DD
 * @property {string|null}    fertileEnd                — YYYY-MM-DD
 * @property {'haute'|'moyenne'|'faible'} confidence
 * @property {number}         cyclesAnalyzed
 */

/**
 * @typedef {Object} LibidoAlignmentType
 * @property {number}         elle   — 1-5
 * @property {number}         lui    — 1-5
 * @property {boolean}        aligned — |elle - lui| <= 1
 * @property {string}         date   — YYYY-MM-DD
 */
