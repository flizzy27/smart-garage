import type { MetadataRoute } from "next";

/**
 * Web App Manifest — enables "Add to Home Screen" with a standalone,
 * app-like window on phones. This is for local/self-hosted usability,
 * not public SEO or store distribution.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Smart Garage",
    short_name: "Garage",
    description: "Self-hosted vehicle management and maintenance tracking",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/brand/smart-garage-logo.png",
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/smart-garage-logo.png",
        sizes: "any",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
