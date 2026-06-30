const CACHE = 'notre-rythme-v85';
const SHELL = [
  '/',
  '/index.html',
  '/css/app.css',
  '/js/app.js',
  '/js/config.js',
  '/js/supabase.js',
  '/js/auth.js',
  '/js/pairing.js',
  '/js/router.js',
  '/js/cycles.js',
  '/js/today.js',
  '/js/calendar.js',
  '/js/nous.js',
  '/js/realtime.js',
  '/js/notifications.js',
  '/js/local-db.js',
  '/js/onboarding.js',
  '/js/analytics.js',
  '/js/date-utils.js',
  '/js/pdf.js',
  '/js/intimacy.js',
  '/js/intimacy-sessions.js',
  '/js/intimacy-stats.js',
  '/js/intimacy-library.js',
  '/js/intimacy-tests.js',
  '/js/kinks.js',
  '/js/pin-lock.js',
  '/js/theme.js',
  '/js/symptoms.js',
  '/js/query-cache.js',
  '/js/collapse.js',
  '/js/cycle-model.js',
  '/js/ring-chart.js',
  '/js/daily-log-ui.js',  '/js/types.js',
  '/js/crypto-notes.js',
  '/js/insights.js',
  '/js/intimacy-heatmap.js',
  '/js/session-bridge.js',
  '/js/skeleton.js',
  '/js/clue-import.js',
  '/js/ui-feedback.js',
  '/js/pregnancy-milestones.js',
  '/js/lovelust-import.js',
  '/js/push.js',
  '/js/intimacy-calendar.js',
  '/js/position-suggestions.js',
  '/js/position-insights.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Push notification (envoyée depuis un serveur avec VAPID ou Supabase Edge Function)
self.addEventListener('push', e => {
  const data = e.data?.json() ?? {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'Notre cycle', {
      body:  data.body  || '',
      icon:  '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag:   data.tag   || 'notre-rythme',
      data:  { url: '/' },
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      const existing = cs.find(c => c.url.startsWith(self.location.origin));
      return existing ? existing.focus() : clients.openWindow('/');
    })
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Supabase API — toujours réseau
  if (url.hostname.includes('supabase.co') || url.hostname === 'esm.sh') {
    return;
  }

  // Navigation — retourner index.html depuis le cache (SPA)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match('/index.html').then(r => r || fetch(e.request))
    );
    return;
  }

  // Assets shell — cache first
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      if (res.ok && SHELL.includes(url.pathname)) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }))
  );
});
