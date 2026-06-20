import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./lib/i18n/routing";

const intlMiddleware = createMiddleware(routing);
const SESSION_COOKIE = "sg_session";

const PUBLIC_SUFFIXES = ["/login", "/register"];

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

  const isPublic =
    PUBLIC_SUFFIXES.some((suffix) => localeFree === suffix);

  if (!isPublic) {
    const session = request.cookies.get(SESSION_COOKIE);
    if (!session?.value) {
      if (localeFree === "/register") {
        return intlMiddleware(request);
      }
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (localeFree === "/register") {
    const session = request.cookies.get(SESSION_COOKIE);
    if (session?.value) {
      return NextResponse.redirect(new URL(`/${locale}`, request.url));
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/", "/(de|en)/:path*"],
};
