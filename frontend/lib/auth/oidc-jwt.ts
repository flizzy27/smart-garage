import { createPublicKey, createVerify, type KeyObject } from "crypto";

/**
 * ID token verification (issue #5).
 *
 * The token is fetched over a direct TLS back channel with client
 * authentication, so the OIDC spec permits skipping signature validation.
 * Verifying anyway costs one cached JWKS fetch and closes the gap if a token
 * endpoint is ever reached over a compromised or misconfigured hop, so it is
 * done by default and can only be turned off deliberately.
 *
 * Only asymmetric algorithms are accepted. `alg: none` and the HMAC family are
 * rejected outright: `none` would let anyone mint claims, and HS* would verify
 * against the client secret, which is a well-known confusion attack.
 */

export type JsonWebKey = {
  kty: string;
  kid?: string;
  use?: string;
  alg?: string;
  n?: string;
  e?: string;
  crv?: string;
  x?: string;
  y?: string;
};

type JwtHeader = { alg?: string; kid?: string; typ?: string };

const SUPPORTED_ALGORITHMS: Record<
  string,
  { hash: string; keyType: "rsa" | "ec"; padding?: "pss" }
> = {
  RS256: { hash: "sha256", keyType: "rsa" },
  RS384: { hash: "sha384", keyType: "rsa" },
  RS512: { hash: "sha512", keyType: "rsa" },
  PS256: { hash: "sha256", keyType: "rsa", padding: "pss" },
  PS384: { hash: "sha384", keyType: "rsa", padding: "pss" },
  PS512: { hash: "sha512", keyType: "rsa", padding: "pss" },
  ES256: { hash: "sha256", keyType: "ec" },
  ES384: { hash: "sha384", keyType: "ec" },
  ES512: { hash: "sha512", keyType: "ec" },
};

const JWKS_TTL_MS = 10 * 60 * 1000;
/** How far a clock may drift before `exp` / `iat` are treated as invalid. */
const CLOCK_SKEW_SECONDS = 120;

let jwksCache: { uri: string; keys: JsonWebKey[]; fetchedAt: number } | null = null;

export function decodeJwtSegment<T>(segment: string): T | null {
  try {
    return JSON.parse(Buffer.from(segment, "base64url").toString("utf-8")) as T;
  } catch {
    return null;
  }
}

export function readJwtHeader(token: string): JwtHeader | null {
  const [header] = token.split(".");
  return header ? decodeJwtSegment<JwtHeader>(header) : null;
}

