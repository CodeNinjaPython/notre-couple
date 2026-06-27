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
