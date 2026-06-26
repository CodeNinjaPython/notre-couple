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
