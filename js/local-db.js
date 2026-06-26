/**
 * local-db.js — Client localStorage qui mime l'API Supabase.
 * Activé automatiquement quand SUPABASE_URL n'est pas configuré.
 * Toute la mécanique (cycles, saisies, corrélations, réactions…) fonctionne
 * sans backend. Les données persistent dans localStorage entre les sessions.
 */

const PFX = 'nc-';

const ls = {
  get: k => { try { return JSON.parse(localStorage.getItem(PFX + k)); } catch { return null; } },
  set: (k, v) => localStorage.setItem(PFX + k, JSON.stringify(v)),
  rm:  k => localStorage.removeItem(PFX + k),
};

// ─── Helpers RLS simulé ────────────────────────────────────────────────────
function myUserId()   { return ls.get('auth-user')?.id ?? null; }
function myCoupleId() {
  const uid = myUserId();
  if (!uid) return null;
  return (ls.get('couple_members') || []).find(m => m.user_id === uid)?.couple_id ?? null;
}
function inSameCouple(uid) {
  const cid = myCoupleId();
  if (!cid) return false;
  return (ls.get('couple_members') || []).some(m => m.user_id === uid && m.couple_id === cid);
}

function applyRLS(table, rows) {
  const uid = myUserId();
  const cid = myCoupleId();
  if (!uid) return [];
  switch (table) {
    case 'couple_members':
      return rows.filter(r => r.user_id === uid || r.couple_id === cid);
    case 'cycles':
      return rows.filter(r => r.user_id === uid || r.couple_id === cid);
    case 'log_entries':
      return rows.filter(r => r.user_id === uid || (r.shared === true && inSameCouple(r.user_id)));
    case 'couple_events':
    case 'intimate_sessions':
    case 'safewords':
    case 'challenges':
    case 'first_times':
      return rows.filter(r => r.couple_id === cid);
    case 'session_activities':
      return rows; // simplifié pour le mode démo
    case 'daily_symptoms':
      return rows.filter(r => r.user_id === uid); // strictement privé
    case 'session_feedback':
      return rows.filter(r => r.user_id === uid || (r.shared === true && inSameCouple(r.user_id)));
    case 'kink_ratings':
      return rows.filter(r => r.user_id === uid || (r.shared === true && inSameCouple(r.user_id)));
    case 'fantasies':
      return rows.filter(r => r.created_by === uid || (r.shared === true && inSameCouple(r.created_by)));
    case 'consent_limits':
      // Mes limites + hard limits du partenaire (toujours visibles)
      return rows.filter(r => r.user_id === uid || (r.level === 'hard' && inSameCouple(r.user_id)));
    case 'sexual_health':
      return rows.filter(r => r.user_id === uid || (r.shared === true && inSameCouple(r.user_id)));
    case 'kinks':
      return rows; // table de référence
    default:
      return rows;
  }
}

// ─── Query Builder ─────────────────────────────────────────────────────────
class QB {
  constructor(table) {
    this._t   = table;
    this._op  = 'select';
    this._fil = [];
    this._or  = null;
    this._ord = [];
    this._lim = null;
    this._ins = null;
    this._upd = null;
    this._opt = {};
  }

  // ── mutations ──
  select(cols = '*')  { this._cols = cols; return this; }
  insert(d)           { this._op = 'insert'; this._ins = [d].flat(); return this; }
  upsert(d, o = {})  { this._op = 'upsert'; this._ins = [d].flat(); this._opt = o; return this; }
  update(d)           { this._op = 'update'; this._upd = d; return this; }
  delete()            { this._op = 'delete'; return this; }

