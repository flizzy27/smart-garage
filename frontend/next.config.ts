import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

const maxUploadMb = Number(process.env.MAX_UPLOAD_SIZE_MB ?? "25");

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      // Default Next.js limit is 1 MB — must match document upload size (MAX_UPLOAD_SIZE_MB).
      bodySizeLimit: `${maxUploadMb}mb`,
    },
  },
};

export default withNextIntl(nextConfig);
