import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { decodeJwtSegment, verifyIdToken } from "@/lib/auth/oidc-jwt";

/**
 * Optional OpenID Connect login (issue #5).
 *
 * Configured entirely through environment variables so a self-hoster sets it up
 * in the Unraid template without any in-app admin screen. When `OIDC_ISSUER`,
 * `OIDC_CLIENT_ID` and `OIDC_CLIENT_SECRET` are absent the feature is simply
 * off and nothing about the existing local login changes.
 *
 * Flow: authorization code + PKCE (S256). No implicit flow, no client-side
 * tokens — the code is exchanged server-side and only the app's own opaque
 * session cookie ever reaches the browser.
 */

export type OidcConfig = {
  issuer: string;
  clientId: string;
  clientSecret: string;
  scopes: string;
  /** Explicit redirect URI; derived from the request when unset. */
  redirectUri: string | null;
  /** Create a local account on first login instead of requiring a linked one. */
  allowSignup: boolean;
  /** Label on the login button. */
  buttonLabel: string;
  /** Verify the id_token signature against the provider's JWKS (default on). */
  verifyIdToken: boolean;
};

export type OidcDiscovery = {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  jwks_uri?: string;
  issuer: string;
};

export type OidcClaims = {
  sub: string;
  email?: string;
  preferred_username?: string;
  name?: string;
};

function env(name: string): string | null {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : null;
}

function envBool(name: string, fallback: boolean): boolean {
  const value = env(name)?.toLowerCase();
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return fallback;
}

export function getOidcConfig(): OidcConfig | null {
  const issuer = env("OIDC_ISSUER");
  const clientId = env("OIDC_CLIENT_ID");
  const clientSecret = env("OIDC_CLIENT_SECRET");

  if (!issuer || !clientId || !clientSecret) return null;

  return {
    issuer: issuer.replace(/\/+$/, ""),
    clientId,
    clientSecret,
    scopes: env("OIDC_SCOPES") ?? "openid profile email",
    redirectUri: env("OIDC_REDIRECT_URI"),
    // Default on: a homelab admin who wires up their own IdP expects the people
    // it vouches for to be able to sign in. Set OIDC_ALLOW_SIGNUP=false to
    // require that an account already exists.
    allowSignup: envBool("OIDC_ALLOW_SIGNUP", true),
    buttonLabel: env("OIDC_BUTTON_LABEL") ?? "Single Sign-On",
    verifyIdToken: envBool("OIDC_VERIFY_ID_TOKEN", true),
  };
}

export function isOidcEnabled(): boolean {
  return getOidcConfig() !== null;
}

let discoveryCache: { issuer: string; document: OidcDiscovery; fetchedAt: number } | null =
  null;

const DISCOVERY_TTL_MS = 10 * 60 * 1000;

export async function discoverOidc(config: OidcConfig): Promise<OidcDiscovery> {
  const now = Date.now();
  if (
    discoveryCache &&
    discoveryCache.issuer === config.issuer &&
    now - discoveryCache.fetchedAt < DISCOVERY_TTL_MS
  ) {
    return discoveryCache.document;
  }

  const url = `${config.issuer}/.well-known/openid-configuration`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error("OIDC_DISCOVERY_FAILED");
  }

  const document = (await response.json()) as OidcDiscovery;
  if (!document.authorization_endpoint || !document.token_endpoint) {
    throw new Error("OIDC_DISCOVERY_INCOMPLETE");
  }

  discoveryCache = { issuer: config.issuer, document, fetchedAt: now };
  return document;
}

function base64Url(buffer: Buffer): string {
  return buffer.toString("base64url");
}

export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = base64Url(randomBytes(48));
  const challenge = base64Url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function createStateToken(): string {
  return base64Url(randomBytes(24));
}