  // ── filtres ──
  eq(c, v)        { this._fil.push(r => String(r[c]) === String(v));                     return this; }
  neq(c, v)       { this._fil.push(r => String(r[c]) !== String(v));                     return this; }
  lte(c, v)       { this._fil.push(r => (r[c] ?? '') <= v);                              return this; }
  gte(c, v)       { this._fil.push(r => (r[c] ?? '') >= v);                              return this; }
  gt(c, v)        { this._fil.push(r => (r[c] ?? '') >  v);                              return this; }
  is(c, v)        { this._fil.push(r => v === null ? r[c] == null : r[c] === v);         return this; }
  not(c, op, v)   { if (op === 'is' && v === null) this._fil.push(r => r[c] != null);   return this; }
  in(c, vals)     { this._fil.push(r => Array.isArray(vals) && vals.map(String).includes(String(r[c]))); return this; }
  or(expr)        { this._or = expr; return this; }
  order(c, { ascending = true } = {}) { this._ord.push({ c, asc: ascending }); return this; }
  limit(n)        { this._lim = n; return this; }

  // ── terminaisons ──
  single()      { return this._run('one');   }
  maybeSingle() { return this._run('maybe'); }
  then(res, rej) { this._run('many').then(res).catch(rej ?? (e => { throw e; })); }

  // ── filtre combiné ──
  _match(rows) {
    let out = rows.filter(r => this._fil.every(fn => fn(r)));
    if (this._or) {
      out = out.filter(r =>
        this._or.split(',').some(p => {
          const [col, op, ...rest] = p.trim().split('.');
          const val = rest.join('.');
          const rv  = r[col];
          if (op === 'is'  && val === 'null') return rv == null;
          if (op === 'gte') return rv != null && rv >= val;
          if (op === 'lte') return rv != null && rv <= val;
          if (op === 'eq')  return String(rv) === val;
          return false;
        })
      );
    }
    return out;
  }

  async _run(mode) {
    const all = ls.get(this._t) || [];

    if (this._op === 'select') {
      let rows = applyRLS(this._t, this._match(all));
      for (const { c, asc } of this._ord) {
        rows.sort((a, b) => {
          const av = a[c] ?? '', bv = b[c] ?? '';
          return asc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
        });
      }
      if (this._lim) rows = rows.slice(0, this._lim);
      if (mode === 'one')   return { data: rows[0] ?? null, error: rows[0] ? null : { message: 'PGRST116' } };
      if (mode === 'maybe') return { data: rows[0] ?? null, error: null };
      return { data: rows, error: null };
    }

    if (this._op === 'insert') {
      const uid = myUserId();
      const recs = this._ins.map(d => ({
        id: d.id || crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ...(uid && !('user_id' in d) ? { user_id: uid } : {}),
        ...d,
      }));
      all.push(...recs);
      ls.set(this._t, all);
      if (mode === 'one' || mode === 'maybe') return { data: recs[0] ?? null, error: null };
      return { data: recs, error: null };
    }

    if (this._op === 'upsert') {
      const keys = (this._opt.onConflict || '').split(',').map(k => k.trim()).filter(Boolean);
      const out = [];
      for (const d of this._ins) {
        const idx = keys.length
          ? all.findIndex(r => keys.every(k => String(r[k]) === String(d[k])))
          : -1;
        if (idx >= 0) {
          all[idx] = { ...all[idx], ...d };
          out.push(all[idx]);
        } else {
          const rec = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...d };
          all.push(rec);
          out.push(rec);
        }
      }
      ls.set(this._t, all);
      return { data: out, error: null };
    }

    if (this._op === 'update') {
      const hits = this._match(all);
      hits.forEach(r => Object.assign(r, this._upd));
      ls.set(this._t, all);
      return { data: hits, error: null };
    }

    if (this._op === 'delete') {
      const ids = new Set(this._match(all).map(r => r.id));
      ls.set(this._t, all.filter(r => !ids.has(r.id)));
      return { data: [], error: null };
    }

    return { data: null, error: null };
  }
}

// ─── Auth mock ─────────────────────────────────────────────────────────────
const authCbs = [];

const auth = {
  async getUser() {
    return { data: { user: ls.get('auth-user') || null }, error: null };
  },

  async signInWithOtp({ email }) {
    // Démo : connexion immédiate, pas de vrai e-mail envoyé
    const user = ls.get('auth-user') || { id: 'demo-elle', email };
    ls.set('auth-user', { ...user, email });
    setTimeout(() => authCbs.forEach(fn => fn('SIGNED_IN', { user })), 60);
    return { error: null };
  },

  async signOut() {
    ls.rm('auth-user');
    authCbs.forEach(fn => fn('SIGNED_OUT', null));
    return { error: null };
  },

  onAuthStateChange(fn) {
    authCbs.push(fn);
    const user = ls.get('auth-user');
    setTimeout(() => fn('INITIAL_SESSION', user ? { user } : null), 90);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            const i = authCbs.indexOf(fn);
            if (i >= 0) authCbs.splice(i, 1);
          },
        },
      },
    };
  },
};

