const APP_VERSION = '2026.07.01';
const CACHE = `notre-rythme-shell-${APP_VERSION}`;
const CACHE_PREFIX = 'notre-rythme-';
const SHELL = [
  '/',
  '/index.html',
  '/css/app.css',
  '/js/app.js',
  '/js/intimacy-session-options.js',
  '/js/session-wizard.js',
  '/js/intimacy-position-ratings.js',
  '/js/intimacy-fast-track.js',
  '/js/intimacy-feedback.js',
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
  '/js/daily-log-ui.js',
  '/js/types.js',
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
  '/js/cycle-coaching.js',
  '/js/labels.js',
  '/js/today-ring-cycle.js',
  '/js/today-metrics.js',
  '/js/today-events.js',
  '/js/today-predictions.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    precacheShell()
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE)
        .map(k => caches.delete(k)))
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

  if (e.request.method !== 'GET') {
    return;
  }

  // Supabase API — toujours réseau
  if (url.hostname.includes('supabase.co') || url.hostname === 'esm.sh') {
    return;
  }

  // Navigation — réseau d'abord pour éviter de rester bloqué sur un vieux shell.
  if (e.request.mode === 'navigate') {
    e.respondWith(networkFirst(e.request, '/index.html'));
    return;
  }

  // Assets shell — réponse cache immédiate, mise à jour réseau en arrière-plan.
  if (SHELL.includes(url.pathname)) {
    e.respondWith(staleWhileRevalidate(e.request));
  }
});

async function networkFirst(request, fallbackPath) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh.ok) cache.put(fallbackPath, fresh.clone());
    return fresh;
  } catch (_) {
    return (await caches.match(fallbackPath)) || caches.match('/index.html');
  }
}

async function precacheShell() {
  const cache = await caches.open(CACHE);
  await Promise.all(SHELL.map(async path => {
    try {
      const res = await fetch(path, { cache: 'reload' });
      if (res.ok) await cache.put(path, res);
    } catch (_) {}
  }));
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const fresh = fetch(request).then(res => {
    if (res.ok) cache.put(request, res.clone());
    return res;
  });
  if (cached) {
    fresh.catch(() => {});
    return cached;
  }
  return fresh;
}
