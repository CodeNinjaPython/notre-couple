/**
 * cycle-model.js — Modèle de données Cycle + DailyLog + algorithmes de prédiction.
 * Aucun doublon avec cycles.js (qui gère les opérations Supabase).
 */
import { localDateStr, diffDays, addDays } from './date-utils.js';

// ═══════════════════════════════════════════════════════════════════════════
// 1. CLASSE CYCLE
// ═══════════════════════════════════════════════════════════════════════════
export class Cycle {
  constructor(row = {}, dureeCycle = 30, dureeRegles = 5) {
    this.id          = row.id           || null;
    this.dateDebut   = row.period_start || null;
    this.dateFin     = row.period_end   || null;
    this.dureeCycle  = dureeCycle;
    this.dureeRegles = dureeRegles;
  }

  get dateFinPrevue() {
    if (this.dateFin)   return this.dateFin;
    if (!this.dateDebut) return null;
    return addDays(this.dateDebut, this.dureeRegles - 1);
  }

  get dateFinCycle() {
    if (!this.dateDebut) return null;
    return addDays(this.dateDebut, this.dureeCycle - 1);
  }

  getDayInCycle(today = localDateStr()) {
    if (!this.dateDebut) return null;
    return Math.max(1, diffDays(today, this.dateDebut) + 1);
  }

  getFertileWindow() {
    const ov = this.dureeCycle - 14;
    return { start: Math.max(1, ov - 5), end: Math.min(this.dureeCycle, ov + 1), ovulation: ov };
  }

  static phaseName(cycleDay, dureeCycle = 30, dureeRegles = 5) {
    if (cycleDay <= dureeRegles)           return 'Menstruelle';
    if (cycleDay <= 9)                     return 'Folliculaire précoce';
    if (cycleDay <= dureeCycle - 15)       return 'Folliculaire tardive';
    if (cycleDay <= dureeCycle - 13)       return 'Ovulation';
    if (cycleDay <= dureeCycle - 7)        return 'Lutéale précoce';
    return 'Lutéale tardive';
  }

