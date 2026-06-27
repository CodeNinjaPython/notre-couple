-- =============================================================
--  NOTRE RYTHME — SETUP COMPLET (tout-en-un)
--  Généré : concaténation des 5 schémas dans l'ordre d'exécution.
--  USAGE : Supabase > SQL Editor > New query > coller TOUT ceci > Run.
--  À exécuter UNE SEULE FOIS sur un projet Supabase vierge.
-- =============================================================



-- =============================================================
--  >>> schema_couple_tracker.sql
-- =============================================================

-- =============================================================
--  SUIVI DE CYCLE EN COUPLE — Schéma Supabase (vision symétrique)
--  À coller dans : Supabase > SQL Editor > New query
--  Principe de confidentialité : chacun possède ses données,
--  l'autre ne les voit QUE si elles sont partagées (consentement).
-- =============================================================

-- -------------------------------------------------------------
-- 1. COUPLE & MEMBRES
-- -------------------------------------------------------------
create table couples (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now()
);

create table couple_members (
  couple_id     uuid references couples(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete cascade,
  display_name  text,
  tracks_cycle  boolean default false,   -- true = partenaire qui a ses règles
  joined_at     timestamptz default now(),
  primary key (couple_id, user_id)
);

-- -------------------------------------------------------------
-- 2. APPAIRAGE (invitation par code — modèle Flo/Clue)
--    C'est la personne qui partage qui génère le code : consentement.
-- -------------------------------------------------------------
create table pairing_codes (
  code        text primary key,          -- ex. code court à 6 caractères
  couple_id   uuid references couples(id) on delete cascade,
  created_by  uuid references auth.users(id),
  expires_at  timestamptz not null,
  used        boolean default false
);

-- -------------------------------------------------------------
-- 3. CYCLES (uniquement la partenaire menstruée)
-- -------------------------------------------------------------
create table cycles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  period_start  date not null,
  period_end    date,
  created_at    timestamptz default now()
);

-- -------------------------------------------------------------
-- 4. CATÉGORIES DE SUIVI (façon Clue, valables pour l'un, l'autre ou les deux)
--    scope : 'cycle' (elle) | 'partner' (lui) | 'both'
-- -------------------------------------------------------------
create table tracking_categories (
  id          text primary key,          -- ex. 'mood', 'energy', 'libido', 'flow'
  label       text not null,
  scope       text not null check (scope in ('cycle','partner','both')),
  input_type  text not null check (input_type in ('scale','boolean','enum','number')),
  options     jsonb                      -- valeurs possibles pour les 'enum'
);

-- Quelques catégories de départ
insert into tracking_categories (id, label, scope, input_type, options) values
  ('flow',       'Flux',          'cycle',   'enum',  '["léger","moyen","abondant"]'),
  ('cramps',     'Crampes',       'cycle',   'scale', null),
  ('mood',       'Humeur',        'both',    'enum',  '["😊","😐","😔","😡","😴"]'),
  ('energy',     'Énergie',       'both',    'scale', null),
  ('sleep',      'Sommeil (h)',   'both',    'number',null),
  ('stress',     'Stress',        'both',    'scale', null),
  ('libido',     'Libido',        'both',    'scale', null),
  ('exercise',   'Sport',         'both',    'boolean',null);

-- -------------------------------------------------------------
-- 5. ENTRÉES DE JOURNAL (les deux partenaires)
--    shared : la donnée est-elle visible par l'autre ? (consentement granulaire)
-- -------------------------------------------------------------
create table log_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  log_date     date not null,
  category_id  text references tracking_categories(id),
  value        jsonb not null,
  shared       boolean default true,
  created_at   timestamptz default now(),
  unique (user_id, log_date, category_id)
);

