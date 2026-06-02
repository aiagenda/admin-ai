// Service Worker for NoticeIQ PWA
// Cache version — increment when deploying breaking changes
const CACHE_VERSION = "noticeiq-v2";
const STATIC_CACHE = `${CACHE_VERSION}-static`;

const PRECACHE_URLS = [
  "/",
  "/upload",
  "/archive",
  "/help",
  "/pricing",
];

// ─── Install: pre-cache shell pages ─────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch((err) => console.warn("SW: pre-cache failed:", err))
  );
  // Activate immediately — don't wait for old tabs to close
  self.skipWaiting();
});

// ─── Activate: clean up old caches ──────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch: network-first for API, cache-first for assets ───────────────────
self.addEventListener("fetch", (event) => {
  // Only intercept GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Never cache: Supabase API, Edge Functions, OpenAI, Storage
  const BYPASS_PATTERNS = [
    "/rest/v1/",
    "/functions/v1/",
    "api.openai.com",
    "supabase.co/storage",
    "supabase.co/auth",
    "/auth/v1/",
  ];
  if (BYPASS_PATTERNS.some((p) => event.request.url.includes(p))) return;

  // For same-origin navigation: network-first, fallback to cache
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful responses for static assets
          if (response.ok && !url.pathname.startsWith("/api")) {
            const cloned = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, cloned));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
});
