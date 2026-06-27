-- =============================================================
--  REPAIR — Corrige "new row violates row-level security policy"
--  Remplace auth.role() = 'authenticated'  →  auth.uid() is not null
--  (auth.role() n'est pas fiable avec les clés sb_publishable_).
--
--  À exécuter dans Supabase > SQL Editor > New query > Run.
--  Sans danger : ne touche pas aux tables ni aux données. Idempotent.
-- =============================================================

-- couples : autoriser la création par tout utilisateur connecté
drop policy if exists "couples: créer" on couples;
create policy "couples: créer"
  on couples for insert
  with check (auth.uid() is not null);

-- pairing_codes : lecture pour valider un code lors du join
drop policy if exists "codes: lire pour validation" on pairing_codes;
create policy "codes: lire pour validation"
  on pairing_codes for select
  using (auth.uid() is not null);

-- pairing_codes : marquer un code comme utilisé
drop policy if exists "codes: marquer utilisé" on pairing_codes;
create policy "codes: marquer utilisé"
  on pairing_codes for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- tracking_categories : lecture des catégories (référence)
drop policy if exists "categories: lecture authentifiée" on tracking_categories;
create policy "categories: lecture authentifiée"
  on tracking_categories for select
  using (auth.uid() is not null);

-- kinks : lecture du catalogue (référence)
drop policy if exists "kinks: lecture authentifiée" on kinks;
create policy "kinks: lecture authentifiée"
  on kinks for select
  using (auth.uid() is not null);