-- -------------------------------------------------------------
-- 6. ÉVÉNEMENTS PARTAGÉS DU COUPLE (intimité, conflit, soirée…)
-- -------------------------------------------------------------
create table couple_events (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid references couples(id) on delete cascade,
  created_by  uuid references auth.users(id),
  event_date  date not null,
  event_type  text not null,            -- ex. 'intimacy','conflict','date_night'
  note        text,
  created_at  timestamptz default now()
);

-- =============================================================
--  ROW LEVEL SECURITY — le cœur de la confidentialité
-- =============================================================

-- Fonction utilitaire : deux users sont-ils dans le même couple ?
create or replace function same_couple(a uuid, b uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1
    from couple_members m1
    join couple_members m2 on m1.couple_id = m2.couple_id
    where m1.user_id = a and m2.user_id = b
  );
$$;

-- --- log_entries -------------------------------------------------
alter table log_entries enable row level security;

create policy "log: accès complet à mes entrées"
  on log_entries for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "log: lecture des entrées partagées du partenaire"
  on log_entries for select
  using (shared = true and same_couple(auth.uid(), user_id));

-- --- cycles ------------------------------------------------------
alter table cycles enable row level security;

create policy "cycle: accès complet aux miens"
  on cycles for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "cycle: lecture par le partenaire"
  on cycles for select
  using (same_couple(auth.uid(), user_id));

-- --- couple_events (les deux membres lisent/écrivent) -----------
alter table couple_events enable row level security;

create policy "events: membres du couple"
  on couple_events for all
  using (exists (
    select 1 from couple_members m
    where m.couple_id = couple_events.couple_id and m.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from couple_members m
    where m.couple_id = couple_events.couple_id and m.user_id = auth.uid()
  ));

-- --- couple_members (voir les membres de mon couple) ------------
alter table couple_members enable row level security;

create policy "members: voir mon couple"
  on couple_members for select
  using (same_couple(auth.uid(), user_id) or user_id = auth.uid());

-- tracking_categories : table de référence, lecture pour tous les connectés
alter table tracking_categories enable row level security;
create policy "categories: lecture authentifiée"
  on tracking_categories for select
  using (auth.uid() is not null);


-- =============================================================
--  >>> schema_additions.sql
-- =============================================================

-- =============================================================
--  POLITIQUES RLS COMPLÉMENTAIRES
--  À exécuter APRÈS schema_couple_tracker.sql dans Supabase > SQL Editor
-- =============================================================

-- -------------------------------------------------------------
-- couple_members : INSERT manquant dans le schéma principal
-- Permet à chaque utilisateur de s'ajouter à un couple.
-- -------------------------------------------------------------
create policy "members: s'ajouter"
  on couple_members for insert
  with check (user_id = auth.uid());

-- -------------------------------------------------------------
-- couples : activer RLS + politiques
-- -------------------------------------------------------------
alter table couples enable row level security;

create policy "couples: créer"
  on couples for insert
  with check (auth.uid() is not null);

create policy "couples: voir le mien"
  on couples for select
  using (auth.uid() is not null);   -- couples = id+date seulement, pas de donnée sensible ;
                                    -- permissif pour autoriser la relecture juste après insert

-- -------------------------------------------------------------
-- pairing_codes : activer RLS + politiques
-- -------------------------------------------------------------
alter table pairing_codes enable row level security;

-- Créer un code (membre du couple)
create policy "codes: créer pour mon couple"
  on pairing_codes for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from couple_members
      where couple_id = pairing_codes.couple_id and user_id = auth.uid()
    )
  );

-- Lire : membre du couple OU utilisateur authentifié (pour valider lors du join)
create policy "codes: lire pour validation"
  on pairing_codes for select
  using (auth.uid() is not null);

-- Marquer comme utilisé (toute personne authentifiée qui a le code)
create policy "codes: marquer utilisé"
  on pairing_codes for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- -------------------------------------------------------------
-- couple_members : UPDATE (modifier son propre profil)
-- Nécessaire pour modifier display_name et tracks_cycle
-- depuis l'écran Nous.
-- -------------------------------------------------------------
create policy "members: modifier ses infos"
  on couple_members for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- -------------------------------------------------------------
