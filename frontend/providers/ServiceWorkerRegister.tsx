"use client";

import { useEffect } from "react";

/**
 * Registers the static-asset-only service worker (see public/sw.js).
 * Production-only: a service worker in the Next.js dev server would cache
 * hashed dev bundles and can cause confusing stale-module issues while
 * iterating locally, with no install-related benefit in dev.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Non-fatal — the app is fully functional without a service worker,
      // it just won't be installable in browsers that require one.
    });
  }, []);

  return null;
}