// ─── Realtime mock (no-op) ─────────────────────────────────────────────────
const chanNoop = () => ({ on() { return this; }, subscribe() { return this; }, unsubscribe() {} });

// ─── Seed (30 jours de données réalistes) ─────────────────────────────────
function seed() {
  if (ls.get('seeded') === '6') return; // version 6 du seed (symptoms table)

  const T  = new Date();
  // Utilise la date locale pour éviter le décalage UTC (important UTC+4)
  const dt = off => {
    const d = new Date(T);
    d.setDate(d.getDate() + off);
    return d.getFullYear() + '-'
      + String(d.getMonth() + 1).padStart(2, '0') + '-'
      + String(d.getDate()).padStart(2, '0');
  };

  const ELLE = 'demo-elle';
  const LUI  = 'demo-lui';
  const CID  = 'demo-couple';

  ls.set('auth-user',   { id: ELLE, email: 'elle@demo.app' });
  ls.set('couples',     [{ id: CID, created_at: dt(-90) }]);
  ls.set('couple_members', [
    { id: 'mem-1', user_id: ELLE, couple_id: CID, display_name: 'Juliette', tracks_cycle: true  },
    { id: 'mem-2', user_id: LUI,  couple_id: CID, display_name: 'Lucas',    tracks_cycle: false },
  ]);

  // 3 cycles : 2 terminés + cycle en cours (J3)
  ls.set('cycles', [
    { id: 'c1', user_id: ELLE, couple_id: CID, period_start: dt(-62), period_end: dt(-57) },
    { id: 'c2', user_id: ELLE, couple_id: CID, period_start: dt(-32), period_end: dt(-27) },
    { id: 'c3', user_id: ELLE, couple_id: CID, period_start: dt(-3),  period_end: null    },
  ]);

  // Profils d'énergie sur 30 jours (indice 0 = il y a 29 jours, 29 = aujourd'hui)
  //                                    J-29 ←──────────────────────────────── J0
  const EE  = [1,1,2,2,3,3,4,4,4,5,5,4,4,5,4,3,3,3,2,2,2,3,3,2,2,1,2,2,3,3];
  const EM  = [2,2,2,3,3,4,4,4,5,5,5,4,4,4,3,3,3,3,2,2,2,2,3,3,2,2,2,3,3,3];
  const EF  = [3,3,2,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3];
  const EC  = [3,3,2,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,2,2,2,1,1,1,1,1,2,2];
  const EL  = [1,1,1,2,3,4,4,5,4,5,4,4,5,5,3,3,2,2,2,1,2,3,3,2,2,1,2,3,2,2];
  const ESL = [3,3,3,4,4,4,4,4,4,4,4,4,4,3,3,3,3,3,3,3,2,3,3,3,3,3,3,3,3,3];

  const LE  = [3,3,4,4,4,4,4,4,4,4,4,3,4,4,4,3,3,3,3,3,3,3,3,3,3,4,4,4,4,4];
  const LM  = [4,3,4,4,4,4,4,4,4,4,4,3,3,3,3,3,3,2,3,3,3,3,3,3,3,4,4,4,4,4];
  const LST = [2,3,3,3,2,2,2,2,2,2,2,3,3,3,3,3,3,4,3,3,3,3,2,2,3,2,2,2,2,2];
  const LL  = [3,2,2,3,4,4,5,4,4,5,4,4,4,4,3,3,3,2,3,3,3,3,3,3,2,3,3,3,3,3];
  const LSL = [4,4,4,4,4,4,4,4,4,4,4,3,3,3,3,3,3,3,3,3,3,3,4,4,4,4,4,4,4,4];

  const entries = [];
  for (let i = 29; i >= 0; i--) {
    const d   = dt(-i);
    const idx = 29 - i;

    // Entrées Elle (tous les jours)
    [
      [ELLE, 'energy', EE[idx]],
      [ELLE, 'mood',   EM[idx]],
      [ELLE, 'flow',   EF[idx]],
      [ELLE, 'cramps', EC[idx]],
      [ELLE, 'libido', EL[idx]],
      [ELLE, 'sleep',  ESL[idx]],
    ].forEach(([uid, cat, v]) => entries.push({
      id: `${uid}-${cat}-${d}`,
      user_id: uid, log_date: d,
      category_id: cat, value: { v: String(v) },
      shared: true, created_at: `${d}T20:00:00Z`,
    }));

    // Entrées Lui (un jour sur deux + toute la dernière semaine)
    if (i % 2 === 0 || i < 8) {
      [
        [LUI, 'energy',   LE[idx]],
        [LUI, 'mood',     LM[idx]],
        [LUI, 'stress',   LST[idx]],
        [LUI, 'libido',   LL[idx]],
        [LUI, 'sleep',    LSL[idx]],
        [LUI, 'exercise', idx % 3 === 0 ? 1 : 0],
      ].forEach(([uid, cat, v]) => entries.push({
        id: `${uid}-${cat}-${d}`,
        user_id: uid, log_date: d,
        category_id: cat, value: { v: String(v) },
        shared: true, created_at: `${d}T21:00:00Z`,
      }));
    }
  }
  ls.set('log_entries', entries);

  ls.set('couple_events', [
    { id:'ev1', couple_id:CID, event_date:dt(0),   event_type:'date_night', note:'Dîner aux chandelles',               reactions:{[ELLE]:'❤️'},              created_by:ELLE, created_at:new Date().toISOString() },
    { id:'ev2', couple_id:CID, event_date:dt(-4),  event_type:'intimacy',   note:null,                                 reactions:{[ELLE]:'❤️',[LUI]:'❤️'},   created_by:LUI,  created_at:new Date(T-4*864e5).toISOString() },
    { id:'ev3', couple_id:CID, event_date:dt(-9),  event_type:'conflict',   note:'Petite dispute — réconciliation vite', reactions:{},                        created_by:ELLE, created_at:new Date(T-9*864e5).toISOString() },
    { id:'ev4', couple_id:CID, event_date:dt(-15), event_type:'date_night', note:'Cinéma',                             reactions:{[LUI]:'✨'},                created_by:LUI,  created_at:new Date(T-15*864e5).toISOString() },
    { id:'ev5', couple_id:CID, event_date:dt(-22), event_type:'other',      note:'Week-end à la montagne',             reactions:{[ELLE]:'😊',[LUI]:'😊'},   created_by:ELLE, created_at:new Date(T-22*864e5).toISOString() },
  ]);

  ls.set('pairing_codes', []);

  // ── Module Intime — données démo ─────────────────────────────────────
  ls.set('intimate_sessions', [
    { id:'ses1', couple_id:CID, created_by:ELLE, session_date:dt(-3),  mood:'tender',     location:'maison', duration_min:45,  note:'Belle soirée',         created_at:new Date(T-3*864e5).toISOString() },
    { id:'ses2', couple_id:CID, created_by:LUI,  session_date:dt(-10), mood:'playful',    location:'hotel',  duration_min:60,  note:'Week-end ressourçant', created_at:new Date(T-10*864e5).toISOString() },
    { id:'ses3', couple_id:CID, created_by:ELLE, session_date:dt(-18), mood:'passionate', location:'maison', duration_min:30,  note:null,                   created_at:new Date(T-18*864e5).toISOString() },
  ]);
  ls.set('session_feedback', [
    { id:'fb1', session_id:'ses1', user_id:ELLE, satisfaction:8, orgasms:1, loved_txt:'La tendresse', improve_txt:null, shared:false, created_at:new Date(T-3*864e5).toISOString() },
    { id:'fb2', session_id:'ses1', user_id:LUI,  satisfaction:9, orgasms:1, loved_txt:'Le moment',    improve_txt:null, shared:true,  created_at:new Date(T-3*864e5).toISOString() },
    { id:'fb3', session_id:'ses2', user_id:ELLE, satisfaction:7, orgasms:0, loved_txt:null, improve_txt:'Plus de temps', shared:false, created_at:new Date(T-10*864e5).toISOString() },
  ]);
  // Seed 44 kinks — miroir exact du schema_intimite.sql
  ls.set('kinks', [
    { id:'mood_candles',     label:'Bougies & lumière tamisée',        category:'atmosphere' },
    { id:'mood_music',       label:'Musique choisie ensemble',          category:'atmosphere' },
    { id:'mood_massage',     label:'Massage avant',                     category:'atmosphere' },
    { id:'mood_bath',        label:'Bain ou douche ensemble',           category:'atmosphere' },
    { id:'mood_scent',       label:'Parfum / huile de massage',         category:'atmosphere' },
    { id:'mood_food',        label:'Apéro ou dessert au lit',           category:'atmosphere' },
    { id:'mood_dress',       label:"Tenue choisie pour l'autre",        category:'atmosphere' },
    { id:'comm_fantasy',     label:'Partage de fantasmes',              category:'communication' },
    { id:'comm_aftercare',   label:'Temps de tendresse après',          category:'communication' },
    { id:'comm_surprise',    label:'Proposition surprise',               category:'communication' },
    { id:'comm_vocal',       label:"Exprimer ce qu'on aime pendant",    category:'communication' },
    { id:'comm_letter',      label:'Petit mot / message avant',         category:'communication' },
    { id:'comm_debrief',     label:'Débrief doux après',                category:'communication' },
    { id:'loc_outside',      label:'Extérieur / nature',                category:'lieux' },
    { id:'loc_travel',       label:'En voyage',                         category:'lieux' },
    { id:'loc_hotel',        label:'Hôtel / nuit ailleurs',             category:'lieux' },
    { id:'loc_car',          label:'Voiture',                           category:'lieux' },
    { id:'loc_other_room',   label:'Autre pièce de la maison',          category:'lieux' },
    { id:'act_slowdown',     label:'Ralentir, prendre le temps',        category:'pratiques' },
    { id:'act_roleplay',     label:'Jeu de rôles léger',                category:'pratiques' },
    { id:'act_bondage_soft', label:'Contrainte douce (foulard…)',        category:'pratiques' },
    { id:'act_toys',         label:'Accessoires',                       category:'pratiques' },
    { id:'act_oral',         label:'Câlins buccaux',                    category:'pratiques' },
    { id:'act_sixty_nine',   label:'Partage simultané',                 category:'pratiques' },
    { id:'act_exhib_soft',   label:'Légère exhibition (entre vous)',     category:'pratiques' },
    { id:'act_temperature',  label:'Chaud / froid (bougie, glaçon)',    category:'pratiques' },
    { id:'act_mirror',       label:'Miroir',                            category:'pratiques' },
    { id:'act_blindfold',    label:'Yeux bandés',                       category:'pratiques' },
    { id:'act_photo_priv',   label:'Photos privées',                    category:'pratiques' },
    { id:'act_extended',     label:'Session longue sans précipitation', category:'pratiques' },
    { id:'game_dare',        label:'Questions / défis',                 category:'jeux' },
    { id:'game_challenge',   label:'Défi du mois',                      category:'jeux' },
    { id:'game_date',        label:'Date night thématique',             category:'jeux' },
    { id:'game_quiz',        label:'Quiz de compatibilité',             category:'jeux' },
    { id:'game_strip',       label:'Jeu de déshabillage',               category:'jeux' },
    { id:'game_fantasy_box', label:'Boîte à fantasmes',                 category:'jeux' },
    { id:'sens_slow_touch',  label:'Effleurement très lent',            category:'sensations' },
    { id:'sens_deep_eye',    label:'Contact visuel prolongé',           category:'sensations' },
    { id:'sens_voice',       label:"Voix à l'oreille",                  category:'sensations' },
    { id:'sens_breathe',     label:'Synchroniser la respiration',       category:'sensations' },
    { id:'sens_music_tempo', label:'Rythme calé sur la musique',        category:'sensations' },
    { id:'sens_no_goal',     label:'Sans objectif défini',              category:'sensations' },
    { id:'sens_outdoor_sky', label:'À la belle étoile',                 category:'sensations' },
    { id:'sens_tantric',     label:'Approche tantrique (lenteur)',       category:'sensations' },
  ]);
  ls.set('kink_ratings', [
    { id:'kr1', user_id:ELLE, kink_id:'mood_candles',  desire:5, shared:true,  updated_at:new Date().toISOString() },
    { id:'kr2', user_id:ELLE, kink_id:'mood_massage',  desire:4, shared:true,  updated_at:new Date().toISOString() },
    { id:'kr3', user_id:ELLE, kink_id:'loc_hotel',     desire:4, shared:true,  updated_at:new Date().toISOString() },
    { id:'kr4', user_id:ELLE, kink_id:'game_date',     desire:3, shared:true,  updated_at:new Date().toISOString() },
    { id:'kr5', user_id:LUI,  kink_id:'mood_candles',  desire:4, shared:true,  updated_at:new Date().toISOString() },
    { id:'kr6', user_id:LUI,  kink_id:'loc_hotel',     desire:5, shared:true,  updated_at:new Date().toISOString() },
    { id:'kr7', user_id:LUI,  kink_id:'act_slowdown',  desire:4, shared:true,  updated_at:new Date().toISOString() },
    { id:'kr8', user_id:LUI,  kink_id:'game_date',     desire:4, shared:true,  updated_at:new Date().toISOString() },
  ]);
  ls.set('fantasies', [
    { id:'wish1', couple_id:CID, created_by:ELLE, content:'Week-end sans téléphone dans un chalet', status:'validated', shared:true, created_at:new Date(T-5*864e5).toISOString() },
    { id:'wish2', couple_id:CID, created_by:LUI,  content:'Soirée thématique années 80',            status:'proposed',  shared:true, created_at:new Date(T-12*864e5).toISOString() },
  ]);
  ls.set('consent_limits', [
    { id:'cl1', user_id:ELLE, practice:'Photos / vidéos', level:'soft', note:'OK mais on décide ensemble',  updated_at:new Date().toISOString() },
    { id:'cl2', user_id:LUI,  practice:'Partage avec tiers', level:'hard', note:'Absolument pas',           updated_at:new Date().toISOString() },
  ]);
  ls.set('safewords', [
    { id:'sw1', couple_id:CID, word:'Ananas', meaning:'Stop immédiat', created_at:new Date().toISOString() },
  ]);
  ls.set('sexual_health', []);
  ls.set('challenges', [
    { id:'ch1', couple_id:CID, title:'Date night sans téléphone', description:null, due_date:dt(7), completed:false, created_by:ELLE, created_at:new Date().toISOString() },
  ]);
  ls.set('first_times', [
    { id:'ft1', couple_id:CID, created_by:ELLE, description:'Premier voyage ensemble', date:dt(-90), note:'Lisbonne', created_at:new Date(T-90*864e5).toISOString() },
    { id:'ft2', couple_id:CID, created_by:LUI,  description:'Premier massage partagé', date:dt(-25), note:null, created_at:new Date(T-25*864e5).toISOString() },
  ]);
  ls.set('session_activities', []);
  ls.set('daily_symptoms', []);  // table symptoms — vide au départ, l'utilisateur saisit

  // Démo : onboarding considéré comme complété, mode par défaut
  localStorage.setItem('nc-onboarding-v1', 'done');
  localStorage.setItem('nc-cycle-mode', 'rules');
  ls.set('seeded', '6');
}

// ─── Export ────────────────────────────────────────────────────────────────
export function createLocalClient() {
  seed();
  return {
    from:    table => new QB(table),
    auth,
    channel: chanNoop,
  };
}

/** Efface toutes les données de démo (utile depuis les réglages). */
export function resetDemoData() {
  [
    'auth-user','couples','couple_members','cycles',
    'log_entries','couple_events','pairing_codes','seeded',
  ].forEach(k => ls.rm(k));
  // Reseed
  seed();
}
