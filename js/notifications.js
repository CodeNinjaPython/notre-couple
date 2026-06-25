import { supabase } from './supabase.js';

const STORAGE_KEY = 'notif-asked';

export async function requestPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  if (localStorage.getItem(STORAGE_KEY) === 'no') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function getPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

export function declineNotifications() {
  localStorage.setItem(STORAGE_KEY, 'no');
}

// Affiche une notification via le Service Worker (persiste en background)
export function showNotification(title, body, tag = 'notre-rythme') {
  if (Notification.permission !== 'granted') return;
  navigator.serviceWorker?.ready.then(reg => {
    reg.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag,
      renotify: false,
    });
  });
}

// Rappel quotidien si l'utilisateur n'a pas encore saisi aujourd'hui
// Appelé lors de l'ouverture de l'app (>= 19h)
export async function maybeRemindToLog() {
  if (Notification.permission !== 'granted') return;
  const hour = new Date().getHours();
  if (hour < 19) return;

  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('log_entries').select('id').eq('log_date', today).limit(1);

  if (!data?.length) {
    showNotification('Notre rythme', 'N\'oublie pas de saisir ta journée.', 'rappel-daily');
  }
}

// Vérifie si le partenaire a saisi aujourd'hui (pour toast in-app)
export async function checkPartnerLoggedToday(partnerUserId) {
  if (!partnerUserId) return false;
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('log_entries')
    .select('id')
    .eq('user_id', partnerUserId)
    .eq('log_date', today)
    .limit(1);
  return !!(data?.length);
}
