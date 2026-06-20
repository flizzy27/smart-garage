import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  clearSessionCookie,
  createSession,
  deleteSession,
  getSessionTokenFromCookies,
  setSessionCookie,
} from "@/lib/auth/session";
import { countUsers } from "@/lib/auth/current-user";

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,32}$/;

function internalEmail(username: string) {
  return `${username.toLowerCase()}@smart-garage.local`;
}

export async function registerUser(input: {
  username: string;
  password: string;
  displayName?: string;
}) {
  const username = input.username.trim().toLowerCase();
  if (!USERNAME_RE.test(username)) {
    throw new Error("INVALID_USERNAME");
  }
  if (input.password.length < 8) {
    throw new Error("PASSWORD_TOO_SHORT");
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) throw new Error("USERNAME_TAKEN");

  const userCount = await countUsers();
  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      username,
      email: internalEmail(username),
      passwordHash,
      displayName: input.displayName?.trim() || username,
      role: userCount === 0 ? "ADMIN" : "USER",
      preferences: {
        create: {},
      },
      notificationSettings: {
        create: {},
      },
    },
  });

  const token = await createSession(user.id, true);
  await setSessionCookie(token, true);
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return user;
}

export async function loginUser(input: {
  username: string;
  password: string;
  rememberMe?: boolean;
}) {
  const username = input.username.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.isActive) throw new Error("INVALID_CREDENTIALS");

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) throw new Error("INVALID_CREDENTIALS");

  const remember = input.rememberMe === true;
  const token = await createSession(user.id, remember);
  await setSessionCookie(token, remember);
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return user;
}

export async function logoutUser() {
  const token = await getSessionTokenFromCookies();
  if (token) {
    await deleteSession(token);
  }
  await clearSessionCookie();
}

export async function listUsersForAdmin() {
  return prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      isActive: true,
      createdAt: true,
      lastLoginAt: true,
      _count: { select: { vehicles: true } },
    },
  });
}

export async function setUserActive(userId: string, isActive: boolean) {
  return prisma.user.update({
    where: { id: userId },
    data: { isActive },
  });
}

export async function createUserByAdmin(input: {
  username: string;
  password: string;
  displayName?: string;
}) {
  const username = input.username.trim().toLowerCase();
  if (!/^[a-zA-Z0-9_-]{3,32}$/.test(username)) {
    throw new Error("INVALID_USERNAME");
  }
  if (input.password.length < 8) {
    throw new Error("PASSWORD_TOO_SHORT");
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) throw new Error("USERNAME_TAKEN");

  const passwordHash = await hashPassword(input.password);

  return prisma.user.create({
    data: {
      username,
      email: internalEmail(username),
      passwordHash,
      displayName: input.displayName?.trim() || username,
      role: "USER",
      preferences: { create: {} },
      notificationSettings: { create: {} },
    },
  });
}