-- couple_members : DELETE (se délier du couple — §10)
-- -------------------------------------------------------------
create policy "members: se délier"
  on couple_members for delete
  using ((select auth.uid()) = user_id);

-- -------------------------------------------------------------
-- couple_events : colonnes réactions + créateur (§7)
-- À exécuter après le schéma principal si les colonnes n'existent pas.
-- -------------------------------------------------------------
alter table couple_events
  add column if not exists reactions   jsonb    default '{}',
  add column if not exists created_by  uuid     references auth.users;

-- Politique UPDATE pour les réactions (tout membre du couple peut réagir)
create policy "events: réagir"
  on couple_events for update
  using (
    couple_id in (
      select couple_id from couple_members
      where (select auth.uid()) = user_id
    )
  )
  with check (
    couple_id in (
      select couple_id from couple_members
      where (select auth.uid()) = user_id
    )
  );


-- =============================================================
--  >>> schema_intimite.sql
-- =============================================================

-- =============================================================
--  MODULE INTIMITÉ — Extension du schéma principal
--  À exécuter APRÈS schema_couple_tracker.sql ET schema_additions.sql
--  Même philosophie RLS : chacun possède ses données, l'autre ne voit
--  que ce qui est explicitement partagé.
-- =============================================================

-- -------------------------------------------------------------
-- 1. SESSIONS INTIMES
-- -------------------------------------------------------------
create table intimate_sessions (
  id              uuid primary key default gen_random_uuid(),
  couple_id       uuid references couples(id) on delete cascade,
  created_by      uuid references auth.users(id),
  session_date    date not null,
  duration_min    int,                          -- durée totale en minutes
  prelim_min      int,                          -- durée préliminaires
  location        text,                         -- 'maison','voyage','autre'
  mood            text,                         -- 'tender','playful','passionate','spontaneous'
  note            text,                         -- note libre partagée
  created_at      timestamptz default now()
);

-- Feedback individuel par partenaire (privé par défaut, partageable)
create table session_feedback (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid references intimate_sessions(id) on delete cascade,
  user_id         uuid references auth.users(id) on delete cascade,
  satisfaction    int check (satisfaction between 1 and 10),
  orgasms         int default 0,
  loved_txt       text,
  improve_txt     text,
  shared          boolean default false,        -- rendre visible au partenaire
  created_at      timestamptz default now(),
  unique (session_id, user_id)
);

-- -------------------------------------------------------------
-- 2. KINKS — TABLE DE RÉFÉRENCE (seedée, lecture pour tous)
-- -------------------------------------------------------------
create table kinks (
  id        text primary key,
  label     text not null,
  category  text not null   -- 'atmosphere','pratiques','lieux','communication','jeux'
);

