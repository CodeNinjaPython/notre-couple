/**
 * cycle-model.js — Modèle de données Cycle + DailyLog + algorithmes de prédiction.
 * S'appuie sur les tables existantes : cycles (period_start/end) + log_entries.
 * Aucun doublon avec cycles.js — on étend sans modifier l'existant.
 */
import { localDateStr, diffDays, addDays } from './date-utils.js';

// ─── 1. Classe Cycle ────────────────────────────────────────────────────────

export class Cycle {
  /**
   * @param {Object} row  Ligne Supabase : { id, period_start, period_end, ... }
   * @param {number} dureeCycle   Durée du cycle en jours (défaut 30)
   * @param {number} dureeRegles  Durée des règles en jours (défaut 5)
   */
  constructor(row = {}, dureeCycle = 30, dureeRegles = 5) {
    this.id          = row.id          || null;
    this.dateDebut   = row.period_start || null;
    this.dateFin     = row.period_end   || null;
    this.dureeCycle  = dureeCycle;
    this.dureeRegles = dureeRegles;
  }

  /** Date de fin des règles prévue (si dateFin non connue → dateDebut + dureeRegles - 1) */
  get dateFinPrevue() {
    if (this.dateFin) return this.dateFin;
    if (!this.dateDebut) return null;
    return addDays(this.dateDebut, this.dureeRegles - 1);
  }

  /** Date de fin du cycle (prochaines règles prévues) */
  get dateFinCycle() {
    if (!this.dateDebut) return null;
    return addDays(this.dateDebut, this.dureeCycle - 1);
  }

  /** Jour actuel dans le cycle (1-indexé) */
  getDayInCycle(today = localDateStr()) {
    if (!this.dateDebut) return null;
    const d = diffDays(today, this.dateDebut) + 1;
    return Math.max(1, d);
  }

  /** Fenêtre fertile : ovulation estimée = dureeCycle - 14 jours avant la fin */
  getFertileWindow() {
    const ovDay      = this.dureeCycle - 14; // jour du cycle
    return {
      start:    Math.max(1, ovDay - 5),
      end:      Math.min(this.dureeCycle, ovDay + 1),
      ovulation: ovDay,
    };
  }

  /** Nom de la phase pour un jour donné du cycle */
  static phaseName(cycleDay, dureeCycle = 30, dureeRegles = 5) {
    if (cycleDay <= dureeRegles)         return 'Menstruelle';
    if (cycleDay <= 9)                    return 'Folliculaire précoce';
    if (cycleDay <= dureeCycle - 15)      return 'Folliculaire tardive';
    if (cycleDay <= dureeCycle - 13)      return 'Ovulation';
    if (cycleDay <= dureeCycle - 7)       return 'Lutéale précoce';
    if (cycleDay <= dureeCycle)           return 'Lutéale tardive';
    return 'Lutéale';
  }

  /** Phase actuelle */
  phaseActuelle(today = localDateStr()) {
    const day = this.getDayInCycle(today);
    if (!day) return null;
    return Cycle.phaseName(day, this.dureeCycle, this.dureeRegles);
  }
}

// ─── 2. Classe DailyLog ────────────────────────────────────────────────────

/**
 * Représente l'ensemble des données loguées pour un jour donné.
 * Stocké dans log_entries (une ligne par category_id).
 */
export class DailyLog {
  constructor({ date = localDateStr(), userId = null } = {}) {
    this.date   = date;
    this.userId = userId;

    // Flux menstruel
    this.regles   = 'aucun';   // aucun | leger | modere | abondant
    this.spotting = null;       // rouge | marron | null

    // Émotions (liste)
    this.emotions = [];         // ex: ['triste','irritabilite','sautes_humeur']

    // Douleurs (liste)
    this.douleurs = [];         // ex: ['crampes','maux_tete','seins_sensibles']

    // Sexualité
    this.sexualite = 'aucun'; // aucun | avec_protection | sans_protection

    // Mesures
    this.mesures = {
      temperatureBasale : null,  // float °C
      poids             : null,  // float kg
    };

    // Contraception
    this.contraception = {
      pilulePrise   : false,
      testOvulation : null,  // null | negatif | positif
    };
  }

