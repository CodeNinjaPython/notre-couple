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
