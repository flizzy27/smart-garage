import type { MetadataRoute } from "next";

/**
 * Web App Manifest — enables "Add to Home Screen" / desktop install with a
 * standalone, app-like window. This is for local/self-hosted usability
 * (Unraid/Docker + reverse proxy access), not public SEO or store listing.
 *
 * `start_url` is "/" (not e.g. "/en/") on purpose: the middleware/next-intl
 * locale redirect already remembers the visitor's last-used locale via its
 * own cookie, so "/" always lands on the correct language without hardcoding
 * one here.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Smart Garage",
    short_name: "Smart Garage",
    description: "Self-hosted vehicle maintenance and garage management app",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    categories: ["utilities", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
