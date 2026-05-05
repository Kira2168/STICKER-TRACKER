/* Minimal service worker to satisfy PWA installability checks. */

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // No caching; just pass-through. Keeping it minimal avoids surprising behavior.
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request));
});
