import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  discoverOidc,
  exchangeCodeForClaims,
  getOidcConfig,
  resolveRedirectUri,
  safeEquals,
} from "@/lib/auth/oidc";
import { sessionCookieOptions, setSessionCookie } from "@/lib/auth/session";
import { loginWithOidcClaims } from "@/lib/services/oidc";
import {
  OIDC_NEXT_COOKIE,
  OIDC_STATE_COOKIE,
  OIDC_VERIFIER_COOKIE,
} from "@/lib/auth/oidc-cookies";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function localeFromPath(path: string | undefined): string {
  const match = path?.match(/^\/(de|en)(\/|$)/);
  return match?.[1] ?? "en";
}

async function clearTransactionCookies() {
  const jar = await cookies();
  const base = await sessionCookieOptions();
  for (const name of [OIDC_STATE_COOKIE, OIDC_VERIFIER_COOKIE, OIDC_NEXT_COOKIE]) {
    jar.set(name, "", { ...base, maxAge: 0 });
  }
}

export async function GET(request: Request) {
  const config = getOidcConfig();
  if (!config) {
    return NextResponse.json({ error: "OIDC_NOT_CONFIGURED" }, { status: 404 });
  }

  const url = new URL(request.url);
  const jar = await cookies();
  const nextPath = jar.get(OIDC_NEXT_COOKIE)?.value;
  const locale = localeFromPath(nextPath);

  const failure = (reason: string) => {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("error", reason);
    return NextResponse.redirect(loginUrl);
  };

  try {
    // The provider itself reported a problem (user cancelled, consent denied…).
    if (url.searchParams.get("error")) return failure("oidc");

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const expectedState = jar.get(OIDC_STATE_COOKIE)?.value;
    const verifier = jar.get(OIDC_VERIFIER_COOKIE)?.value;

    if (!code || !state || !expectedState || !verifier) return failure("oidc");
    // CSRF guard: the state must be the exact one this browser started with.
    if (!safeEquals(state, expectedState)) return failure("oidc");

    const discovery = await discoverOidc(config);
    const redirectUri = resolveRedirectUri(
      config,
      request.url,
      request.headers.get("x-forwarded-proto"),
      request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
    );

    const claims = await exchangeCodeForClaims({
      discovery,
      config,
      code,
      verifier,
      redirectUri,
    });

    const { token } = await loginWithOidcClaims(claims, {
      issuer: discovery.issuer || config.issuer,
      allowSignup: config.allowSignup,
    });

    await setSessionCookie(token, true);

    const destination =
      nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
        ? nextPath
        : `/${locale}`;

    return NextResponse.redirect(new URL(destination, request.url));
  } catch (error) {
    if (error instanceof Error && error.message === "ACCOUNT_DISABLED") {
      return failure("accountDisabled");
    }
    if (error instanceof Error && error.message === "OIDC_SIGNUP_DISABLED") {
      return failure("oidcSignupDisabled");
    }
    return failure("oidc");
  } finally {
    // Always burn the one-time state/verifier, success or not.
    await clearTransactionCookies();
  }
}
