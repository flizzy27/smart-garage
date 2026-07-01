/**
 * Pure, dependency-free session token helpers.
 *
 * Deliberately has ZERO imports (no `next/headers`, no Prisma, no Node
 * `crypto`) so it can be safely imported from `middleware.ts`, which runs in
 * the Edge runtime and cannot load the Prisma/SQLite client.
 */

export const SESSION_COOKIE = "sg_session";

/**
 * Session tokens are always 32 random bytes hex-encoded (see
 * `createSession` in `session.ts`). Any cookie value that doesn't match this
 * shape is structurally impossible to be a real session — corrupted,
 * truncated, JSON-injected, or from an unrelated app/version — and can be
 * rejected without a database round-trip.
 */
const SESSION_TOKEN_PATTERN = /^[0-9a-f]{64}$/;

export function isWellFormedSessionToken(
  value: string | undefined | null,
): value is string {
  return typeof value === "string" && SESSION_TOKEN_PATTERN.test(value);
}
