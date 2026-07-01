import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/db/retry";
import {
  deleteSession,
  getSessionByToken,
  getSessionTokenFromCookies,
} from "@/lib/auth/session";

export type CurrentUser = Pick<
  User,
  "id" | "username" | "email" | "displayName" | "role" | "isActive"
>;

/**
 * Safe, low-cardinality logging for session/cookie problems. Never logs the
 * token value, cookie contents, or any user-identifying data — only the
 * reason and recovery action, so logs stay useful for debugging without
 * exposing secrets.
 */
function logSessionIssue(reason: string, extra?: Record<string, string>) {
  console.warn(`[auth] session rejected: ${reason}`, extra ?? {});
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = await getSessionTokenFromCookies();
  if (!token) return null;

  const session = await withDbRetry(() => getSessionByToken(token));
  if (!session) {
    // Well-formed token, but no matching row in the database — most likely a
    // stale cookie surviving a DB reset/restore, or an explicitly revoked
    // session. Treat as logged-out rather than crashing.
    logSessionIssue("no matching session in database (stale/orphaned cookie)");
    return null;
  }

  if (session.expiresAt < new Date()) {
    logSessionIssue("session expired, clearing");
    await deleteSession(token).catch(() => {
      // Best-effort cleanup; the cookie itself is cleared via recoverFromInvalidSession
      // the next time the client hits the auth error boundary.
    });
    return null;
  }

  if (!session.user.isActive) {
    logSessionIssue("session belongs to a deactivated user");
    return null;
  }

  return {
    id: session.user.id,
    username: session.user.username,
    email: session.user.email,
    displayName: session.user.displayName,
    role: session.user.role,
    isActive: session.user.isActive,
  };
}

export async function getCurrentUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) {
    logSessionIssue("rejected request: no valid session (UNAUTHORIZED)");
    throw new Error("UNAUTHORIZED");
  }
  return user.id;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    logSessionIssue("rejected request: admin required (FORBIDDEN)");
    throw new Error("FORBIDDEN");
  }
  return user;
}

export async function countUsers(): Promise<number> {
  return withDbRetry(() => prisma.user.count());
}

/** Returns null when the database is temporarily unavailable. */
export async function countUsersSafe(): Promise<number | null> {
  try {
    return await countUsers();
  } catch {
    return null;
  }
}