  /** Convertit en tableau de log_entries pour Supabase upsert */
  toLogEntries() {
    const entries = [];
    const push = (cat, val) => entries.push({
      log_date: this.date, category_id: cat, value: { v: val }, shared: true,
    });

    if (this.regles   !== 'aucun') push('flow',     this.regles);
    if (this.spotting)             push('spotting',  this.spotting);
    if (this.emotions.length)      push('emotions',  this.emotions);
    if (this.douleurs.length)      push('douleurs',  this.douleurs);
    if (this.sexualite !== 'aucun') push('sexualite', this.sexualite);
    if (this.mesures.temperatureBasale) push('bbt',    this.mesures.temperatureBasale);
    if (this.mesures.poids)             push('weight', this.mesures.poids);
    if (this.contraception.pilulePrise) push('pill',   true);
    if (this.contraception.testOvulation) push('opk',  this.contraception.testOvulation);

    return entries;
  }

  /** Construit un DailyLog depuis un tableau de log_entries */
  static fromLogEntries(entries = [], date = localDateStr(), userId = null) {
    const log = new DailyLog({ date, userId });
    entries.forEach(e => {
      const v = e.value?.v ?? e.value;
      switch (e.category_id) {
        case 'flow':      log.regles      = v; break;
        case 'spotting':  log.spotting    = v; break;
        case 'emotions':  log.emotions    = Array.isArray(v) ? v : [v]; break;
        case 'douleurs':  log.douleurs    = Array.isArray(v) ? v : [v]; break;
        case 'sexualite': log.sexualite   = v; break;
        case 'bbt':       log.mesures.temperatureBasale = parseFloat(v); break;
        case 'weight':    log.mesures.poids = parseFloat(v); break;
        case 'pill':      log.contraception.pilulePrise = !!v; break;
        case 'opk':       log.contraception.testOvulation = v; break;
      }
    });
    return log;
  }

  /** Résumé lisible (pour debug ou affichage condensé) */
  toString() {
    const parts = [];
    if (this.regles !== 'aucun') parts.push(`Règles: ${this.regles}`);
    if (this.emotions.length)   parts.push(`Émotions: ${this.emotions.join(', ')}`);
    if (this.douleurs.length)   parts.push(`Douleurs: ${this.douleurs.join(', ')}`);
    if (this.mesures.temperatureBasale) parts.push(`BBT: ${this.mesures.temperatureBasale}°C`);
    return parts.join(' · ') || 'Aucune saisie';
  }
}

// ─── 3. Prédiction avancée (moyenne 6 derniers cycles) ─────────────────────

/**
 * Calcule la date des prochaines règles à partir des 6 derniers cycles complétés.
 * Plus précis que predictNextPeriod() existant car :
 *   - Filtre les anomalies (cycles < 15j ou > 60j)
 *   - Calcule l'écart-type pour mesurer la régularité
 */
export function predictNextPeriodAdvanced(cyclesHistory = []) {
  const completed = cyclesHistory.filter(c => c.period_start && c.period_end);
  const sample    = completed.slice(0, 6);
  if (sample.length < 2) return null;

  const lengths = [];
  for (let i = 0; i < sample.length - 1; i++) {
    const curr = new Date(sample[i].period_start     + 'T12:00:00');
    const prev = new Date(sample[i + 1].period_start + 'T12:00:00');
    const days = Math.round((curr - prev) / 864e5);
    if (days >= 15 && days <= 60) lengths.push(days);
  }
  if (!lengths.length) return null;

  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const avgRounded = Math.round(avg);

  // Écart-type (régularité)
  const variance = lengths.reduce((s, l) => s + (l - avg) ** 2, 0) / lengths.length;
  const stdDev   = Math.round(Math.sqrt(variance));

  const lastStart  = new Date(sample[0].period_start + 'T12:00:00');
  const nextPeriod = new Date(lastStart.getTime() + avgRounded * 864e5);

  const fertility = getFertilityWindow(localDateStr(nextPeriod), avgRounded);

  return {
    nextPeriodDate:  localDateStr(nextPeriod),
    avgCycleLength:  avgRounded,
    stdDev,
    regular:         stdDev <= 3,         // cycle "régulier" si ≤ 3j d'écart-type
    cyclesAnalyzed:  lengths.length + 1,
    ...fertility,
  };
}

