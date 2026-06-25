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
