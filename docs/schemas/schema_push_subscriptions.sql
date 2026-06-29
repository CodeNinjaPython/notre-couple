-- schema_push_subscriptions.sql — abonnements Web Push (#12).
-- À coller dans Supabase > SQL Editor.

create table if not exists push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  couple_id    uuid references couples(id) on delete cascade,
  subscription jsonb not null,          -- PushSubscription.toJSON()
  created_at   timestamptz default now(),
  unique (user_id)
);

alter table push_subscriptions enable row level security;

-- Chacun gère son propre abonnement. L'envoi (lecture de l'abonnement du partenaire)
-- se fait dans l'Edge Function avec la clé service-role (qui contourne la RLS).
create policy "push: gestion de son abonnement"
  on push_subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
