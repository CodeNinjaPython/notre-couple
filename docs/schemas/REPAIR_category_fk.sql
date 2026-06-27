-- =============================================================
--  REPAIR — Débloque la saisie du journal + l'import Clue
--  Erreur corrigée : "violates foreign key constraint
--  log_entries_category_id_fkey".
--
--  L'app stocke le journal (category_id='journal'), la temp. basale
--  ('bbt') et la note ('note') dans log_entries. La FK vers
--  tracking_categories (table réservée à une future admin v2, non
--  requêtée par le client) bloque ces inserts. On la retire.
--
--  Sans danger : ne touche pas aux données. À exécuter dans
--  Supabase > SQL Editor > New query > Run.
-- =============================================================

alter table log_entries
  drop constraint if exists log_entries_category_id_fkey;
