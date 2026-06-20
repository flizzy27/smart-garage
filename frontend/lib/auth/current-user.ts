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

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = await getSessionTokenFromCookies();
  if (!token) return null;

  const session = await withDbRetry(() => getSessionByToken(token));
  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await deleteSession(token);
    return null;
  }

  if (!session.user.isActive) return null;

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
  if (!user) throw new Error("UNAUTHORIZED");
  return user.id;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
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
