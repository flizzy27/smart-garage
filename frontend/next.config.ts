import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import pkg from "./package.json";
import fs from "fs";
import path from "path";

type ProcessWithLoadEnvFile = typeof process & {
  loadEnvFile?: (path: string) => void;
};

// Load environment variables for APP_ENV if set
const appEnv = process.env.APP_ENV;
if (appEnv) {
  const envFileName = `.env.${appEnv}`;

  let rootDir = process.cwd();
  let frontendDir = path.resolve(rootDir, "frontend");

  if (!fs.existsSync(path.resolve(rootDir, "docker-compose.yml")) && fs.existsSync(path.resolve(rootDir, "..", "docker-compose.yml"))) {
    rootDir = path.resolve(rootDir, "..");
    frontendDir = process.cwd();
  }

  const workspaceRootEnvFile = path.resolve(rootDir, envFileName);
  const frontendEnvFile = path.resolve(frontendDir, envFileName);

  let targetEnvPath = "";
  if (fs.existsSync(workspaceRootEnvFile)) {
    targetEnvPath = workspaceRootEnvFile;
  } else if (fs.existsSync(frontendEnvFile)) {
    targetEnvPath = frontendEnvFile;
  }

  if (targetEnvPath) {
    try {
      const processWithEnvFile = process as ProcessWithLoadEnvFile;
      if (typeof processWithEnvFile.loadEnvFile === "function") {
        processWithEnvFile.loadEnvFile(targetEnvPath);
      } else {
        throw new Error("process.loadEnvFile is not a function");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Warning: Failed to load environment file ${targetEnvPath}: ${message}`);
    }
  } else {
    console.warn(`Warning: Environment file ${envFileName} not found at workspace root or frontend directory.`);
  }
}

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  // Exposed to the client bundle so the sidebar can show the current version.
  // Sourced from package.json (single source of truth) — bump the version there
  // and the displayed version follows automatically on the next build.
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  outputFileTracingExcludes: {
    "*": ["./prisma.config.ts"],
  },
  images: {
    remotePatterns: [],
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  webpack: (config, { isServer: _isServer }) => {
    return config;
  },
};

export default withNextIntl(nextConfig);
