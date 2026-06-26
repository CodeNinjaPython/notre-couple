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
    this.positionsUtilisees     = [];   // ids depuis POSITIONS (intimacy-library.js)
    this.kinksDate              = [];   // kink ids pratiqués ce jour
    this.aftercare              = false;
    this.aftercareNote          = null; // String

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
      'sextoys','positionsUtilisees','kinksDate',
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
export function computeCyclePrediction(cyclesHistory = []) {
  const completed = cyclesHistory.filter(c => c.period_start && c.period_end);
  const sample    = completed.slice(0, 6);
  const today     = localDateStr();

  // ── Durées de cycles (inter-débuts) ───────────────────────────────────
  const cycleLengths = [];
  for (let i = 0; i < sample.length - 1; i++) {
    const days = diffDays(sample[i].period_start, sample[i + 1].period_start);
    if (days >= 15 && days <= 60) cycleLengths.push(days);
  }
  const avgCycleLength = cycleLengths.length
    ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length)
    : 28;

  // ── Durées de règles (fin - début + 1) ───────────────────────────────
  const periodDurations = sample.map(c =>
    Math.max(1, Math.min(10, diffDays(c.period_end, c.period_start) + 1))
  );
  const avgPeriodDuration = periodDurations.length
    ? Math.round(periodDurations.reduce((a, b) => a + b, 0) / periodDurations.length)
    : 5;

  // ── Cycle actuel ──────────────────────────────────────────────────────
  const openCycle = cyclesHistory.find(c => c.period_start && !c.period_end);
  const cycleStart = openCycle?.period_start
    ?? (sample[0] ? addDays(sample[0].period_start, avgCycleLength) : null);

  const jourDuCycleActuel = cycleStart
    ? Math.max(1, diffDays(today, cycleStart) + 1)
    : null;

  const phaseDuCycle = jourDuCycleActuel
    ? Cycle.phaseName(jourDuCycleActuel, avgCycleLength, avgPeriodDuration)
    : null;

  // ── Prochaines règles ─────────────────────────────────────────────────
  const dateDesProchainesRegles = cycleStart
    ? addDays(cycleStart, avgCycleLength)
    : null;

  // ── Fenêtre fertile ───────────────────────────────────────────────────
  let ovulationDate = null, fertileStart = null, fertileEnd = null;
  if (dateDesProchainesRegles) {
    const ov = new Date(dateDesProchainesRegles + 'T12:00:00');
    ov.setDate(ov.getDate() - 14);
    ovulationDate = localDateStr(ov);
    fertileStart  = localDateStr(new Date(ov.getTime() - 5 * 864e5));
    fertileEnd    = localDateStr(new Date(ov.getTime() + 864e5));
  }

  // Variabilité (écart-type des durées) ←── NOUVEAU
  let variabilite = 0;
  if (cycleLengths.length > 1) {
    const mean2 = cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length;
    const v2    = cycleLengths.reduce((s, l) => s + (l - mean2) ** 2, 0) / cycleLengths.length;
    variabilite = Math.round(Math.sqrt(v2) * 10) / 10;
  }

  const confidence = cycleLengths.length >= 4 ? 'haute'
                   : cycleLengths.length >= 2 ? 'moyenne'
                   : 'faible';

  return {
    jourDuCycleActuel,
    phaseDuCycle,
    dateDesProchainesRegles,
    avgCycleLength,
    avgPeriodDuration,
    variabilite,        // ← écart-type des durées de cycles (jours)
    ovulationDate,
    fertileStart,
    fertileEnd,
    confidence,
    cyclesAnalyzed: sample.length,
  };
}

// ── Les fonctions suivantes restent exportées pour compatibilité ───────────
export function predictNextPeriodAdvanced(cyclesHistory = []) {
  const r = computeCyclePrediction(cyclesHistory);
  if (!r?.dateDesProchainesRegles) return null;
  return {
    nextPeriodDate: r.dateDesProchainesRegles,
    avgCycleLength: r.avgCycleLength,
    stdDev: 0,
    regular: r.confidence === 'haute',
    cyclesAnalyzed: r.cyclesAnalyzed,
    ovulationDate: r.ovulationDate,
    fertileStart:  r.fertileStart,
    fertileEnd:    r.fertileEnd,
    ovulationDay:  r.avgCycleLength - 14,
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
