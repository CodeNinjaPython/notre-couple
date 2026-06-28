/**
 * lovelust-import.js — Import d'un export LoveLust (objet { activity, partners, ... })
 * vers le journal quotidien de l'app (log_entries, category_id='journal').
 *
 * Chaque activité (rapport ou masturbation) est fusionnée dans le DailyLog du jour :
 * rapports, pratiques (oral / touché sensuel / masturbation), orgasmes (toi/partenaire),
 * note (lieu + notes + durée/ressenti). Apparaît ensuite sur le calendrier et l'onglet
 * intime via la section « Sexualité ».
 *
 * Parsing PUR (sans Supabase) → testable. importLovelustData() fusionne avec les
 * journaux existants (ne rien écraser) puis upsert par lots.
 */
import { DailyLog } from './cycle-model.js';

// Heure locale La Réunion (UTC+4) → date YYYY-MM-DD.
const localDate = (iso) => new Date(new Date(iso).getTime() + 4 * 3600e3).toISOString().slice(0, 10);
const uniq = (arr, v) => { if (v && !arr.includes(v)) arr.push(v); };

// LoveLust → vocabulaire libidoPratiques de l'app.
const PRACTICE = {
  BLOWJOB: 'oral', CUNNILINGUS: 'oral',
  FINGERING: 'touche_sensuel', HANDJOB: 'touche_sensuel',
  MASTURBATION: 'masturbation',
};
const MOOD = { HORNY: 'libido_elevee' };
const INIT_FR = { ME: 'moi', BOTH: 'nous deux', PARTNER: 'partenaire' };

// Vocabulaire LoveLust (codes anglais) → libellés français pour les tags.
// L'app est 100 % FR ; tout code inconnu retombe en minuscule brute.
const FR = {
  // positions
  MISSIONARY: 'missionnaire', COWGIRL: 'cowgirl', REVERSE_COWGIRL: 'reverse cowgirl',
  DOGGY_STYLE: 'levrette', SPOONING: 'cuillère', FACE_SITTING: 'face-sitting', STANDING: 'debout',
  // pratiques
  VAGINAL: 'vaginal', MASTURBATION: 'masturbation', CREAMPIE: 'creampie', HANDJOB: 'masturbation manuelle',
  FINGERING: 'doigtage', BLOWJOB: 'fellation', CUNNILINGUS: 'cunnilingus', ANAL: 'anal', BDSM: 'bdsm',
  ORAL: 'oral', TOY: 'jouet',
  // lieux
  BEDROOM: 'chambre', BATHROOM: 'salle de bain', BED: 'lit', COUCH: 'canapé', SHOWER: 'douche',
  CAR: 'voiture', OTHER: 'autre',
  // sentiments
  SAD: 'triste', ADVENTUROUS: 'aventureux', SURPRISED: 'surpris', FRUSTRATED: 'frustré',
  AFFECTIONATE: 'affectueux', ANXIOUS: 'anxieux', GUILTY: 'coupable', DISCONNECTED: 'déconnecté',
  EXCITED: 'excité', HAPPY: 'heureux', IRRITABLE: 'irritable', REGRETFUL: 'plein de regret',
  SATISFIED: 'satisfait', USED: 'utilisé', HORNY: 'excité',
  // protection
  CONDOM: 'préservatif', OUTERCOURSE: 'sans pénétration', WITHDRAWAL: 'retrait', PILL: 'pilule',
  IUD: 'diu', PREP: 'prep', INTERNAL_CONDOM: 'préservatif interne', VAGINAL_RING: 'anneau vaginal',
};
const frTag = (code) => FR[code] || String(code).toLowerCase();

// Lieu d'éjaculation (note de session) en français.
const EJAC_FR = {
  VAGINA: 'dans le vagin', MOUTH: 'dans la bouche', BUTTOCKS: 'sur les fesses', ANUS: "dans l'anus",
  BACK: 'sur le dos', CHEST: 'sur la poitrine', FACE: 'sur le visage', STOMACH: 'sur le ventre',
  HANDS: 'sur les mains', FEET: 'sur les pieds', NONE: "pas d'éjaculation", REFUSED: 'refusé',
};

/**
 * Construit les lignes pour les tables intimité (onglet Intime) depuis les
 * activités LoveLust : intimate_sessions + session_feedback (LUI) + session_activities (tags).
 * Réutilise l'id LoveLust comme id de session (dédup naturelle).
 */
