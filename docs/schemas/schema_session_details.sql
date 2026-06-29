-- schema_session_details.sql — colonne « details » (JSONB) sur intimate_sessions.
-- Requise par le formulaire de session enrichi (pratiques exécutées/reçues,
-- sentiments, protection moi/partenaire, lieu d'éjaculation).
-- À exécuter dans Supabase > SQL Editor AVANT de déployer le formulaire enrichi.

alter table intimate_sessions
  add column if not exists details jsonb not null default '{}'::jsonb;
