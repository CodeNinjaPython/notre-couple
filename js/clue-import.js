/**
 * clue-import.js — Import d'un export Clue (measurements.json) vers le modèle de l'app.
 *
 * Deux sorties :
 *   1. cycles      — extraits des jours de règles (type 'period')
 *   2. log_entries — un DailyLog par jour (category_id='journal'), mappé depuis
 *                    le vocabulaire Clue.
 *
 * Les fonctions de parsing sont PURES (aucune dépendance Supabase) → testables
 * hors-ligne. importClueData() importe le client Supabase dynamiquement.
 */
import { DailyLog } from './cycle-model.js';
import { diffDays } from './date-utils.js';

// ═══════════════════════════════════════════════════════════════════════════
// 1. TABLES DE CORRESPONDANCE Clue → DailyLog
// ═══════════════════════════════════════════════════════════════════════════

const FLUX        = { light: 'legeres', medium: 'modere', heavy: 'abondant' };
const COLLECTION  = { period_underwear: 'culotte_regles', pad: 'serviette', panty_liner: 'protegeSlip', tampon: 'tampon', cup: 'coupe' };
const SPOTTING    = { brown: 'marron', red: 'rouge', light: 'taches' };

// pain → pelvienne | corps
const PAIN_PELV   = { period_cramps: 'crampes', ovulation_pain: 'ovulation' };
const PAIN_CORPS  = {
  lower_back: 'lombaires', headache: 'tete', breast_tenderness: 'seins_sensibles',
  leg: 'jambes_lourdes', migraine: 'migraine', joint: 'articulaires',
  migraine_with_aura: 'migraine_aura',
};

const FEELINGS = {
  irritable: 'irritable', sad: 'triste', mood_swings: 'sautes_humeur',
  not_in_control: 'pas_controle', sensitive: 'sensible', happy: 'heureuse',
  excited: 'heureuse', anxious: 'anxieuse', angry: 'en_colere', fine: 'calme',
  grateful: 'reconnaissante', confident: 'confiante', insecure: 'anxieuse',
  indifferent: 'rien',
};
const MIND = {
  brain_fog: 'brouillard', stressed: 'stressee', productive: 'productive',
  unproductive: 'inefficace', distracted: 'distraite', unmotivated: 'pas_motivation',
  focused: 'concentree', motivated: 'motivee', creative: 'creative',
  // 'calm' est une humeur → ajouté aux emotions plus bas
};
const MIND_AS_EMOTION = { calm: 'calme' };

const ENERGY = { exhausted: 'epuisee', tired: 'fatiguee', ok: 'ok', energetic: 'en_forme' };
const ENERGY_RANK = { epuisee: 0, fatiguee: 1, ok: 2, en_forme: 3 };

const SLEEP_Q = {
  trouble_falling_asleep: 'dur_endormir', woke_up_tired: 'fatigue_reveil',
  restless_sleep: 'sommeil_agite', night_sweats: 'sueurs_nocturnes',
  woke_up_refreshed: 'reveil_en_forme', vivid_dreams: 'reves_intenses',
};

const CRAVING = { salty: 'sale', sweet: 'sucre', carbs: 'sucre', greasy: 'gras' };
const DIGESTION_TRANSIT = { bloated: 'ballonnements', gassy: 'flatulences', heartburn: 'aigreurs', ok: 'ok' };
const DIGESTION_FRINGALE = { nauseous: 'nausees' };
const STOOL = { ok: 'ok', diarrhea: 'diarrhee', constipation: 'constipation' };

const DISCHARGE = { creamy: 'cremeuses', egg_white: 'filantes', sticky: 'visqueuses', none: 'aucune', atypical: 'aqueuse' };
const SKIN = { acne: 'acne', dry: 'seche', oily: 'grasse' };
const HAIR = { good_hair: 'normaux', ok_hair: 'normaux', dry_scalp: 'cuir_sec', oily_scalp: 'racines_grasses', bad_hair: 'secs' };