export async function fetchJwks(
  jwksUri: string,
  { force = false }: { force?: boolean } = {},
): Promise<JsonWebKey[]> {
  const now = Date.now();
  if (
    !force &&
    jwksCache &&
    jwksCache.uri === jwksUri &&
    now - jwksCache.fetchedAt < JWKS_TTL_MS
  ) {
    return jwksCache.keys;
  }

  const response = await fetch(jwksUri, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("OIDC_JWKS_FETCH_FAILED");

  const document = (await response.json()) as { keys?: JsonWebKey[] };
  const keys = Array.isArray(document.keys) ? document.keys : [];
  if (keys.length === 0) throw new Error("OIDC_JWKS_EMPTY");

  jwksCache = { uri: jwksUri, keys, fetchedAt: now };
  return keys;
}

/** Test seam — drops the cached key set. */
export function resetJwksCache(): void {
  jwksCache = null;
}

function selectKeys(keys: JsonWebKey[], header: JwtHeader): JsonWebKey[] {
  const usable = keys.filter((key) => key.use == null || key.use === "sig");
  // A `kid` is the normal case; without one, try every signing key.
  if (header.kid) {
    const exact = usable.filter((key) => key.kid === header.kid);
    if (exact.length > 0) return exact;
  }
  return usable;
}

function toKeyObject(key: JsonWebKey): KeyObject | null {
  try {
    // Node accepts a JWK directly, which avoids hand-rolling DER encoding.
    return createPublicKey({ key: key as never, format: "jwk" });
  } catch {
    return null;
  }
}

/** ES* signatures are raw r||s; Node's verifier wants that spelled out. */
function signatureFormatFor(keyType: "rsa" | "ec") {
  return keyType === "ec" ? ("ieee-p1363" as const) : undefined;
}

export type VerifiedIdToken<T> = { claims: T };

export async function verifyIdToken<T extends Record<string, unknown>>(
  token: string,
  options: {
    jwksUri: string;
    issuer: string;
    audience: string;
    now?: number;
  },
): Promise<VerifiedIdToken<T>> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("OIDC_ID_TOKEN_MALFORMED");

  const [headerSegment, payloadSegment, signatureSegment] = parts;
  const header = decodeJwtSegment<JwtHeader>(headerSegment);
  const claims = decodeJwtSegment<T & Record<string, unknown>>(payloadSegment);
  if (!header || !claims) throw new Error("OIDC_ID_TOKEN_MALFORMED");

  const algorithm = header.alg ? SUPPORTED_ALGORITHMS[header.alg] : undefined;
  if (!algorithm) throw new Error("OIDC_ID_TOKEN_ALG_UNSUPPORTED");

  const signingInput = Buffer.from(`${headerSegment}.${payloadSegment}`);
  const signature = Buffer.from(signatureSegment, "base64url");

  const verifyAgainst = async (force: boolean) => {
    const keys = selectKeys(await fetchJwks(options.jwksUri, { force }), header);
    return keys.some((jwk) => {
      const key = toKeyObject(jwk);
      if (!key) return false;
      if (algorithm.keyType === "rsa" && key.asymmetricKeyType !== "rsa") return false;
      if (algorithm.keyType === "ec" && key.asymmetricKeyType !== "ec") return false;

      const verifier = createVerify(algorithm.hash);
      verifier.update(signingInput);
      verifier.end();
      try {
        return verifier.verify(
          {
            key,
            dsaEncoding: signatureFormatFor(algorithm.keyType),
            ...(algorithm.padding === "pss"
              ? { padding: 6 /* RSA_PKCS1_PSS_PADDING */, saltLength: -1 /* DIGEST */ }
              : {}),
          },
          signature,
        );
      } catch {
        return false;
      }
    });
  };

  // Providers rotate keys; a miss is worth one forced refresh before failing.
  let verified = await verifyAgainst(false);
  if (!verified) verified = await verifyAgainst(true);
  if (!verified) throw new Error("OIDC_ID_TOKEN_SIGNATURE_INVALID");

  assertClaims(claims, options);
  return { claims: claims as T };
}

function assertClaims(
  claims: Record<string, unknown>,
  options: { issuer: string; audience: string; now?: number },
): void {
  const nowSeconds = Math.floor((options.now ?? Date.now()) / 1000);

  const issuer = typeof claims.iss === "string" ? claims.iss : null;
  if (!issuer || normalizeIssuer(issuer) !== normalizeIssuer(options.issuer)) {
    throw new Error("OIDC_ID_TOKEN_ISSUER_MISMATCH");
  }

  const audience = claims.aud;
  const audiences = Array.isArray(audience)
    ? audience.filter((entry): entry is string => typeof entry === "string")
    : typeof audience === "string"
      ? [audience]
      : [];
  if (!audiences.includes(options.audience)) {
    throw new Error("OIDC_ID_TOKEN_AUDIENCE_MISMATCH");
  }

  // With more than one audience the spec requires azp to name this client.
  if (audiences.length > 1) {
    const azp = typeof claims.azp === "string" ? claims.azp : null;
    if (azp !== options.audience) throw new Error("OIDC_ID_TOKEN_AUDIENCE_MISMATCH");
  }

  const exp = typeof claims.exp === "number" ? claims.exp : null;
  if (exp == null || nowSeconds > exp + CLOCK_SKEW_SECONDS) {
    throw new Error("OIDC_ID_TOKEN_EXPIRED");
  }

  const iat = typeof claims.iat === "number" ? claims.iat : null;
  if (iat != null && iat > nowSeconds + CLOCK_SKEW_SECONDS) {
    throw new Error("OIDC_ID_TOKEN_NOT_YET_VALID");
  }

  if (typeof claims.sub !== "string" || claims.sub.length === 0) {
    throw new Error("OIDC_NO_SUBJECT");
  }
}

function normalizeIssuer(value: string): string {
  return value.replace(/\/+$/, "");
}
