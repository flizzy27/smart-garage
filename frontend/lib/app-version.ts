import pkg from "../package.json";

/**
 * Single source of truth for the running app version (server-side).
 *
 * Prefers the `APP_VERSION` env var injected at container build time
 * (see Dockerfile `ARG APP_VERSION`), falling back to the version declared
 * in `package.json` for local dev. Bumping `package.json` is enough to move
 * every version display (sidebar, health endpoint, JSON export) forward — no
 * hardcoded version strings anywhere else.
 */
export const APP_VERSION: string = process.env.APP_VERSION?.trim() || pkg.version;