/** Constant-time comparison so a state check can't be probed byte by byte. */
export function safeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export function buildAuthorizationUrl(input: {
  discovery: OidcDiscovery;
  config: OidcConfig;
  redirectUri: string;
  state: string;
  challenge: string;
}): string {
  const url = new URL(input.discovery.authorization_endpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", input.config.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("scope", input.config.scopes);
  url.searchParams.set("state", input.state);
  url.searchParams.set("code_challenge", input.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export async function exchangeCodeForClaims(input: {
  discovery: OidcDiscovery;
  config: OidcConfig;
  code: string;
  verifier: string;
  redirectUri: string;
}): Promise<OidcClaims> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
    client_id: input.config.clientId,
    client_secret: input.config.clientSecret,
    code_verifier: input.verifier,
  });

  const response = await fetch(input.discovery.token_endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });

  if (!response.ok) {
    throw new Error("OIDC_TOKEN_EXCHANGE_FAILED");
  }

  const tokens = (await response.json()) as {
    id_token?: string;
    access_token?: string;
  };

  const claims = tokens.id_token
    ? await readIdTokenClaims(tokens.id_token, input.config, input.discovery)
    : null;

  if (claims?.sub && claims.email) return claims;

  // Some providers keep the id_token minimal; userinfo fills in the rest.
  if (input.discovery.userinfo_endpoint && tokens.access_token) {
    const userinfo = await fetchUserinfo(
      input.discovery.userinfo_endpoint,
      tokens.access_token,
    );
    // The subject from a verified id_token wins: userinfo is only fetched with
    // a bearer token and must not be able to rename who just signed in.
    if (userinfo?.sub && (claims == null || userinfo.sub === claims.sub)) {
      return { ...userinfo, ...claims };
    }
  }

  if (claims?.sub) return claims;
  throw new Error("OIDC_NO_SUBJECT");
}

/**
 * Verifies the id_token against the provider's JWKS and returns its claims.
 *
 * The token already arrived over an authenticated TLS back channel, which the
 * spec accepts on its own — but verifying costs one cached fetch and removes
 * the last place where a forged token would be believed. Set
 * `OIDC_VERIFY_ID_TOKEN=false` only if your provider publishes no usable JWKS;
 * the claims are then taken from the token as before.
 */
async function readIdTokenClaims(
  idToken: string,
  config: OidcConfig,
  discovery: OidcDiscovery,
): Promise<OidcClaims | null> {
  if (config.verifyIdToken && discovery.jwks_uri) {
    const { claims } = await verifyIdToken<OidcClaims & Record<string, unknown>>(
      idToken,
      {
        jwksUri: discovery.jwks_uri,
        issuer: discovery.issuer || config.issuer,
        audience: config.clientId,
      },
    );
    return claims;
  }

  const payload = idToken.split(".")[1];
  if (!payload) return null;
  const parsed = decodeJwtSegment<OidcClaims>(payload);
  return parsed && typeof parsed.sub === "string" ? parsed : null;
}

async function fetchUserinfo(
  endpoint: string,
  accessToken: string,
): Promise<OidcClaims | null> {
  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) return null;
  const parsed = (await response.json()) as OidcClaims;
  return typeof parsed.sub === "string" ? parsed : null;
}

/**
 * Where the provider sends the user back. Uses `OIDC_REDIRECT_URI` when set,
 * otherwise reconstructs it from the incoming request so a plain
 * `http://tower.local:3000` install works without extra configuration.
 */
export function resolveRedirectUri(
  config: OidcConfig,
  requestUrl: string,
  forwardedProto?: string | null,
  forwardedHost?: string | null,
): string {
  if (config.redirectUri) return config.redirectUri;

  const url = new URL(requestUrl);
  const proto = forwardedProto?.split(",")[0]?.trim() || url.protocol.replace(":", "");
  const host = forwardedHost?.split(",")[0]?.trim() || url.host;
  return `${proto}://${host}/api/auth/oidc/callback`;
}

/** Derives a valid local username from OIDC claims. */
export function usernameFromClaims(claims: OidcClaims): string {
  const candidate =
    claims.preferred_username ??
    claims.email?.split("@")[0] ??
    claims.name ??
    claims.sub;

  const normalized = candidate
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);

  // The local username rule is 3-32 chars of [a-zA-Z0-9_-]; pad a too-short
  // result rather than failing the login.
  return normalized.length >= 3 ? normalized : `sso-${normalized}`.slice(0, 32);
}