  phaseActuelle(today = localDateStr()) {
    const day = this.getDayInCycle(today);
    return day ? Cycle.phaseName(day, this.dureeCycle, this.dureeRegles) : null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. CLASSE DAILYLOG — Modèle de données optimisé
//    Toutes les catégories enrichies, types stricts.
//    Stockage : une seule ligne log_entries par jour (category_id = 'journal').
// ═══════════════════════════════════════════════════════════════════════════
export class DailyLog {
  constructor({ date = localDateStr(), userId = null } = {}) {
    this.date   = date;
    this.userId = userId;

    // ── FLUX & SAIGNEMENTS ─────────────────────────────────────────────────
    this.fluxMenstruel = null; // aucun | legeres | modere | abondant | tres_abondant
    this.spotting      = null; // rouge | marron | rose | taches
    this.textureFlux   = null; // fluide | visqueux | normale | epaisse | caillotsRoses | caillotsNoirs

    // ── PROTECTIONS ────────────────────────────────────────────────────────
    this.protectionType  = null; // serviette | tampon | coupe | culotte_regles | protegeSlip
    this.protectionFreq  = null; // normal | frequent | tres_frequent  (enum, remplace l'ancien int)

    // ── ÉMOTIONS & HUMEUR ────────────────────────────────────────────────
    this.emotions      = []; // rien | heureuse | triste | en_colere | sensible | anxieuse | irritable | stressee | calme | confiante | sautes_humeur | pas_controle
    this.etatCognitif  = []; // brouillard | trous_memoire | distraite | hyper_concentree | creative | pas_motivation | concentree | motivee | productive | inefficace | stressee

    // ── ÉNERGIE & SOMMEIL ─────────────────────────────────────────────────
    this.niveauEnergie    = null; // epuisee | fatiguee | ok | en_forme
    this.symptomesSommeil = [];   // dur_endormir | reveil_en_forme | fatigue_reveil | sommeil_agite | insomnie | reves_intenses | sueurs_nocturnes
    this.dureeSommeil     = null; // Float (heures)

    // ── DOULEURS ──────────────────────────────────────────────────────────
    this.douleursPelviennes = []; // aucune | crampes | ovulation | tiraillements | dos | hanches
    this.douleursCorps      = []; // seins_sensibles | seins_douloureux | lombaires | migraine | tete | articulaires | jambes_lourdes

    // ── DIGESTION ─────────────────────────────────────────────────────────
    this.fringales          = []; // sucre | sale | gras | epice | perte_appetit | nausees
    this.transit            = null; // ok | constipation | diarrhee | ballonnements | flatulences | aigreurs

    // ── SÉCRÉTIONS & CORPS ────────────────────────────────────────────────
    this.glaireCervicale   = null; // aucune | visqueuses | cremeuses | blanches | filantes | aqueuse
    this.etatPeau          = [];   // correct | belle | acne | seche
    this.etatCheveux       = [];   // ok | top | pas_top | gras | perte
    this.urineSymptomes    = [];   // envie_frequente | brulure | fuites   ← NOUVEAU
    this.temperatureBasale = null; // Float (°C)
    this.poids             = null; // Float (kg)

    // ── LIFESTYLE ─────────────────────────────────────────────────────────
    this.vieSociale        = []; // sociable | introversion | solidaire | conflictuelle
    this.loisirs           = []; // vacances | voyage | rencard
    this.fete              = []; // alcool | cigarettes | grosse_soiree | gueule_de_bois
    this.exercice          = null; // course | natation | yoga | velo | marche | musculation | aucun
    this.meditation        = null; // Int (minutes) ou null

    // ── SEXUALITÉ ─────────────────────────────────────────────────────────
    this.rapports               = null; // avec_protection | sans_protection | retrait | pas_sexe
    this.libidoPratiques        = [];   // oral | touche_sensuel | want_cute_kiss | masturbation | sexting | fantasmes | libido_elevee | libido_basse
    this.orgasme                = null; // boolean (raccourci rétrocompat)
    // Sexualité enrichie couple
    this.libidoScale            = null; // 1 | 2 | 3 | 4 | 5 (toi)
    this.libidoPartenaireScale  = null; // 1 | 2 | 3 | 4 | 5
    this.orgasmes               = {
      toi:        { count: null, types: [] }, // clitoridien | vaginal | mixte | multiple | anal
      partenaire: { count: null, types: [] },
    };
    this.satisfactionSexuelle   = null; // 1-10 (toi)
    this.satisfactionPartenaire = null; // 1-10
    this.sextoys                = [];   // vibromasseur | gode | plug | anneau | sextoy_couple
    this.lubrifiant             = false;
    this.positionsUtilisees     = [];   // missionnaire | levrette | cowgirl | reverse_cowgirl | cuillere | lotus | 69 | debout | doggy | amazon | spooning | mur | table | autre + perso[]
    this.positionsPersonnalisees = [];  // String[] — positions ajoutées par l'utilisateur
    this.masturElle             = [];   // humping | douche | doigts_clito | doigts_interne | vibromasseur | dildo | suction | wand | plug | squirting | edging | regarder_partner | mutuelle
    this.masturLui              = [];   // main | fleshlight | prostate | edging | ruined | regarder_partner | mutuelle
    this.kinksDate              = [];   // kink ids pratiqués ce jour
    this.aftercare              = false;
    this.aftercareNote          = null; // String
    this.notePrivee             = null; // String — chiffrée via crypto-notes.js si PIN actif

    // ── FACTEURS COUPLE ───────────────────────────────────────────────────
    this.stressCouple = null; // aucun | tension | dispute | reconciliation | bonne_ambiance

    // ── MÉDICAL & CONTRACEPTION ───────────────────────────────────────────
    // Enum strict pour contraceptifs actifs
    this.contraceptionActifs = []; // pilule | sterilet | anneau | patch | implant | preservatif | diaphragme
    this.testOvulation       = null; // negatif | positif
    this.traitements         = [];   // String[] (noms libres)
    this.fievre              = null; // Float (°C)
    this.symptomsAutres      = [];   // String[]

    // ── MODE GROSSESSE ────────────────────────────────────────────────────
    this.enceinte = false;
    this.grossesse = {
      trimestre:            null,
      symptomsGrossesse:    [], // nausees | vomissements | fatigue | seins | vergetures | oedemes | reflux | contractions_braxton | nidification | connexion | nez_bouche | gout_odorat | orgasmes_intenses | eclat
      superPouvoirs:        [], // energie | intuition | creativite | cheveux_brillants | peau_rayonnante
      mouvementsFrequence:  null, // aucun | rares | normaux | frequents
      douleursBasDos:       false,
    };

    // ── PÉRIMÉNOPAUSE ─────────────────────────────────────────────────────
    this.perimenopauses = {
      bouffeesChaleur:    null, // pas_aujourd_hui | legeres | moderees | intenses
      secheresseVaginale: false,
    };

    // ── NOTE & TAGS ───────────────────────────────────────────────────────
    this.noteDuJour = null; // String (max 3000 chars)
    this.tags       = [];   // String[] tags personnalisés créés par l'utilisateur
  }

  // ─── Sérialisation (retire les valeurs vides pour compacité) ─────────────

  _serialize() {
    const clean = {};
    const omit  = new Set(['date', 'userId']);

    for (const [k, v] of Object.entries(this)) {
      if (omit.has(k)) continue;
      if (v === null || v === false || v === '')             continue;
      if (Array.isArray(v) && v.length === 0)               continue;
      if (typeof v === 'object' && !Array.isArray(v)) {
        const nested = Object.fromEntries(
          Object.entries(v).filter(([, nv]) =>
            nv !== null && nv !== false && nv !== '' &&
            !(Array.isArray(nv) && !nv.length)
          )
        );
        if (Object.keys(nested).length) clean[k] = nested;
      } else {
        clean[k] = v;
      }
    }
    return clean;
  }

  /** Retourne un objet compatible avec log_entries pour upsert Supabase */
  toDBEntry() {
    return {
      log_date:    this.date,
      category_id: 'journal',
      value:       this._serialize(),
      shared:      false,
    };
  }

  /** Reconstruit un DailyLog depuis une ligne log_entries */
  static fromDB(row) {
    const log  = new DailyLog({ date: row?.log_date, userId: row?.user_id });
    const data = row?.value?.v ?? row?.value ?? {};
    Object.assign(log, data);
    // S'assurer que les tableaux restent des tableaux après Object.assign
    const arrays = [
      'emotions','etatCognitif','symptomesSommeil',
      'douleursPelviennes','douleursCorps','fringales',
      'etatPeau','etatCheveux','urineSymptomes',
      'vieSociale','loisirs','fete','libidoPratiques',
      'contraceptionActifs','traitements','symptomsAutres','tags',
      'sextoys','positionsUtilisees','positionsPersonnalisees','masturElle','masturLui','kinksDate',
    ];
    arrays.forEach(k => { if (!Array.isArray(log[k])) log[k] = []; });
    if (typeof log.grossesse !== 'object' || !log.grossesse) {
      log.grossesse = new DailyLog().grossesse;
    }
    if (typeof log.orgasmes !== 'object' || !log.orgasmes) {
      log.orgasmes = new DailyLog().orgasmes;
    }
    ['toi', 'partenaire'].forEach(p => {
      if (!log.orgasmes[p] || typeof log.orgasmes[p] !== 'object') {
        log.orgasmes[p] = { count: null, types: [] };
      }
      if (!Array.isArray(log.orgasmes[p].types)) log.orgasmes[p].types = [];
    });
    return log;
  }

  /** Retourne la liste des champs non-vides avec leurs labels lisibles */
  getSummaryItems() {
    const items = [];
    const add = (label, value) => items.push({ label, value });

    // Flux
    if (this.fluxMenstruel && this.fluxMenstruel !== 'aucun')
      add('Flux', FLUX_LABELS[this.fluxMenstruel] || this.fluxMenstruel);
    if (this.spotting)     add('Spotting', this.spotting);
    if (this.textureFlux)  add('Texture', this.textureFlux);
    if (this.protectionType) add('Protection', this.protectionType);

    // Émotions & Cognition (champ unifié)
    this.emotions.forEach(e     => add('Émotion', e));
    this.etatCognitif.forEach(e => add('Mental', e));

    // Énergie & Sommeil
    if (this.niveauEnergie) add('Énergie', this.niveauEnergie);
    if (this.dureeSommeil)  add('Durée sommeil', `${this.dureeSommeil}h`);
    this.symptomesSommeil.forEach(s => add('Sommeil', s));

    // Douleurs
    this.douleursPelviennes.forEach(d => add('Douleur', d));
    this.douleursCorps.forEach(d      => add('Douleur', d));

    // Digestion
    this.fringales.forEach(f => add('Fringale', f));
    if (this.transit)        add('Transit', this.transit);

    // Corps
    if (this.glaireCervicale) add('Glaire', this.glaireCervicale);
    this.etatPeau.forEach(p  => add('Peau', p));
    this.urineSymptomes.forEach(u => add('Urine', u));
    if (this.temperatureBasale) add('BBT', `${this.temperatureBasale}°C`);
    if (this.poids)             add('Poids', `${this.poids}kg`);

    // Lifestyle
    if (this.exercice && this.exercice !== 'aucun') add('Exercice', this.exercice);
    if (this.meditation) add('Méditation', `${this.meditation} min`);
    this.vieSociale.forEach(v => add('Social', v));
    this.loisirs.forEach(l    => add('Loisir', l));
    this.fete.forEach(f       => add('Fête', f));

    // Sexualité
    if (this.rapports && this.rapports !== 'pas_sexe') add('Sexualité', this.rapports);
    this.libidoPratiques.forEach(p => add('Pratique', p));
    if (this.libidoScale)           add('Libido toi', `${this.libidoScale}/5`);
    if (this.libidoPartenaireScale) add('Libido partenaire', `${this.libidoPartenaireScale}/5`);
    if (this.orgasme)               add('Orgasme', '✓');
    const oT = this.orgasmes?.toi?.count;
    const oP = this.orgasmes?.partenaire?.count;
    if (oT)  add('Orgasmes toi', String(oT));
    if (oP)  add('Orgasmes partenaire', String(oP));
    if (this.satisfactionSexuelle)   add('Satisfaction toi', `${this.satisfactionSexuelle}/10`);
    if (this.satisfactionPartenaire) add('Satisfaction partenaire', `${this.satisfactionPartenaire}/10`);
    this.sextoys.forEach(s => add('Sextoy', s));
    if (this.lubrifiant)  add('Lubrifiant', '✓');
    if (this.aftercare)   add('Aftercare', '✓');
    this.kinksDate.forEach(k => add('Kink', k));

    // Facteurs couple
    if (this.stressCouple) add('Couple', this.stressCouple);

    // Médical
    this.contraceptionActifs.forEach(c => add('Contraception', c));
    if (this.testOvulation) add('OPK', this.testOvulation);
    if (this.fievre)        add('Fièvre', `${this.fievre}°C`);

    // Grossesse
    if (this.enceinte && this.grossesse?.trimestre)
      add('Grossesse', `T${this.grossesse.trimestre}`);
    (this.grossesse?.symptomsGrossesse || []).forEach(s => add('Grossesse', s));
    (this.grossesse?.superPouvoirs    || []).forEach(s => add('Super-pouvoir', s));

    // Périménopause
    const bch = this.perimenopauses?.bouffeesChaleur;
    if (bch && bch !== 'pas_aujourd_hui') add('Périménopause', bch);
    if (this.perimenopauses?.secheresseVaginale) add('Périménopause', 'Sécheresse');

    // Note
    if (this.noteDuJour) add('Note', this.noteDuJour);
    this.tags.forEach(t => add('Tag', t));

    return items;
  }
}

const FLUX_LABELS = {
  aucun:'Aucun', legeres:'Légères', modere:'Modérées',
  abondant:'Abondantes', tres_abondant:'Très abondant',
};

// ═══════════════════════════════════════════════════════════════════════════
// 3. ALGORITHME DE PRÉDICTION — fonction propre et exhaustive
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Prend un historique de cycles (tableau Supabase) et retourne :
 *   - jourDuCycleActuel     Int
 *   - phaseDuCycle          String (Folliculaire précoce / Ovulation / Lutéale…)
 *   - dateDesProchainesRegles  String YYYY-MM-DD
 *   - avgCycleLength        Int (moyenne durée cycles)
 *   - avgPeriodDuration     Int (moyenne durée règles)
 *   - confidence            'haute' | 'moyenne' | 'faible'
 */
export function computeCyclePrediction(cyclesHistory = [], dailyLogs = [], today = localDateStr()) {
  const completed = cyclesHistory
    .filter(c => c.period_start && c.period_end)
    .map(c => {
      const start = new Date(c.period_start + 'T12:00:00');
      const end = new Date(c.period_end + 'T12:00:00');
      return {
        startStr: c.period_start,
        duration: Math.max(1, Math.min(10, Math.round((end - start) / 864e5) + 1))
      };
    })
    .sort((a, b) => b.startStr.localeCompare(a.startStr)); // Du plus récent au plus ancien

  if (completed.length < 2) return null;

  // ── Durées de cycles (inter-débuts) ───────────────────────────────────
  const cycleLengths = [];
  for (let i = 0; i < completed.length - 1; i++) {
    const curr = new Date(completed[i].startStr + 'T12:00:00');
    const prev = new Date(completed[i + 1].startStr + 'T12:00:00');
    const length = Math.round((curr - prev) / 864e5);
    if (length >= 15 && length <= 50) cycleLengths.push(length);
  }

  // ── Profil personnel : jusqu'à 24 cycles récents, cycles aberrants écartés ──
  // Fenêtre élargie (vs 12) → longueur et variabilité plus stables et personnelles,
  // et le profil s'affine à mesure que l'historique grandit.
  const windowLengths = cycleLengths.slice(0, Math.min(24, cycleLengths.length));

  let avgCycleLength = 29;
  let minCycleLength = 28;
  let maxCycleLength = 30;
  let stdDev = 0;
  let nSample = windowLengths.length;

  if (windowLengths.length > 0) {
    // Retrait des cycles aberrants : au-delà de médiane ± 8 j (maladie, oubli de saisie…),
    // pour qu'un cycle isolé de 45 j ne fausse pas le profil. On garde l'ordre (récent → ancien).
    const median = [...windowLengths].sort((a, b) => a - b)[Math.floor(windowLengths.length / 2)];
    const inliers = windowLengths.filter(l => Math.abs(l - median) <= 8);
    const base = inliers.length ? inliers : windowLengths;
    nSample = base.length;

    minCycleLength = Math.min(...base);
    maxCycleLength = Math.max(...base);

    // WMA (moyenne mobile pondérée) : poids quadratique → les cycles récents
    // dominent, pour que la prévision suive le rythme actuel plutôt que d'anciens
    // cycles plus courts/longs.
    const weights = Array.from({ length: nSample }, (_, i) => (nSample - i) ** 2);
    const sumWeights = weights.reduce((a, b) => a + b, 0);
    const weightedSum = base.reduce((sum, len, idx) => sum + (len * weights[idx]), 0);
    avgCycleLength = Math.round(weightedSum / sumWeights);

    // Écart-type (variabilité) sur les cycles retenus.
    const mean = base.reduce((a, b) => a + b, 0) / nSample;
    const variance = base.reduce((s, l) => s + (l - mean) ** 2, 0) / nSample;
    stdDev = Math.round(Math.sqrt(variance) * 10) / 10;
  }

  // ── Durées de règles ─────────────────────────────────────────────────
  const periodDurations = completed.slice(0, 6).map(c => c.duration);
  const avgPeriodDuration = periodDurations.length
    ? Math.round(periodDurations.reduce((a, b) => a + b, 0) / periodDurations.length)
    : 5;

  // ── Cycle actuel ──────────────────────────────────────────────────────
  // Sans cycle ouvert, on reste ancré sur le DERNIER début de règles : c'est encore
  // le cycle courant tant que les règles suivantes ne sont pas arrivées. Les prochaines
  // règles = ce début + longueur (pas un cycle plus loin), et un dépassement s'affiche
  // en « retard ». Si le dernier cycle est très ancien (saisie oubliée sur plusieurs
  // cycles), on avance par cycles entiers jusqu'au cycle courant.
  const openCycle = cyclesHistory.find(c => c.period_start && !c.period_end);
  let cycleStart = openCycle?.period_start ?? completed[0]?.startStr ?? null;
  if (!openCycle && cycleStart && avgCycleLength > 0) {
    const retardMax = avgCycleLength + Math.max(7, Math.round(avgCycleLength / 2));
    while (diffDays(today, cycleStart) > retardMax) {
      cycleStart = addDays(cycleStart, avgCycleLength);
    }
  }

  const jourDuCycleActuel = cycleStart
    ? Math.max(1, diffDays(today, cycleStart) + 1)
    : null;

  // ── Estimation de la phase lutéale individuelle ────────────────────────
  let personalLutealPhase = 14;

  // ── Détection de l'ovulation (Double-contrôle Sympto-thermique) ───────
  // Par défaut (calendaire) : phase lutéale ~constante → ovulation = règles suivantes − 14 j.
  // Les règles suivantes tombent au jour de cycle (avgCycleLength + 1), car J1 = 1er jour des règles ;
  // un cycle plus long (retard) repousse donc l'ovulation d'autant.
  let ovulationDay = (avgCycleLength + 1) - personalLutealPhase;
  let isOvulationConfirmed = false;
  let detectionMethod = 'Calendaire (par défaut)';

  // Normalisation des logs de cycle
  const logsList = Array.isArray(dailyLogs) ? dailyLogs : [];

  // A. Décalage thermique (Règle 3 sur 6)
  if (cycleStart) {
    const temperatures = logsList
      .filter(log => log.log_date && log.value?.temperatureBasale != null)
      .map(log => ({
        day: diffDays(log.log_date, cycleStart) + 1,
        temp: parseFloat(log.value.temperatureBasale)
      }))
      .filter(t => t.day >= 1 && t.day <= 35)
      .sort((a, b) => a.day - b.day);

    if (temperatures.length >= 9) {
      for (let i = 6; i < temperatures.length - 2; i++) {
        const preceding6 = temperatures.slice(i - 6, i).map(t => t.temp);
        const following3 = temperatures.slice(i, i + 3).map(t => t.temp);
        const maxPreceding = Math.max(...preceding6);
        const minFollowing = Math.min(...following3);

        if (minFollowing > maxPreceding && (following3[2] - maxPreceding) >= 0.2) {
          const thermalShiftDay = temperatures[i].day;
          ovulationDay = thermalShiftDay - 1;
          isOvulationConfirmed = true;
          detectionMethod = 'Thermique stricte (Sensiplan 3/6)';
          break;
        }
      }
    }
  }

  // B. Recalibrage par signaux directs — priorité : Test LH > Glaire fertile.
  //    La température (section A), si détectée, a déjà fixé ovulationDay + confirmé.
  if (cycleStart) {
    const positiveLHLog = logsList.find(log => log.log_date && log.value?.testOvulation === 'positif');

    // Pic de glaire fertile = DERNIER jour de glaire filante/aqueuse ≈ jour d'ovulation (méthode Billings).
    const fertileMucusDays = logsList
      .filter(log => log.log_date && ['filantes', 'aqueuse'].includes(log.value?.glaireCervicale))
      .map(log => diffDays(log.log_date, cycleStart) + 1)
      .filter(d => d >= 1 && d <= 35)
      .sort((a, b) => a - b);
    const peakMucusDay = fertileMucusDays.length ? fertileMucusDays[fertileMucusDays.length - 1] : null;
    // Garde anti-bruit : on ne retient la glaire que dans une zone d'ovulation plausible,
    // pour qu'une saisie isolée en début de cycle ne recolle pas la fenêtre juste après les règles.
    const mucusPlausible = peakMucusDay != null
      && peakMucusDay >= 8 && peakMucusDay <= avgCycleLength - 8;

    if (positiveLHLog) {
      const lhDay = diffDays(positiveLHLog.log_date, cycleStart) + 1;
      ovulationDay = lhDay + 1; // ovulation ~24-36 h après le pic de LH
      detectionMethod = isOvulationConfirmed ? 'Double contrôle (Température + LH)' : 'Test LH';
      isOvulationConfirmed = true;
    } else if (mucusPlausible) {
      if (isOvulationConfirmed) {
        // Température déjà confirmée → la glaire sert de recoupement.
        detectionMethod = 'Double contrôle (Température + Glaire)';
      } else {
        // Glaire seule : signal fertile autonome, sans température ni test LH.
        ovulationDay = peakMucusDay;
        detectionMethod = 'Glaire cervicale (pic fertile)';
        isOvulationConfirmed = true;
      }
    }
  }

  // ── Fenêtre fertile clinique standard (6 jours fertiles + 1 jour après pour sécurité = 7 jours) ──
  const fertileStartDay = Math.max(1, ovulationDay - 5);
  const fertileEndDay = ovulationDay + 1;

  const fertileStart = cycleStart ? addDays(cycleStart, fertileStartDay - 1) : null;
  const fertileEnd = cycleStart ? addDays(cycleStart, fertileEndDay - 1) : null;
  const ovulationDate = cycleStart ? addDays(cycleStart, ovulationDay - 1) : null;

  // ── Définition dynamique de la phase et gestion des anomalies (Retard) ──
  let phaseDuCycle = 'Lutéale tardive';
  if (jourDuCycleActuel) {
    if (jourDuCycleActuel <= avgPeriodDuration) {
      phaseDuCycle = 'Menstruelle';
    } else if (jourDuCycleActuel >= avgCycleLength + 1) {
      phaseDuCycle = `Retard de règles (J+${jourDuCycleActuel - avgCycleLength})`;
    } else if (jourDuCycleActuel < fertileStartDay) {
      phaseDuCycle = 'Folliculaire précoce';
    } else if (jourDuCycleActuel >= fertileStartDay && jourDuCycleActuel < ovulationDay - 1) {
      phaseDuCycle = 'Folliculaire tardive';
    } else if (jourDuCycleActuel >= ovulationDay - 1 && jourDuCycleActuel <= ovulationDay + 1) {
      phaseDuCycle = 'Ovulation';
    } else if (jourDuCycleActuel > ovulationDay + 1 && jourDuCycleActuel <= avgCycleLength - 7) {
      phaseDuCycle = 'Lutéale précoce';
    }
  } else {
    phaseDuCycle = null;
  }

  // ── Prochaines règles ─────────────────────────────────────────────────
  const dateDesProchainesRegles = cycleStart
    ? addDays(cycleStart, avgCycleLength)
    : null;

  const confidence = nSample >= 4 ? 'haute'
                   : nSample >= 2 ? 'moyenne'
                   : 'faible';

  // ── Modélisation Hormonale Théorique ──────────────────────────────────
  const hormones = jourDuCycleActuel ? calculateHormones(jourDuCycleActuel, avgCycleLength, ovulationDay) : null;
  const predictabilityScore = Math.max(0, Math.min(100, Math.round(100 - (stdDev / avgCycleLength) * 300)));

  return {
    jourDuCycleActuel,
    phaseDuCycle,
    dateDesProchainesRegles,
    avgCycleLength,
    avgPeriodDuration,
    variabilite: stdDev, // rétrocompatibilité
    ovulationDate,
    fertileStart,
    fertileEnd,
    confidence,
    cyclesAnalyzed: completed.length,
    hormones,
    ovulationConfirmed: isOvulationConfirmed,
    detectionMethod,
    predictabilityScore,
    fertileStartDay,
    fertileEndDay,
    ovulationDay
  };
}

/** Modélisation mathématique des courbes d'hormones (niveaux en %) */
function calculateHormones(day, cycleLength, ovulationDay) {
  const d = parseFloat(day);
  const l = parseFloat(cycleLength);
  const ov = parseFloat(ovulationDay);

  // Œstrogènes : pic à J-1 avant l'ovulation, et deuxième pic au milieu de la phase lutéale
  let estrogen = 10;
  if (d <= ov) {
    estrogen = 10 + 80 * Math.exp(-Math.pow(d - (ov - 1), 2) / 12);
  } else {
    const lutealPeak = ov + 7;
    const estrogenLuteal = 45 * Math.exp(-Math.pow(d - lutealPeak, 2) / 16);
    const mensesDrop = 10 + 15 / (1 + Math.exp((d - (l - 2)) / 1));
    estrogen = Math.max(10, estrogenLuteal + mensesDrop);
  }

  // Progestérone : très basse en phase folliculaire, monte après l'ovulation, pic à J+7 et chute brutale
  let progesterone = 2;
  if (d <= ov) {
    progesterone = 2 + 3 * (d / ov);
  } else {
    const lutealPeak = ov + 7;
    progesterone = 5 + 85 * Math.exp(-Math.pow(d - lutealPeak, 2) / 14);
    if (d > l - 3) {
      progesterone = 5 + (progesterone - 5) * Math.max(0, (l - d) / 3);
    }
  }

  // LH : pic très court et intense 24-36h avant l'ovulation
  const lh = 5 + 95 * Math.exp(-Math.pow(d - (ov - 1), 2) / 1.5);

  // FSH : petit pic de recrutement au départ, pic à l'ovulation
  const fshStart = 18 * Math.exp(-Math.pow(d - 2, 2) / 4);
  const fshOv = 25 * Math.exp(-Math.pow(d - (ov - 1), 2) / 2);
  const fsh = 5 + fshStart + fshOv;

  return {
    estrogen: Math.round(estrogen),
    progesterone: Math.round(progesterone),
    lh: Math.round(lh),
    fsh: Math.round(fsh)
  };
}

// ── Les fonctions suivantes restent exportées pour compatibilité ───────────
export function predictNextPeriodAdvanced(cyclesHistory = [], dailyLogs = []) {
  const r = computeCyclePrediction(cyclesHistory, dailyLogs);
  if (!r?.dateDesProchainesRegles) return null;
  return {
    nextPeriodDate: r.dateDesProchainesRegles,
    avgCycleLength: r.avgCycleLength,
    stdDev: r.variabilite,
    regular: r.confidence === 'haute',
    cyclesAnalyzed: r.cyclesAnalyzed,
    ovulationDate: r.ovulationDate,
    fertileStart:  r.fertileStart,
    fertileEnd:    r.fertileEnd,
    ovulationDay:  r.ovulationDay,
    hormones:      r.hormones,
    ovulationConfirmed: r.ovulationConfirmed,
    detectionMethod: r.detectionMethod,
    predictabilityScore: r.predictabilityScore
  };
}

export function getFertilityWindow(nextPeriodDate, cycleLength = 28) {
  const np = new Date(nextPeriodDate + 'T12:00:00');
  const ov = new Date(np.getTime() - 14 * 864e5);
  return {
    ovulationDate: localDateStr(ov),
    fertileStart:  localDateStr(new Date(ov.getTime() - 5 * 864e5)),
    fertileEnd:    localDateStr(new Date(ov.getTime() + 864e5)),
    ovulationDay:  cycleLength - 14,
  };
}
