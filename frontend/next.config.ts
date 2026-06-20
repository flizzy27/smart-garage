import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      // Hard cap at build time; actual limit enforced at runtime via MAX_UPLOAD_SIZE_MB in upload handlers.
      bodySizeLimit: "100mb",
    },
  },
};

export default withNextIntl(nextConfig);
