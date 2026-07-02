import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import pkg from "./package.json";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  // Exposed to the client bundle so the sidebar can show the current version.
  // Sourced from package.json (single source of truth) — bump the version there
  // and the displayed version follows automatically on the next build.
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  outputFileTracingExcludes: {
    "*": ["./prisma.config.ts"],
  },
  experimental: {
    serverActions: {
      // Hard cap at build time; actual limit enforced at runtime via MAX_UPLOAD_SIZE_MB in upload handlers.
      bodySizeLimit: "100mb",
    },
  },
};

export default withNextIntl(nextConfig);
