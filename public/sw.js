// LifeOS service worker — minimal, on purpose.
//
// LifeOS is a server/DB-backed personal app (DECISIONS.md: "the database is the source of
// truth"), not an offline-first one. This worker exists mainly to satisfy PWA installability
// and to smooth over flaky connections — it does NOT attempt full offline data sync, request
// queuing, or background sync. /api/* and any non-GET request always go straight to the
// network, untouched, so data is never served stale.
//
// Bump CACHE_NAME when this file's caching logic changes; the old cache is cleaned up on
// activate.
const CACHE_NAME = "lifeos-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  );
});

// Web Push (lib/notifications/push.ts). Payload is JSON: { title, body?, url? } — see
// lib/notifications/service.ts createNotification. Purely additive to the caching logic
// above; doesn't touch CACHE_NAME or the fetch handler.
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/pwa-icon-192",
      badge: "/pwa-icon-192",
      data: { url: payload.url ?? "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = clientsList.find((client) => new URL(client.url).origin === self.location.origin);
      if (existing) {
        await existing.focus();
        existing.navigate(url);
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never intercept mutations or API calls — those must always hit the live server.
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    // Page loads: network-first, so you always get the current page when online; cached
    // shell as a fallback if the connection drops mid-session.
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
          return response;
        } catch {
          const cached = await caches.match(request);
          return cached ?? Response.error();
        }
      })(),
    );
    return;
  }

  // Static assets (JS/CSS/images/fonts, including Next's content-hashed build output):
  // cache-first, since a hashed filename never changes meaning once fetched.
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
      }
      return response;
    })(),
  );
});
