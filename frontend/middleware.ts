import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./lib/i18n/routing";
import { isWellFormedSessionToken, SESSION_COOKIE } from "./lib/auth/session-token";

const intlMiddleware = createMiddleware(routing);

const PUBLIC_SUFFIXES = ["/login", "/register"];

/**
 * Cookie names this app has ever used for the session. Kept as a list (not a
 * single constant) so that if the cookie is ever renamed in a future release,
 * old-format cookies from a previous version can still be swept up here
 * instead of lingering forever in users' browsers.
 */
const LEGACY_SESSION_COOKIE_NAMES: string[] = [];

function stripLocale(pathname: string) {
  return pathname.replace(/^\/(de|en)/, "") || "/";
}

function isApiRoute(pathname: string) {
  return pathname.startsWith("/api/");
}

export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isApiRoute(pathname)) {
    return NextResponse.next();
  }

  const localeFree = stripLocale(pathname);
  const locale = pathname.match(/^\/(de|en)/)?.[1] ?? routing.defaultLocale;
  const isPublic = PUBLIC_SUFFIXES.some((suffix) => localeFree === suffix);

  const rawValue = request.cookies.get(SESSION_COOKIE)?.value;
  const hasCookie = Boolean(rawValue);
  // Middleware can't hit the database, but it can reject cookies that are
  // structurally impossible to be a real session token (wrong shape, corrupted,
  // JSON, from an older/incompatible app version, etc.) without ever reading them.
  const isMalformed = hasCookie && !isWellFormedSessionToken(rawValue);
  const hasValidLookingSession = hasCookie && !isMalformed;

  function cleanupCookies(response: NextResponse) {
    if (isMalformed) {
      response.cookies.delete(SESSION_COOKIE);
    }
    for (const legacyName of LEGACY_SESSION_COOKIE_NAMES) {
      if (request.cookies.get(legacyName)) {
        response.cookies.delete(legacyName);
      }
    }
    return response;
  }

  if (!isPublic && !hasValidLookingSession) {
    if (localeFree === "/register") {
      return cleanupCookies(intlMiddleware(request));
    }
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("from", pathname);
    return cleanupCookies(NextResponse.redirect(loginUrl));
  }

  if (localeFree === "/register" && hasValidLookingSession) {
    return cleanupCookies(NextResponse.redirect(new URL(`/${locale}`, request.url)));
  }

  return cleanupCookies(intlMiddleware(request));
}

export const config = {
  matcher: ["/", "/(de|en)/:path*"],
};
