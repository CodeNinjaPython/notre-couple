-- =============================================================
--  REPAIR v2 — Débloque la création d'espace couple
--  Stratégie : ajoute des policies PERMISSIVES à noms ASCII.
--  Les policies permissives se cumulent en OR → ceci autorise les
--  opérations même si d'anciennes policies (auth.role(), accents) traînent.
--  Sans danger pour les données. Idempotent (drop if exists + create).
--  À exécuter dans Supabase > SQL Editor > New query > Run.
-- =============================================================

-- ── couples : créer + relire la ligne juste insérée ──────────────────────
drop policy if exists "couples_insert_authed" on couples;
create policy "couples_insert_authed"
  on couples for insert
  with check (auth.uid() is not null);

drop policy if exists "couples_select_authed" on couples;
create policy "couples_select_authed"
  on couples for select
  using (auth.uid() is not null);   -- couples ne contient que id+date, aucune donnée sensible

-- ── couple_members : s'ajouter soi-même ──────────────────────────────────
drop policy if exists "members_insert_self" on couple_members;
create policy "members_insert_self"
  on couple_members for insert
  with check (auth.uid() = user_id);

-- ── pairing_codes : créer / lire / marquer utilisé ───────────────────────
drop policy if exists "codes_insert_authed" on pairing_codes;
create policy "codes_insert_authed"
  on pairing_codes for insert
  with check (auth.uid() is not null);

drop policy if exists "codes_select_authed" on pairing_codes;
create policy "codes_select_authed"
  on pairing_codes for select
  using (auth.uid() is not null);

drop policy if exists "codes_update_authed" on pairing_codes;
create policy "codes_update_authed"
  on pairing_codes for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- ── tables de référence : lecture ────────────────────────────────────────
drop policy if exists "categories_select_authed" on tracking_categories;
create policy "categories_select_authed"
  on tracking_categories for select
  using (auth.uid() is not null);

drop policy if exists "kinks_select_authed" on kinks;
create policy "kinks_select_authed"
  on kinks for select
  using (auth.uid() is not null);
