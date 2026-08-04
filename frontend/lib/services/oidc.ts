import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { usernameFromClaims, type OidcClaims } from "@/lib/auth/oidc";

/**
 * Resolves an OIDC identity to a local user and returns a fresh session token.
 *
 * Matching order:
 *  1. `oidcSubject` — the durable link created on a previous SSO login.
 *  2. e-mail — links an existing local account the first time that person signs
 *     in through the provider, so nobody loses their vehicles by switching.
 *  3. create a new account (only when `allowSignup`).
 *
 * A disabled account is never signed in, whatever the provider says.
 */
export async function loginWithOidcClaims(
  claims: OidcClaims,
  options: { issuer: string; allowSignup: boolean },
): Promise<{ token: string }> {
  const linked = await prisma.user.findUnique({
    where: { oidcSubject: claims.sub },
  });

  if (linked) {
    if (!linked.isActive) throw new Error("ACCOUNT_DISABLED");
    // Re-stamp the issuer so moving to a different provider is visible.
    if (linked.oidcIssuer !== options.issuer) {
      await prisma.user.update({
        where: { id: linked.id },
        data: { oidcIssuer: options.issuer },
      });
    }
    return finishLogin(linked.id);
  }

  const email = claims.email?.trim().toLowerCase();
  if (email) {
    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      if (!byEmail.isActive) throw new Error("ACCOUNT_DISABLED");
      await prisma.user.update({
        where: { id: byEmail.id },
        data: { oidcSubject: claims.sub, oidcIssuer: options.issuer },
      });
      return finishLogin(byEmail.id);
    }
  }

  if (!options.allowSignup) throw new Error("OIDC_SIGNUP_DISABLED");

  const created = await createUserFromClaims(claims, options.issuer);
  return finishLogin(created.id);
}

async function createUserFromClaims(claims: OidcClaims, issuer: string) {
  const base = usernameFromClaims(claims);
  const username = await findFreeUsername(base);
  const email = claims.email?.trim().toLowerCase() || `${username}@smart-garage.local`;

  const userCount = await prisma.user.count();

  // SSO accounts never authenticate with a password. Storing a hash of random
  // bytes (rather than an empty string) means the password path can't be
  // tricked into matching anything.
  const passwordHash = await hashPassword(randomBytes(32).toString("hex"));

  return prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      displayName: claims.name?.trim() || username,
      role: userCount === 0 ? "ADMIN" : "USER",
      oidcSubject: claims.sub,
      oidcIssuer: issuer,
      preferences: { create: {} },
      notificationSettings: { create: {} },
    },
  });
}

async function findFreeUsername(base: string): Promise<string> {
  const existing = await prisma.user.findUnique({ where: { username: base } });
  if (!existing) return base;

  for (let suffix = 2; suffix < 100; suffix += 1) {
    const candidate = `${base.slice(0, 29)}-${suffix}`;
    const taken = await prisma.user.findUnique({ where: { username: candidate } });
    if (!taken) return candidate;
  }

  return `${base.slice(0, 24)}-${randomBytes(3).toString("hex")}`;
}

async function finishLogin(userId: string): Promise<{ token: string }> {
  const token = await createSession(userId, true);
  await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });
  return { token };
}
