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
  with check (auth.role() = 'authenticated');

create policy "couples: voir le mien"
  on couples for select
  using (
    exists (
      select 1 from couple_members
      where couple_id = couples.id and user_id = auth.uid()
    )
  );

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
  using (auth.role() = 'authenticated');

-- Marquer comme utilisé (toute personne authentifiée qui a le code)
create policy "codes: marquer utilisé"
  on pairing_codes for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
