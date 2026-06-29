/**
 * push.js — Abonnement Web Push (#12).
 * La clé VAPID PUBLIQUE est destinée au client (non secrète).
 * L'envoi réel se fait via l'Edge Function Supabase `send-push` (clé privée côté serveur).
 * iOS : ne fonctionne qu'en PWA installée sur l'écran d'accueil (iOS 16.4+).
 */
import { supabase } from './supabase.js';

const VAPID_PUBLIC = 'BG1JG9J2NhIWLQeeIIoXZZX8skjQJ_NE_OlLQfNSznm4dDtd_39a3toy5TwG6ADgMykv9AMwNSrTCnOsPzeWZRE';

function urlB64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

/** S'abonne au push et enregistre l'abonnement (best-effort). */
export async function subscribeToPush(coupleId, userId) {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    if (!userId) return;

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC),
      });
    }
    await supabase.from('push_subscriptions').upsert(
      { user_id: userId, couple_id: coupleId, subscription: sub.toJSON() },
      { onConflict: 'user_id' },
    );
  } catch (e) {
    console.warn('[push] abonnement impossible :', e?.message || e);
  }
}

/** Demande à l'Edge Function d'envoyer un push au partenaire (best-effort). */
export async function sendPushToPartner(partnerUserId, title, body) {
  try {
    if (!partnerUserId) return;
    await supabase.functions.invoke('send-push', {
      body: { target_user_id: partnerUserId, title, body },
    });
  } catch (e) {
    console.warn('[push] envoi impossible :', e?.message || e);
  }
}
