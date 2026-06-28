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
      else if (p !== 'VAGINAL') uniq(L.tags, p.toLowerCase());
    }
    for (const m of (a.moods || [])) {
      if (MOOD[m]) uniq(L.libidoPratiques, MOOD[m]);
      else uniq(L.tags, m.toLowerCase());
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
  return {
    activities: (json.activity || []).length,
    daysLogged: rows.length,
    dateRange: [rows[0].log_date, rows[rows.length - 1].log_date],
    partnerName: partnerName || null,
  };
}