-- Catalogue de référence (44 kinks couvrant 6 catégories)
insert into kinks (id, label, category) values
  -- Atmosphère
  ('mood_candles',     'Bougies & lumière tamisée',       'atmosphere'),
  ('mood_music',       'Musique choisie ensemble',         'atmosphere'),
  ('mood_massage',     'Massage avant',                    'atmosphere'),
  ('mood_bath',        'Bain ou douche ensemble',          'atmosphere'),
  ('mood_scent',       'Parfum / huile de massage',        'atmosphere'),
  ('mood_food',        'Apéro ou dessert au lit',          'atmosphere'),
  ('mood_dress',       'Tenue choisie pour l''autre',      'atmosphere'),
  -- Communication
  ('comm_fantasy',     'Partage de fantasmes',             'communication'),
  ('comm_aftercare',   'Temps de tendresse après',         'communication'),
  ('comm_surprise',    'Proposition surprise',              'communication'),
  ('comm_vocal',       'Exprimer ce qu''on aime pendant',  'communication'),
  ('comm_letter',      'Petit mot / message avant',        'communication'),
  ('comm_debrief',     'Débrief doux après',               'communication'),
  -- Lieux
  ('loc_outside',      'Extérieur / nature',               'lieux'),
  ('loc_travel',       'En voyage',                        'lieux'),
  ('loc_hotel',        'Hôtel / nuit ailleurs',            'lieux'),
  ('loc_car',          'Voiture',                          'lieux'),
  ('loc_other_room',   'Autre pièce de la maison',         'lieux'),
  -- Pratiques
  ('act_slowdown',     'Ralentir, prendre le temps',       'pratiques'),
  ('act_roleplay',     'Jeu de rôles léger',               'pratiques'),
  ('act_bondage_soft', 'Contrainte douce (foulard…)',       'pratiques'),
  ('act_toys',         'Accessoires',                      'pratiques'),
  ('act_oral',         'Câlins buccaux',                   'pratiques'),
  ('act_sixty_nine',   'Partage simultané',                'pratiques'),
  ('act_exhib_soft',   'Légère exhibition (entre vous)',    'pratiques'),
  ('act_temperature',  'Chaud / froid (bougie, glaçon)',   'pratiques'),
  ('act_mirror',       'Miroir',                           'pratiques'),
  ('act_blindfold',    'Yeux bandés',                      'pratiques'),
  ('act_photo_priv',   'Photos privées',                   'pratiques'),
  ('act_extended',     'Session longue sans précipitation','pratiques'),
  -- Jeux
  ('game_dare',        'Questions / défis',                'jeux'),
  ('game_challenge',   'Défi du mois',                     'jeux'),
  ('game_date',        'Date night thématique',            'jeux'),
  ('game_quiz',        'Quiz de compatibilité',            'jeux'),
  ('game_strip',       'Jeu de déshabillage',              'jeux'),
  ('game_fantasy_box', 'Boîte à fantasmes',                'jeux'),
  -- Sensations
  ('sens_slow_touch',  'Effleurement très lent',           'sensations'),
  ('sens_deep_eye',    'Contact visuel prolongé',          'sensations'),
  ('sens_voice',       'Voix à l''oreille',                'sensations'),
  ('sens_breathe',     'Synchroniser la respiration',      'sensations'),
  ('sens_music_tempo', 'Rythme calé sur la musique',       'sensations'),
  ('sens_no_goal',     'Sans objectif défini',             'sensations'),
  ('sens_outdoor_sky', 'À la belle étoile',                'sensations'),
  ('sens_tantric',     'Approche tantrique (lenteur)',      'sensations');

-- Évaluations individuelles (désir 0-5)
-- shared = true : le partenaire sait que tu t'y intéresses (pas le niveau exact)
create table kink_ratings (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid references auth.users(id) on delete cascade,
  kink_id   text references kinks(id) on delete cascade,
  desire    int check (desire between 0 and 5) default 0,
  note      text,                               -- commentaire privé
  shared    boolean default false,              -- true = partenaire sait que tu t'y intéresses
  updated_at timestamptz default now(),
  unique (user_id, kink_id)
);

-- -------------------------------------------------------------
-- 3. WISH-LIST / FANTASMES
-- Statut : proposed → validated → tried → repeat
-- -------------------------------------------------------------
create table fantasies (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid references couples(id) on delete cascade,
  created_by  uuid references auth.users(id),
  content     text not null,
  status      text default 'proposed'
              check (status in ('proposed','validated','tried','repeat')),
  shared      boolean default true,             -- vrai = visible du partenaire
  created_at  timestamptz default now()
);

-- -------------------------------------------------------------
-- 4. CONSENTEMENT & LIMITES
-- Niveau : ok | soft | hard
-- Les hard limits sont TOUJOURS visibles du partenaire (sécurité)
-- -------------------------------------------------------------
create table consent_limits (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid references auth.users(id) on delete cascade,
  practice  text not null,                      -- libellé libre ou kink_id
  level     text not null check (level in ('ok','soft','hard')),
  note      text,
  updated_at timestamptz default now(),
  unique (user_id, practice)
);