/**
 * Calcule la fenêtre de fertilité et le jour d'ovulation estimé
 * à partir de la date des prochaines règles et de la durée moyenne du cycle.
 *
 * Méthode : ovulation ≈ 14j avant les règles suivantes.
 * Fenêtre fertile : J-5 à J+1 autour de l'ovulation.
 */
export function getFertilityWindow(nextPeriodDate, cycleLength = 28) {
  const nextPeriod   = new Date(nextPeriodDate + 'T12:00:00');
  const ovulation    = new Date(nextPeriod.getTime() - 14 * 864e5);
  const fertileStart = new Date(ovulation.getTime()  -  5 * 864e5);
  const fertileEnd   = new Date(ovulation.getTime()  +  1 * 864e5);

  return {
    ovulationDate:  localDateStr(ovulation),
    fertileStart:   localDateStr(fertileStart),
    fertileEnd:     localDateStr(fertileEnd),
    ovulationDay:   cycleLength - 14,   // jour du cycle (1-indexé)
  };
}

// ─── 4. Enums (référence) ──────────────────────────────────────────────────

export const REGLES_ENUM = {
  aucun:    { label: 'Aucun',    icon: '○' },
  leger:    { label: 'Léger',    icon: '🩸' },
  modere:   { label: 'Modéré',   icon: '🩸🩸' },
  abondant: { label: 'Abondant', icon: '🩸🩸🩸' },
};

export const SPOTTING_ENUM = {
  rouge:  { label: 'Rouge',  icon: '🔴' },
  marron: { label: 'Marron', icon: '🟤' },
};

export const SEXUALITE_ENUM = {
  aucun:            { label: 'Aucun',             icon: '—' },
  avec_protection:  { label: 'Avec protection',   icon: '🛡️' },
  sans_protection:  { label: 'Sans protection',   icon: '💑' },
};

export const OPK_ENUM = {
  negatif: { label: 'Négatif', icon: '➖' },
  positif: { label: 'Positif', icon: '➕' },
};

export const EMOTIONS_LIST = [
  { id:'heureuse',         label:'Heureuse',          icon:'😊' },
  { id:'calme',            label:'Calme',              icon:'😌' },
  { id:'energique',        label:'Énergique',          icon:'⚡' },
  { id:'sensible',         label:'Sensible',           icon:'🥹' },
  { id:'triste',           label:'Triste',             icon:'😢' },
  { id:'irritable',        label:'Irritable',          icon:'😤' },
  { id:'en_colere',        label:'En colère',          icon:'😠' },
  { id:'anxieuse',         label:'Anxieuse',           icon:'😰' },
  { id:'fatiguee',         label:'Fatiguée',           icon:'😴' },
  { id:'sautes_humeur',    label:"Sautes d'humeur",    icon:'🎭' },
  { id:'pas_en_controle',  label:'Pas en contrôle',    icon:'😵' },
  { id:'confiante',        label:'Confiante',          icon:'💪' },
];

export const DOULEURS_LIST = [
  { id:'crampes',          label:'Crampes',            icon:'🔥' },
  { id:'maux_tete',        label:'Maux de tête',       icon:'🤕' },
  { id:'migraine',         label:'Migraine',           icon:'💥' },
  { id:'seins_sensibles',  label:'Seins sensibles',    icon:'🌡️' },
  { id:'lombaires',        label:'Douleurs lombaires', icon:'🦴' },
  { id:'ballonnements',    label:'Ballonnements',      icon:'💨' },
  { id:'nausees',          label:'Nausées',            icon:'🤢' },
  { id:'jambes_lourdes',   label:'Jambes lourdes',     icon:'🦵' },
];
