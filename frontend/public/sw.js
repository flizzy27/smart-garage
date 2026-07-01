/**
 * Smart Garage — minimal, deliberately conservative service worker.
 *
 * Goal: unlock "Add to Home Screen" / install-on-desktop support in Chrome
 * and other browsers that require an active service worker with a `fetch`
 * handler as an installability signal — NOT to build an offline app.
 *
 * Safety rules (do not relax without re-reading AGENTS.md "Known pitfalls"):
 *   - Never intercept navigation requests (HTML documents) — every page load
 *     always goes to the network, so auth/session state and locale routing
 *     are always fresh and correct.
 *   - Never intercept `/api/*` — no caching of authenticated API responses,
 *     no stale maintenance/notes/vehicle data.
 *   - Only cache a small, explicit allow-list of same-origin static branding
 *     assets (manifest + PWA icons) that are safe to serve instantly and are
 *     re-validated in the background (stale-while-revalidate).
 *   - Every release bumps CACHE_VERSION; `activate` deletes any previously
 *     named cache so an Unraid/Docker update is never hidden behind a stale
 *     cache after the container restarts with a new image.
 */

const CACHE_VERSION = "v1";
const CACHE_NAME = `smart-garage-static-${CACHE_VERSION}`;

/**
 * Same-origin, unauthenticated, rarely-renamed static assets only.
 * "/icon.png" and "/apple-icon.png" are Next's file-convention icon routes
 * (served with a cache-busting query string in <head>, but the pathname
 * itself is stable) — matched below by pathname, ignoring the query string.
 */
const CACHEABLE_PATHS = [
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icon.png",
  "/apple-icon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CACHEABLE_PATHS))
      .catch(() => {
        // Missing asset shouldn't block installation of the service worker itself.
      }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("smart-garage-static-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isCacheableStaticAsset(request, url) {
  if (request.method !== "GET") return false;
  if (url.origin !== self.location.origin) return false;
  return CACHEABLE_PATHS.includes(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Anything else — navigations, /api/*, RSC payloads, _next assets, etc. —
  // is intentionally left untouched so the browser's normal network/HTTP
  // cache behavior applies. Not calling respondWith() here means this
  // service worker is fully transparent for those requests.
  if (!isCacheableStaticAsset(request, url)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached ?? networkFetch;
    }),
  );
});