const SOCIAL = { sociable: 'sociable', withdrawn: 'introversion', argumentative: 'conflictuelle', supportive: 'solidaire' };
const EXERCISE = { rest_day: 'aucun', strength_training: 'musculation', walking: 'marche', yoga: 'yoga', running: 'course', swimming: 'natation' };
const PARTYING = { big_night: 'grosse_soiree', alcohol: 'alcool' };
const LEISURE = { date: 'rencard', vacation: 'vacances', travel: 'voyage' };

const SEX_PRATIQUE = {
  masturbation: 'masturbation', fantasies: 'fantasmes',
  high_sex_drive: 'libido_elevee', low_sex_drive: 'libido_basse',
};
const SEX_RAPPORTS = { protected: 'avec_protection', unprotected: 'sans_protection', no_sex_today: 'pas_sexe' };
const BREASTS = { dense_or_heavy: 'seins_sensibles', swollen_breasts: 'seins_douloureux' };
const URINE = { frequent_urination: 'envie_frequente' };
const HOT_FLASH = { mild: 'legeres', moderate: 'moderees', strong: 'intenses' };

// tags Clue personnalisés (sexe) → libidoPratiques de l'app
const CUSTOM_TAGS = {
  'Touché sensuel': 'touche_sensuel', 'Sexe oral': 'oral', 'Want cute kiss': 'want_cute_kiss',
};

const pushUnique = (arr, v) => { if (v && !arr.includes(v)) arr.push(v); };

// ═══════════════════════════════════════════════════════════════════════════
// 2. EXTRACTION DES CYCLES (depuis les jours de règles)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Regroupe les jours 'period' consécutifs (écart ≤ 2 j) en cycles.
 * @returns {Array<{period_start:string, period_end:string}>}
 */
