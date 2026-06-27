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
  category_id  text,   -- FK retirée : les category_id (journal, bbt, note…) sont gérés côté code
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
