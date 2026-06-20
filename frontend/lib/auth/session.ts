import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export const SESSION_COOKIE = "sg_session";

/** Short-lived session when "remember me" is off (browser session + server cap). */
const SESSION_HOURS = 12;
/** Persistent session when "remember me" is on. */
const REMEMBER_SESSION_DAYS = 90;

function addHours(date: Date, hours: number): Date {
  const next = new Date(date);
  next.setHours(next.getHours() + hours);
  return next;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function sessionExpiresAt(remember: boolean): Date {
  return remember
    ? addDays(new Date(), REMEMBER_SESSION_DAYS)
    : addHours(new Date(), SESSION_HOURS);
}

export async function createSession(
  userId: string,
  remember: boolean,
): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt: sessionExpiresAt(remember),
    },
  });
  return token;
}

export async function deleteSession(token: string) {
  await prisma.session.deleteMany({ where: { token } });
}

export async function getSessionByToken(token: string) {
  return prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
}

export async function getSessionTokenFromCookies(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
}

export async function setSessionCookie(token: string, remember: boolean) {
  const jar = await cookies();
  const base = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };

  if (remember) {
    jar.set(SESSION_COOKIE, token, {
      ...base,
      expires: sessionExpiresAt(true),
    });
  } else {
    // Session cookie — cleared when the browser closes.
    jar.set(SESSION_COOKIE, token, base);
  }
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