export function extractCycles(records) {
  const days = records
    .filter(r => r.type === 'period')
    .map(r => r.date)
    .filter(Boolean)
    .sort();
  if (!days.length) return [];

  const cycles = [];
  let start = days[0], prev = days[0];
  for (let i = 1; i < days.length; i++) {
    const gap = diffDays(days[i], prev);
    if (gap > 2) {                       // nouveau cycle
      cycles.push({ period_start: start, period_end: prev });
      start = days[i];
    }
    prev = days[i];
  }
  cycles.push({ period_start: start, period_end: prev });
  return cycles;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. MAPPING DES SYMPTÔMES → DailyLog par jour
// ═══════════════════════════════════════════════════════════════════════════

/** Construit une Map<date, DailyLog> depuis les enregistrements Clue. */
export function mapRecordsToDailyLogs(records, userId = null) {
  const byDate = new Map();
  const log = date => {
    if (!byDate.has(date)) byDate.set(date, new DailyLog({ date, userId }));
    return byDate.get(date);
  };
  const opts = v => Array.isArray(v) ? v : (v ? [v] : []);

  for (const r of records) {
    const d = r.date; if (!d) continue;
    const L = log(d);
    const v = r.value;

    switch (r.type) {
      case 'period': {
        const o = v?.option;
        if (FLUX[o]) L.fluxMenstruel = FLUX[o];
        break;
      }
      case 'collection_method':
        for (const it of opts(v)) if (COLLECTION[it.option]) L.protectionType = COLLECTION[it.option];
        break;
      case 'spotting':
        for (const it of opts(v)) if (SPOTTING[it.option]) L.spotting = SPOTTING[it.option];
        break;
      case 'pain':
        for (const it of opts(v)) {
          if (PAIN_PELV[it.option])  pushUnique(L.douleursPelviennes, PAIN_PELV[it.option]);
          if (PAIN_CORPS[it.option]) pushUnique(L.douleursCorps,      PAIN_CORPS[it.option]);
        }
        break;
      case 'breasts_and_chest':
        for (const it of opts(v)) if (BREASTS[it.option]) pushUnique(L.douleursCorps, BREASTS[it.option]);
        break;
      case 'feelings':
        for (const it of opts(v)) pushUnique(L.emotions, FEELINGS[it.option]);
        break;
      case 'mind':
        for (const it of opts(v)) {
          if (MIND[it.option])            pushUnique(L.etatCognitif, MIND[it.option]);
          if (MIND_AS_EMOTION[it.option]) pushUnique(L.emotions, MIND_AS_EMOTION[it.option]);
        }
        break;
      case 'energy':
        for (const it of opts(v)) {
          const n = ENERGY[it.option];
          if (n && (!L.niveauEnergie || ENERGY_RANK[n] < ENERGY_RANK[L.niveauEnergie])) L.niveauEnergie = n;
        }
        break;
      case 'sleep_quality':
        for (const it of opts(v)) pushUnique(L.symptomesSommeil, SLEEP_Q[it.option]);
        break;
      case 'sleep_duration':
        if (v?.minutes) L.dureeSommeil = Math.round(v.minutes / 60 * 10) / 10;
        break;
      case 'digestion':
        for (const it of opts(v)) {
          if (DIGESTION_TRANSIT[it.option])  L.transit = DIGESTION_TRANSIT[it.option];
          if (DIGESTION_FRINGALE[it.option]) pushUnique(L.fringales, DIGESTION_FRINGALE[it.option]);
        }
        break;
      case 'stool':
        for (const it of opts(v)) if (STOOL[it.option]) L.transit = STOOL[it.option];
        break;
      case 'craving':
        for (const it of opts(v)) pushUnique(L.fringales, CRAVING[it.option]);
        break;
      case 'discharge':
        for (const it of opts(v)) if (DISCHARGE[it.option]) L.glaireCervicale = DISCHARGE[it.option];
        break;
      case 'skin':
        for (const it of opts(v)) pushUnique(L.etatPeau, SKIN[it.option]);
        break;
      case 'hair':
        for (const it of opts(v)) pushUnique(L.etatCheveux, HAIR[it.option]);
        break;
      case 'urine':
        for (const it of opts(v)) pushUnique(L.urineSymptomes, URINE[it.option]);
        break;
      case 'social_life':
        for (const it of opts(v)) pushUnique(L.vieSociale, SOCIAL[it.option]);
        break;
      case 'exercise':
        for (const it of opts(v)) if (EXERCISE[it.option]) L.exercice = EXERCISE[it.option];
        break;
      case 'partying':
        for (const it of opts(v)) pushUnique(L.fete, PARTYING[it.option]);
        break;
      case 'leisure':
        for (const it of opts(v)) pushUnique(L.loisirs, LEISURE[it.option]);
        break;
      case 'sex_life':
        for (const it of opts(v)) {
          const o = it.option;
          if (SEX_PRATIQUE[o]) pushUnique(L.libidoPratiques, SEX_PRATIQUE[o]);
          if (SEX_RAPPORTS[o]) L.rapports = SEX_RAPPORTS[o];
          if (o === 'orgasm')        L.orgasme = true;
          if (o === 'sex_toys')      pushUnique(L.sextoys, 'vibromasseur');
          if (o === 'painful_intercourse') pushUnique(L.tags, 'rapport douloureux');
        }
        break;
      case 'tags':
        for (const it of opts(v)) {
          if (CUSTOM_TAGS[it.option]) pushUnique(L.libidoPratiques, CUSTOM_TAGS[it.option]);
          else pushUnique(L.tags, it.option);
        }
        break;
      case 'vulva_and_vagina':
        for (const it of opts(v)) pushUnique(L.tags, it.option === 'itchy' ? 'démangeaisons' : it.option);
        break;
      case 'hot_flashes':
        if (v?.option && HOT_FLASH[v.option]) L.perimenopauses.bouffeesChaleur = HOT_FLASH[v.option];
        break;
      case 'medication':
        for (const it of opts(v)) pushUnique(L.traitements, it.option);
        break;
      case 'supplements':
        for (const it of opts(v)) pushUnique(L.traitements, it.option);
        break;
      case 'ailments':
        for (const it of opts(v)) pushUnique(L.tags, it.option);
        break;
      case 'pms':
        if (v?.option === 'yes') pushUnique(L.tags, 'SPM');
        break;
      case 'weight':
        if (v?.kilograms) L.poids = v.kilograms;
        break;
      case 'tests':
        for (const it of opts(v)) pushUnique(L.tags, it.option);
        break;
      case 'appointments':
        for (const it of opts(v)) pushUnique(L.tags, it.option);
        break;
      case 'notes':
        if (v?.text) L.noteDuJour = L.noteDuJour ? `${L.noteDuJour}\n${v.text}` : v.text;
        break;
      default:
        break; // type non mappé → ignoré
    }
  }
  return byDate;
}

/**
 * Transforme un export Clue complet en { cycles, entries } prêts pour Supabase.
 * @returns {{ cycles: Array, entries: Array, stats: Object }}
 */
export function parseClueExport(records, userId = null) {
  const cycles  = extractCycles(records);
  const byDate  = mapRecordsToDailyLogs(records, userId);

  const entries = [];
  for (const [, L] of byDate) {
    const e = L.toDBEntry();          // { log_date, category_id:'journal', value, shared }
    if (e.value && Object.keys(e.value).length) entries.push(e);
  }
  entries.sort((a, b) => a.log_date.localeCompare(b.log_date));

  return {
    cycles,
    entries,
    stats: {
      totalRecords: records.length,
      cycles: cycles.length,
      daysLogged: entries.length,
      dateRange: entries.length ? [entries[0].log_date, entries[entries.length - 1].log_date] : null,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. IMPORT VERS SUPABASE (sous l'utilisateur connecté → RLS OK)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Importe les données Clue dans Supabase pour l'utilisateur connecté.
 * @param {Array}    records     — contenu parsé de measurements.json
 * @param {string}   userId      — auth.uid() de l'utilisatrice
 * @param {string}   coupleId
 * @param {Function} onProgress  — (texte) feedback UI
 */
export async function importClueData(records, userId, coupleId, onProgress = () => {}) {
  const { supabase } = await import('./supabase.js');
  const { invalidateCache } = await import('./query-cache.js');
  const { cycles, entries, stats } = parseClueExport(records, userId);

  // ── Cycles (en évitant les doublons sur period_start) ────────────────────
  onProgress(`Cycles : ${cycles.length} détectés…`);
  const { data: existing } = await supabase.from('cycles').select('period_start').eq('user_id', userId);
  const known = new Set((existing || []).map(c => c.period_start));
  // NB : la table cycles n'a pas de colonne couple_id (cycle = données perso)
  const newCycles = cycles
    .filter(c => !known.has(c.period_start))
    .map(c => ({ user_id: userId, period_start: c.period_start, period_end: c.period_end }));
  if (newCycles.length) {
    const { error } = await supabase.from('cycles').insert(newCycles);
    if (error) throw new Error(`Cycles : ${error.message}`);
  }

  // ── Entrées journal (upsert par chunks) ──────────────────────────────────
  const rows = entries.map(e => ({ ...e, user_id: userId }));
  const CHUNK = 100;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    onProgress(`Journal : ${Math.min(i + CHUNK, rows.length)}/${rows.length} jours…`);
    const { error } = await supabase
      .from('log_entries')
      .upsert(slice, { onConflict: 'user_id,log_date,category_id' });
    if (error) throw new Error(`Journal : ${error.message}`);
  }

  invalidateCache('log_entries');
  invalidateCache('cycles');
  return { ...stats, cyclesInserted: newCycles.length };
}