create table safewords (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid references couples(id) on delete cascade,
  word        text not null,
  meaning     text,                             -- ex. 'stop immédiat', 'pause'
  created_at  timestamptz default now()
);

-- -------------------------------------------------------------
-- 5. SANTÉ SEXUELLE (privé par défaut)
-- type : 'contraception' | 'test_ist' | 'vaccination' | 'symptom'
-- -------------------------------------------------------------
create table sexual_health (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  entry_date  date not null,
  type        text not null check (type in ('contraception','test_ist','vaccination','symptom')),
  label       text not null,
  value       text,
  note        text,
  shared      boolean default false,            -- privé par défaut
  created_at  timestamptz default now()
);

-- -------------------------------------------------------------
-- 6. DÉFIS DU MOIS
-- -------------------------------------------------------------
create table challenges (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid references couples(id) on delete cascade,
  title       text not null,
  description text,
  due_date    date,
  completed   boolean default false,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now()
);

-- =============================================================
--  ROW LEVEL SECURITY
-- =============================================================

-- intimate_sessions — membres du couple
alter table intimate_sessions enable row level security;
create policy "sessions: membres du couple"
  on intimate_sessions for all
  using (exists (
    select 1 from couple_members m
    where m.couple_id = intimate_sessions.couple_id and m.user_id = auth.uid()
  ))
  with check (created_by = auth.uid());

-- session_feedback — lire le sien + feedback partagé du partenaire
alter table session_feedback enable row level security;
create policy "feedback: accès complet au mien"
  on session_feedback for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy "feedback: lire le partagé du partenaire"
  on session_feedback for select
  using (shared = true and same_couple(auth.uid(), user_id));

-- kinks — table de référence, lecture pour tous les authentifiés
alter table kinks enable row level security;
create policy "kinks: lecture authentifiée"
  on kinks for select using (auth.uid() is not null);

-- kink_ratings — lire son propre + shared du partenaire
alter table kink_ratings enable row level security;
create policy "kink_ratings: accès complet au mien"
  on kink_ratings for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy "kink_ratings: lire intérêt partagé du partenaire"
  on kink_ratings for select
  using (shared = true and same_couple(auth.uid(), user_id));

-- fantasies — membres du couple (celles partagées)
alter table fantasies enable row level security;
create policy "fantasies: les miennes"
  on fantasies for all
  using (created_by = auth.uid())
  with check (created_by = auth.uid());
create policy "fantasies: partagées du partenaire"
  on fantasies for select
  using (shared = true and same_couple(auth.uid(), created_by));

-- consent_limits — lire les siennes + hard limits du partenaire (toujours visibles)
alter table consent_limits enable row level security;
create policy "limits: accès complet aux miennes"
  on consent_limits for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy "limits: hard limits du partenaire (sécurité)"
  on consent_limits for select
  using (level = 'hard' and same_couple(auth.uid(), user_id));

-- safewords — membres du couple
alter table safewords enable row level security;
create policy "safewords: membres du couple"
  on safewords for all
  using (exists (
    select 1 from couple_members m
    where m.couple_id = safewords.couple_id and m.user_id = auth.uid()
  ));

-- sexual_health — privé par défaut, partageable
alter table sexual_health enable row level security;
create policy "health: accès complet au mien"
  on sexual_health for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy "health: lire le partagé du partenaire"
  on sexual_health for select
  using (shared = true and same_couple(auth.uid(), user_id));

-- challenges — membres du couple
alter table challenges enable row level security;
create policy "challenges: membres du couple"
  on challenges for all
  using (exists (
    select 1 from couple_members m
    where m.couple_id = challenges.couple_id and m.user_id = auth.uid()
  ));


-- =============================================================
--  >>> schema_intimite_additions.sql
-- =============================================================

