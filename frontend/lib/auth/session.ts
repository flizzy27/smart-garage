import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export const SESSION_COOKIE = "sg_session";

/**
 * Session cookie `Secure` flag.
 *
 * Default (unset): `false` — works on **both** `http://` (Unraid LAN) and `https://`
 * (reverse proxy). Browsers send non-Secure cookies on HTTPS too.
 *
 * Override only for HTTPS-only deployments: SESSION_COOKIE_SECURE=true
 */
export function sessionCookieSecure(requestProto?: string | null): boolean {
  const override = process.env.SESSION_COOKIE_SECURE?.trim().toLowerCase();
  if (override === "true" || override === "1") return true;
  if (override === "false" || override === "0") return false;

  // Optional auto: secure when the login request arrived over HTTPS (proxy header).
  if (override === "auto" && requestProto === "https") return true;

  return false;
}

function requestProtoFromHeaders(headerList: Headers): string | null {
  const forwarded = headerList.get("x-forwarded-proto");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim().toLowerCase() ?? null;
  }
  const forwardedSsl = headerList.get("x-forwarded-ssl");
  if (forwardedSsl === "on") return "https";
  return null;
}

export async function sessionCookieOptions() {
  const headerList = await headers();
  const proto = requestProtoFromHeaders(headerList);
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: sessionCookieSecure(proto),
    path: "/",
  };
}

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
  const base = await sessionCookieOptions();

  if (remember) {
    jar.set(SESSION_COOKIE, token, {
      ...base,
      expires: sessionExpiresAt(true),
    });
  } else {
    jar.set(SESSION_COOKIE, token, base);
  }
}

export async function clearSessionCookie() {
  const jar = await cookies();
  const base = { name: SESSION_COOKIE, path: "/", httpOnly: true, sameSite: "lax" as const };
  // Clear both variants in case the user switched between HTTP and HTTPS access.
  jar.delete({ ...base, secure: false });
  jar.delete({ ...base, secure: true });
}
