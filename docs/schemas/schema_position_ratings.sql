-- schema_position_ratings.sql — notation des positions (Phase 1 « suivi sexualité »).
-- À exécuter dans Supabase > SQL Editor (après le schéma intimité).
-- Chaque ligne = une position notée lors d'une session : score /10 + douleur + profondeur.
-- Sert ensuite au moteur de suggestion (douleurs, « moins profond ») et aux corrélations cycle×plaisir.

create table if not exists position_ratings (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid references couples(id) on delete cascade,
  created_by  uuid references auth.users(id),
  session_id  uuid references intimate_sessions(id) on delete set null,
  position_id text not null,                       -- id de la bibliothèque (ex. 'missionary')
  score       int  check (score between 1 and 10), -- ressenti global /10 (nullable)
  pain        boolean default false,               -- douleur ressentie
  too_deep    boolean default false,               -- pénétration trop profonde
  rated_on    date not null,                       -- = session_date (→ phase du cycle)
  created_at  timestamptz default now()
);

create index if not exists idx_position_ratings_couple   on position_ratings (couple_id);
create index if not exists idx_position_ratings_position  on position_ratings (position_id);
create index if not exists idx_position_ratings_rated_on  on position_ratings (rated_on);

alter table position_ratings enable row level security;

-- Transparence couple : les deux partenaires VOIENT toutes les notes du couple.
create policy "position_ratings: lecture couple"
  on position_ratings for select
  using (exists (
    select 1 from couple_members m
    where m.couple_id = position_ratings.couple_id and m.user_id = auth.uid()
  ));

-- Mais chacun ne crée/modifie/supprime que ses propres notes.
create policy "position_ratings: insertion perso"
  on position_ratings for insert
  with check (created_by = auth.uid());

create policy "position_ratings: maj perso"
  on position_ratings for update
  using (created_by = auth.uid());

create policy "position_ratings: suppression perso"
  on position_ratings for delete
  using (created_by = auth.uid());
