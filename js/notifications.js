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
// Appelé lors de l'ouverture de l'app (>= heure configurée)
export async function maybeRemindToLog() {
  if (Notification.permission !== 'granted') return;
  const settings = getSettings();
  if (!settings.daily) return;
  const hour = new Date().getHours();
  if (hour < (settings.hour || 19)) return;

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

// Alerte règles imminentes (< 3 jours) — respecte les settings
export function checkRulesImminentes(prediction) {
  if (!prediction || Notification.permission !== 'granted') return;
  const settings = getSettings();
  if (!settings.rules) return;
  const daysUntil = Math.round((new Date(prediction.nextPeriodDate) - new Date()) / 864e5);
  if (daysUntil >= 0 && daysUntil <= 2) {
    const msg = daysUntil === 0
      ? 'Les règles sont prévues aujourd\'hui.'
      : `Les règles sont prévues dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}.`;
    showNotification('Notre rythme · Rappel cycle', msg, 'regles-imminentes');
  }
}

// Alerte fenêtre fertile (mode conception)
export function checkFertileWindow(prediction) {
  if (!prediction || Notification.permission !== 'granted') return;
  const settings = getSettings();
  if (!settings.fertile) return;
  const daysUntilFertile = Math.round(
    (new Date(prediction.fertileStart) - new Date()) / 864e5
  );
  if (daysUntilFertile === 2) {
    showNotification('Notre rythme · Conception', 'La fenêtre fertile commence dans 2 jours.', 'fertile');
  }
}

// Alerte partenaire — partenaire a commencé ses règles
export function notifyPartnerPeriodStart(partnerName) {
  if (Notification.permission !== 'granted') return;
  showNotification('Notre rythme', `${partnerName} vient de noter le début de ses règles.`, 'partner-rules');
}

// Lecture des settings
function getSettings() {
  try { return { daily:true, rules:true, fertile:false, hour:20, ...JSON.parse(localStorage.getItem('nc-notif-settings') || '{}') }; }
  catch { return { daily:true, rules:true, fertile:false, hour:20 }; }
}
