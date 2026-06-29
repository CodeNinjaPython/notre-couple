// send-push — Edge Function : envoie une notification Web Push au partenaire (#12).
//
// Déploiement :
//   supabase functions deploy send-push
// Secrets requis (Supabase → Edge Functions → Secrets) :
//   VAPID_PUBLIC   = clé publique VAPID
//   VAPID_PRIVATE  = clé privée VAPID  (NE JAMAIS committer)
//   (SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis automatiquement)
//
// Appel depuis l'app : supabase.functions.invoke('send-push', { body: { target_user_id, title, body } })

import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC')!;
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE')!;
webpush.setVapidDetails('mailto:fvjeremie@gmail.com', VAPID_PUBLIC, VAPID_PRIVATE);

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    // Exige un appelant authentifié (JWT transmis par supabase.functions.invoke).
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response('unauthorized', { status: 401, headers: cors });
    }

    const { target_user_id, title, body } = await req.json();
    if (!target_user_id) return new Response('missing target', { status: 400, headers: cors });

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Vérifie que l'appelant fait partie du même couple que la cible.
    const caller = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return new Response('unauthorized', { status: 401, headers: cors });

    const { data: members } = await admin.from('couple_members')
      .select('user_id, couple_id').in('user_id', [user.id, target_user_id]);
    const sameCouple = members && members.length === 2 &&
      members[0].couple_id === members[1].couple_id;
    if (!sameCouple) return new Response('forbidden', { status: 403, headers: cors });

    const { data: sub } = await admin.from('push_subscriptions')
      .select('subscription').eq('user_id', target_user_id).maybeSingle();
    if (!sub?.subscription) return new Response('no subscription', { status: 404, headers: cors });

    await webpush.sendNotification(
      sub.subscription,
      JSON.stringify({ title: title || 'Notre cycle', body: body || '' }),
    );
    return new Response('ok', { headers: cors });
  } catch (e) {
    return new Response(`error: ${e?.message || e}`, { status: 500, headers: cors });
  }
});