export function buildSessions(activities, userId, coupleId) {
  const sessions = [], feedback = [], tagRows = [];
  for (const a of activities) {
    const solo = a.type === 'MASTURBATION';

    const noteParts = [];
    if (a.notes && a.notes.trim()) noteParts.push(a.notes.trim());
    if (!solo && a.partnerOrgasms > 0) noteParts.push(`Orgasmes partenaire : ${a.partnerOrgasms}`);
    if (a.initiator && INIT_FR[a.initiator]) noteParts.push(`Initié par : ${INIT_FR[a.initiator]}`);
    if (a.ejaculation && a.ejaculation.trim()) noteParts.push(`Éjaculation : ${EJAC_FR[a.ejaculation] || a.ejaculation.toLowerCase()}`);

    sessions.push({
      id: a.id, couple_id: coupleId, created_by: userId,
      session_date: localDate(a.date),
      duration_min: a.duration > 0 ? a.duration : null,
      location: (a.location && a.location.trim()) || null,
      note: noteParts.length ? noteParts.join(' · ') : null,
    });

    feedback.push({
      session_id: a.id, user_id: userId,
      orgasms: a.orgasms || 0,
      satisfaction: a.rating > 0 ? Math.max(1, Math.min(10, Math.round(a.rating * 2))) : null,
      shared: !solo,
    });

    const tags = new Set();
    for (const k of ['sexualPositions', 'practices', 'receivedPractices', 'places', 'moods', 'protectionMethods']) {
      (a[k] || []).forEach(v => v && tags.add(frTag(v)));
    }
    if (solo) tags.add('solo');
    if (a.watchedPorn) tags.add('porno');
    if (tags.size) tagRows.push({ session_id: a.id, tags: [...tags] });
  }
  return { sessions, feedback, tagRows };
}

/** Map<date, DailyLog> depuis les activités LoveLust (champs « sexualité » seulement). */
export function mapLovelustToDailyLogs(activities, userId = null) {
  const byDate = new Map();
  const get = (d) => { if (!byDate.has(d)) byDate.set(d, new DailyLog({ date: d, userId })); return byDate.get(d); };

  for (const a of activities) {
    if (!a.date) continue;
    const L = get(localDate(a.date));

    if (a.type === 'MASTURBATION') uniq(L.libidoPratiques, 'masturbation');
    if (a.type === 'SEXUAL_INTERCOURSE') {
      const prot = a.protectionMethods || [];
      L.rapports = prot.includes('CONDOM') ? 'avec_protection'
        : prot.includes('OUTERCOURSE') ? 'retrait'
        : (L.rapports || 'sans_protection');
    }

    for (const p of [...(a.practices || []), ...(a.receivedPractices || [])]) {
      if (PRACTICE[p]) uniq(L.libidoPratiques, PRACTICE[p]);
      else if (p === 'TOY') uniq(L.sextoys, 'sextoy_couple');
      else if (p !== 'VAGINAL') uniq(L.tags, frTag(p));
    }
    for (const m of (a.moods || [])) {
      if (MOOD[m]) uniq(L.libidoPratiques, MOOD[m]);
      else uniq(L.tags, frTag(m));
    }
    if (a.watchedPorn) uniq(L.libidoPratiques, 'fantasmes');

    // Orgasmes (cumul si plusieurs activités le même jour).
    const oToi = a.orgasms || 0, oPart = a.partnerOrgasms || 0;
    if (oToi || oPart) {
      L.orgasme = true;
      L.orgasmes.toi.count = (L.orgasmes.toi.count || 0) + oToi;
      L.orgasmes.partenaire.count = (L.orgasmes.partenaire.count || 0) + oPart;
    }

    // Note : lieu + notes libres + durée/ressenti, en tête du noteDuJour.
    const extra = [];
    if (a.location && a.location.trim()) extra.push(a.location.trim());
    if (a.notes && a.notes.trim()) extra.push(a.notes.trim());
    if (a.duration > 0) extra.push(`durée ${a.duration} min`);
    if (a.rating > 0) extra.push(`ressenti ${a.rating}/5`);
    if (extra.length) L.noteDuJour = L.noteDuJour ? `${extra.join(' · ')}\n${L.noteDuJour}` : extra.join(' · ');
  }
  return byDate;
}

/** Parse complet → { entries, partnerName, stats } (pour aperçu / tests). */
export function parseLovelustExport(json, userId = null) {
  const acts = json?.activity || [];
  const byDate = mapLovelustToDailyLogs(acts, userId);
  const entries = [];
  for (const [, L] of byDate) {
    const e = L.toDBEntry();
    if (e.value && Object.keys(e.value).length) entries.push(e);
  }
  entries.sort((a, b) => a.log_date.localeCompare(b.log_date));
  const partnerName = (json?.partners?.[0]?.name || '').trim() || null;
  return {
    entries, partnerName,
    stats: {
      activities: acts.length,
      daysLogged: entries.length,
      dateRange: entries.length ? [entries[0].log_date, entries[entries.length - 1].log_date] : null,
    },
  };
}