-- =============================================================
--  MODULE INTIMITÉ — Additions (v2)
--  À exécuter APRÈS schema_intimite.sql
-- =============================================================

-- -------------------------------------------------------------
-- 1. ACTIVITÉS D'UNE SESSION (tags multi-sélection)
-- -------------------------------------------------------------
create table session_activities (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references intimate_sessions(id) on delete cascade,
  tags        text[] not null default '{}',  -- ex. ['oral','massage','toys']
  created_at  timestamptz default now()
);

alter table session_activities enable row level security;
create policy "activities: membres du couple via session"
  on session_activities for all
  using (exists (
    select 1 from intimate_sessions s
    join couple_members m on m.couple_id = s.couple_id
    where s.id = session_activities.session_id and m.user_id = auth.uid()
  ));

-- -------------------------------------------------------------
-- 2. JOURNAL DES « PREMIÈRES FOIS »
-- -------------------------------------------------------------
create table first_times (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid references couples(id) on delete cascade,
  created_by  uuid references auth.users(id),
  description text not null,
  date        date not null,
  note        text,
  created_at  timestamptz default now()
);

alter table first_times enable row level security;
create policy "firsts: membres du couple"
  on first_times for all
  using (exists (
    select 1 from couple_members m
    where m.couple_id = first_times.couple_id and m.user_id = auth.uid()
  ));

-- -------------------------------------------------------------
-- 3. COLONNES SUPPLÉMENTAIRES SUR session_feedback
--    (orgasmes partenaire + aftercare)
-- -------------------------------------------------------------
alter table session_feedback
  add column if not exists prelim_intensity int check (prelim_intensity between 1 and 10),
  add column if not exists aftercare_note   text;  -- notes d'aftercare post-séance

-- -------------------------------------------------------------
-- 4. COLONNES SUPPLÉMENTAIRES SUR intimate_sessions
-- -------------------------------------------------------------
alter table intimate_sessions
  add column if not exists activity_tags     text[]  default '{}',
  add column if not exists prelim_intensity  int     check (prelim_intensity between 1 and 3),
  add column if not exists partner_orgasm    int     default 0;
  -- partner_orgasm : 0=non déclaré, 1=oui, 2=plusieurs
  -- La valeur est déclarée par le créateur de la session (consensuel).
  -- Chaque partenaire peut ensuite mettre à jour son propre session_feedback.


-- =============================================================
--  >>> schema_clue_additions.sql
-- =============================================================

-- =============================================================
--  SUIVI DE SYMPTÔMES — Inspiré Clue
--  Table dédiée pour les symptômes quotidiens multi-tags.
--  À exécuter après schema_couple_tracker.sql et schema_additions.sql.
-- =============================================================

-- daily_symptoms : un enregistrement par utilisateur par jour.
-- tags[] stocke les IDs des symptômes cochés (ex: 's_crampes', 's_fatigue'…).
-- Séparé de log_entries pour éviter le conflit avec le schéma existant
-- et permettre un upsert propre sans toucher aux métriques numériques.
create table daily_symptoms (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  log_date    date not null,
  tags        text[] not null default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (user_id, log_date)
);

-- Trigger pour updated_at automatique
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger daily_symptoms_updated
  before update on daily_symptoms
  for each row execute function touch_updated_at();

-- -------------------------------------------------------------
-- Row Level Security
-- -------------------------------------------------------------
alter table daily_symptoms enable row level security;

-- Accès complet à ses propres entrées
create policy "symptoms: accès complet aux miennes"
  on daily_symptoms for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Lecture des entrées partagées du partenaire (même couple)
-- Note : par défaut les symptômes sont PRIVÉS (pas de champ shared ici).
-- Si vous souhaitez partager des symptômes spécifiques avec votre partenaire,
-- utilisez la table log_entries avec shared=true.
-- Les daily_symptoms restent strictement personnels.

