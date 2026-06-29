import { supabase } from './supabase.js';
import { localDateStr } from './date-utils.js';

const STORAGE_KEY = 'notif-asked';

// Safari iOS en PWA standalone n'expose pas le global Notification : y accéder
// directement lève « Can't find variable: Notification ». Toujours passer par ce
// garde avant de lire Notification.permission.
function notifGranted() {
  return ('Notification' in window) && Notification.permission === 'granted';
}

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
  if (!notifGranted()) return;
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
// Appelé lors de l'ouverture de l'app (>= heure configurée)
export async function maybeRemindToLog() {
  if (!notifGranted()) return;
  const settings = getSettings();
  if (!settings.daily) return;
  const hour = new Date().getHours();
  if (hour < (settings.hour || 19)) return;

  const today = localDateStr();
  const { data } = await supabase
    .from('log_entries').select('id').eq('log_date', today).limit(1);

  if (!data?.length) {
    showNotification('Notre cycle', 'N\'oublie pas de saisir ta journée.', 'rappel-daily');
  }
}

// Vérifie si le partenaire a saisi aujourd'hui (pour toast in-app)
export async function checkPartnerLoggedToday(partnerUserId) {
  if (!partnerUserId) return false;
  const today = localDateStr();
  const { data } = await supabase
    .from('log_entries')
    .select('id')
    .eq('user_id', partnerUserId)
    .eq('log_date', today)
    .limit(1);
  return !!(data?.length);
}

// Alerte règles imminentes (< 3 jours) — respecte les settings
export function checkRulesImminentes(prediction) {
  if (!prediction || !notifGranted()) return;
  const settings = getSettings();
  if (!settings.rules) return;
  const daysUntil = Math.round((new Date(prediction.nextPeriodDate) - new Date()) / 864e5);
  if (daysUntil >= 0 && daysUntil <= 2) {
    const msg = daysUntil === 0
      ? 'Les règles sont prévues aujourd\'hui.'
      : `Les règles sont prévues dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}.`;
    showNotification('Notre cycle · Rappel cycle', msg, 'regles-imminentes');
  }
}

// Alerte fenêtre fertile (mode conception)
export function checkFertileWindow(prediction) {
  if (!prediction || !notifGranted()) return;
  const settings = getSettings();
  if (!settings.fertile) return;
  const daysUntilFertile = Math.round(
    (new Date(prediction.fertileStart) - new Date()) / 864e5
  );
  if (daysUntilFertile === 2) {
    showNotification('Notre cycle · Conception', 'La fenêtre fertile commence dans 2 jours.', 'fertile');
  }
}

// Alerte partenaire — partenaire a commencé ses règles
export function notifyPartnerPeriodStart(partnerName) {
  if (!notifGranted()) return;
  showNotification('Notre cycle', `${partnerName} vient de noter le début de ses règles.`, 'partner-rules');
}

// §4 — Notification "Vos libidos sont alignées aujourd'hui"
// Strictement optionnelle : nécessite libido_aligned = true dans les settings.
// Déclenchée une seule fois par jour (guard localStorage).
export async function notifyLibidosAligned() {
  if (!notifGranted()) return;
  const settings = getSettings();
  if (!settings.libido_aligned) return;

  // Guard : ne notifier qu'une fois par jour
  const today   = localDateStr();
  const lastKey = 'nc-libido-notif-date';
  if (localStorage.getItem(lastKey) === today) return;

  const { data } = await supabase
    .from('log_entries')
    .select('user_id, value')
    .eq('category_id', 'libido')
    .eq('log_date', today);

  if (!data || data.length < 2) return;

  const vals = data.map(e => Number(e.value?.v ?? e.value));
  if (vals.length >= 2 && vals.every(v => v >= 4)) {
    showNotification(
      'Notre cycle ❤️',
      'Vos libidos sont alignées aujourd\'hui.',
      'libido-aligned'
    );
    localStorage.setItem(lastKey, today);
  }
}

// Lecture des settings
function getSettings() {
  try {
    return {
      daily: true, rules: true, fertile: false, libido_aligned: false, hour: 20,
      ...JSON.parse(localStorage.getItem('nc-notif-settings') || '{}'),
    };
  } catch { return { daily: true, rules: true, fertile: false, libido_aligned: false, hour: 20 }; }
}