// Fusionne les champs « sexualité » de src dans target (deux DailyLog).
function mergeSexFields(target, src) {
  if (src.rapports) target.rapports = src.rapports;
  if (src.orgasme) target.orgasme = true;
  for (const k of ['libidoPratiques', 'sextoys', 'tags']) {
    for (const v of src[k]) uniq(target[k], v);
  }
  for (const p of ['toi', 'partenaire']) {
    if (src.orgasmes?.[p]?.count != null) {
      target.orgasmes[p] = target.orgasmes[p] || { count: null, types: [] };
      target.orgasmes[p].count = (target.orgasmes[p].count || 0) + src.orgasmes[p].count;
    }
  }
  if (src.noteDuJour) target.noteDuJour = target.noteDuJour ? `${src.noteDuJour}\n${target.noteDuJour}` : src.noteDuJour;
}

/**
 * Importe l'export LoveLust dans le journal de l'utilisateur connecté.
 * Fusionne avec les entrées existantes (n'écrase pas les autres champs du jour).
 */
export async function importLovelustData(json, userId, coupleId, onProgress = () => {}) {
  const { supabase } = await import('./supabase.js');
  const { invalidateCache } = await import('./query-cache.js');

  const byDate = mapLovelustToDailyLogs(json?.activity || [], userId);
  const dates = [...byDate.keys()];
  if (!dates.length) return { activities: (json?.activity || []).length, daysLogged: 0, dateRange: null };

  onProgress('Lecture des journaux existants…');
  const { data: existing } = await supabase
    .from('log_entries')
    .select('log_date,value,user_id')
    .eq('user_id', userId)
    .eq('category_id', 'journal')
    .in('log_date', dates);
  const exMap = new Map((existing || []).map(r => [r.log_date, r]));

  // Fusion → lignes à upsert.
  const rows = [];
  for (const [date, L] of byDate) {
    const prevRow = exMap.get(date);
    const target = prevRow ? DailyLog.fromDB(prevRow) : new DailyLog({ date, userId });
    if (prevRow) mergeSexFields(target, L);
    const e = (prevRow ? target : L).toDBEntry();
    rows.push({ ...e, user_id: userId });
  }
  rows.sort((a, b) => a.log_date.localeCompare(b.log_date));

  const CHUNK = 100;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    onProgress(`Journal intime : ${Math.min(i + CHUNK, rows.length)}/${rows.length} jours…`);
    const { error } = await supabase.from('log_entries').upsert(slice, { onConflict: 'user_id,log_date,category_id' });
    if (error) throw new Error(`Journal : ${error.message}`);
  }

  // Indice de nom de partenaire (l'app exige un vrai 2e compte pour lier ; on garde
  // juste le prénom pour l'affichage tant qu'aucun partenaire n'est rattaché).
  const partnerName = (json?.partners?.[0]?.name || '').trim();
  if (partnerName && !localStorage.getItem('nc-partner-name-hint')) {
    localStorage.setItem('nc-partner-name-hint', partnerName);
  }

  invalidateCache('log_entries');

  // ── Sessions intimes (onglet Intime) — best-effort, dédup par id ──────────
  let sessionsAdded = 0;
  try {
    const acts = json.activity || [];
    const ids = acts.map(a => a.id).filter(Boolean);
    const { data: existS } = await supabase.from('intimate_sessions').select('id').in('id', ids);
    const known = new Set((existS || []).map(r => r.id));
    const fresh = acts.filter(a => a.id && a.date && !known.has(a.id));
    if (fresh.length) {
      onProgress(`Sessions intimes : ${fresh.length}…`);
      const { sessions, feedback, tagRows } = buildSessions(fresh, userId, coupleId);
      let { error } = await supabase.from('intimate_sessions').insert(sessions);
      if (error) throw error;
      if (feedback.length) { ({ error } = await supabase.from('session_feedback').insert(feedback)); if (error) throw error; }
      if (tagRows.length)  { ({ error } = await supabase.from('session_activities').insert(tagRows)); if (error) throw error; }
      sessionsAdded = fresh.length;
      invalidateCache('intimate_sessions');
    }
  } catch (e) {
    // Le journal est déjà importé : on n'échoue pas tout pour les sessions.
    console.warn('[lovelust] sessions intimes non importées :', e?.message || e);
  }

  return {
    activities: (json.activity || []).length,
    daysLogged: rows.length,
    sessionsAdded,
    dateRange: [rows[0].log_date, rows[rows.length - 1].log_date],
    partnerName: partnerName || null,
  };
}
