import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  buildAuthorizationUrl,
  createPkcePair,
  createStateToken,
  discoverOidc,
  getOidcConfig,
  resolveRedirectUri,
} from "@/lib/auth/oidc";
import { sessionCookieOptions } from "@/lib/auth/session";
import {
  OIDC_NEXT_COOKIE,
  OIDC_STATE_COOKIE,
  OIDC_VERIFIER_COOKIE,
  OIDC_TRANSACTION_MAX_AGE_SECONDS,
} from "@/lib/auth/oidc-cookies";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Begins the OIDC login: stores the PKCE verifier + state, then redirects. */
export async function GET(request: Request) {
  const config = getOidcConfig();
  if (!config) {
    return NextResponse.json({ error: "OIDC_NOT_CONFIGURED" }, { status: 404 });
  }

  try {
    const discovery = await discoverOidc(config);
    const { verifier, challenge } = createPkcePair();
    const state = createStateToken();

    const headers = request.headers;
    const redirectUri = resolveRedirectUri(
      config,
      request.url,
      headers.get("x-forwarded-proto"),
      headers.get("x-forwarded-host") ?? headers.get("host"),
    );

    const authorizationUrl = buildAuthorizationUrl({
      discovery,
      config,
      redirectUri,
      state,
      challenge,
    });

    const jar = await cookies();
    const base = await sessionCookieOptions();
    const transaction = { ...base, maxAge: OIDC_TRANSACTION_MAX_AGE_SECONDS };

    jar.set(OIDC_STATE_COOKIE, state, transaction);
    jar.set(OIDC_VERIFIER_COOKIE, verifier, transaction);

    // Remember where the user wanted to go, but only as a local path so the
    // parameter can't be used to bounce someone to an external site.
    const requested = new URL(request.url).searchParams.get("next");
    if (requested && requested.startsWith("/") && !requested.startsWith("//")) {
      jar.set(OIDC_NEXT_COOKIE, requested, transaction);
    }

    return NextResponse.redirect(authorizationUrl);
  } catch {
    const locale = new URL(request.url).searchParams.get("locale") ?? "en";
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("error", "oidc");
    return NextResponse.redirect(loginUrl);
  }
}
