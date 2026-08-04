import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSign, generateKeyPairSync, type KeyObject } from "crypto";
import { resetJwksCache, readJwtHeader, verifyIdToken } from "@/lib/auth/oidc-jwt";

const ISSUER = "https://id.example.com";
const AUDIENCE = "smart-garage";
const JWKS_URI = "https://id.example.com/jwks";

function b64url(value: object | Buffer): string {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value));
  return buffer.toString("base64url");
}

type KeyPair = { publicKey: KeyObject; privateKey: KeyObject };

function rsaPair(): KeyPair {
  return generateKeyPairSync("rsa", { modulusLength: 2048 });
}

function ecPair(): KeyPair {
  return generateKeyPairSync("ec", { namedCurve: "P-256" });
}

function jwkFor(pair: KeyPair, kid: string) {
  return { ...pair.publicKey.export({ format: "jwk" }), kid, use: "sig" };
}

function sign(
  pair: KeyPair,
  {
    alg = "RS256",
    kid = "key-1",
    claims = {},
  }: { alg?: string; kid?: string; claims?: Record<string, unknown> } = {},
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url({ alg, kid, typ: "JWT" });
  const payload = b64url({
    iss: ISSUER,
    aud: AUDIENCE,
    sub: "user-1",
    email: "user@example.com",
    iat: now,
    exp: now + 300,
    ...claims,
  });

  const hash = alg.endsWith("384") ? "sha384" : alg.endsWith("512") ? "sha512" : "sha256";
  const signer = createSign(hash);
  signer.update(`${header}.${payload}`);
  signer.end();

  const signature = signer.sign({
    key: pair.privateKey,
    ...(alg.startsWith("ES") ? { dsaEncoding: "ieee-p1363" as const } : {}),
  });

  return `${header}.${payload}.${b64url(signature)}`;
}

function mockJwks(keys: object[]) {
  const fetchMock = vi.fn(async () =>
    new Response(JSON.stringify({ keys }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  resetJwksCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("verifyIdToken", () => {
  it("accepts a correctly signed RS256 token", async () => {
    const pair = rsaPair();
    mockJwks([jwkFor(pair, "key-1")]);

    const { claims } = await verifyIdToken<{ sub: string; email: string }>(
      sign(pair),
      { jwksUri: JWKS_URI, issuer: ISSUER, audience: AUDIENCE },
    );

    expect(claims.sub).toBe("user-1");
    expect(claims.email).toBe("user@example.com");
  });

  it("accepts an ES256 token", async () => {
    const pair = ecPair();
    mockJwks([jwkFor(pair, "key-1")]);

    const { claims } = await verifyIdToken<{ sub: string }>(
      sign(pair, { alg: "ES256" }),
      { jwksUri: JWKS_URI, issuer: ISSUER, audience: AUDIENCE },
    );

    expect(claims.sub).toBe("user-1");
  });

  it("rejects a token signed by a different key", async () => {
    const real = rsaPair();
    const attacker = rsaPair();
    mockJwks([jwkFor(real, "key-1")]);

    await expect(
      verifyIdToken(sign(attacker), {
        jwksUri: JWKS_URI,
        issuer: ISSUER,
        audience: AUDIENCE,
      }),
    ).rejects.toThrow("OIDC_ID_TOKEN_SIGNATURE_INVALID");
  });

  it("rejects alg: none outright", async () => {
    const pair = rsaPair();
    mockJwks([jwkFor(pair, "key-1")]);

    const header = b64url({ alg: "none", typ: "JWT" });
    const payload = b64url({ iss: ISSUER, aud: AUDIENCE, sub: "attacker" });

    await expect(
      verifyIdToken(`${header}.${payload}.`, {
        jwksUri: JWKS_URI,
        issuer: ISSUER,
        audience: AUDIENCE,
      }),
    ).rejects.toThrow("OIDC_ID_TOKEN_ALG_UNSUPPORTED");
  });

  it("rejects the HMAC family (key confusion)", async () => {
    const pair = rsaPair();
    mockJwks([jwkFor(pair, "key-1")]);

    const header = b64url({ alg: "HS256", typ: "JWT" });
    const payload = b64url({ iss: ISSUER, aud: AUDIENCE, sub: "attacker" });

    await expect(
      verifyIdToken(`${header}.${payload}.c2ln`, {
        jwksUri: JWKS_URI,
        issuer: ISSUER,
        audience: AUDIENCE,
      }),
    ).rejects.toThrow("OIDC_ID_TOKEN_ALG_UNSUPPORTED");
  });

  it("rejects a token from a different issuer", async () => {
    const pair = rsaPair();
    mockJwks([jwkFor(pair, "key-1")]);

    await expect(
      verifyIdToken(sign(pair, { claims: { iss: "https://evil.example.com" } }), {
        jwksUri: JWKS_URI,
        issuer: ISSUER,
        audience: AUDIENCE,
      }),
    ).rejects.toThrow("OIDC_ID_TOKEN_ISSUER_MISMATCH");
  });

  it("tolerates a trailing slash difference in the issuer", async () => {
    const pair = rsaPair();
    mockJwks([jwkFor(pair, "key-1")]);

    const { claims } = await verifyIdToken<{ sub: string }>(
      sign(pair, { claims: { iss: `${ISSUER}/` } }),
      { jwksUri: JWKS_URI, issuer: ISSUER, audience: AUDIENCE },
    );
    expect(claims.sub).toBe("user-1");
  });

  it("rejects a token issued for another client", async () => {
    const pair = rsaPair();
    mockJwks([jwkFor(pair, "key-1")]);

    await expect(
      verifyIdToken(sign(pair, { claims: { aud: "some-other-app" } }), {
        jwksUri: JWKS_URI,
        issuer: ISSUER,
        audience: AUDIENCE,
      }),
    ).rejects.toThrow("OIDC_ID_TOKEN_AUDIENCE_MISMATCH");
  });

  it("requires azp to name this client when there are several audiences", async () => {
    const pair = rsaPair();
    mockJwks([jwkFor(pair, "key-1")]);

    await expect(
      verifyIdToken(sign(pair, { claims: { aud: [AUDIENCE, "other"], azp: "other" } }), {
        jwksUri: JWKS_URI,
        issuer: ISSUER,
        audience: AUDIENCE,
      }),
    ).rejects.toThrow("OIDC_ID_TOKEN_AUDIENCE_MISMATCH");

    const { claims } = await verifyIdToken<{ sub: string }>(
      sign(pair, { claims: { aud: [AUDIENCE, "other"], azp: AUDIENCE } }),
      { jwksUri: JWKS_URI, issuer: ISSUER, audience: AUDIENCE },
    );
    expect(claims.sub).toBe("user-1");
  });

  it("rejects an expired token but allows small clock skew", async () => {
    const pair = rsaPair();
    mockJwks([jwkFor(pair, "key-1")]);
    const now = Math.floor(Date.now() / 1000);

    await expect(
      verifyIdToken(sign(pair, { claims: { exp: now - 3600 } }), {
        jwksUri: JWKS_URI,
        issuer: ISSUER,
        audience: AUDIENCE,
      }),
    ).rejects.toThrow("OIDC_ID_TOKEN_EXPIRED");

    // 30s past expiry is within the tolerated skew.
    const { claims } = await verifyIdToken<{ sub: string }>(
      sign(pair, { claims: { exp: now - 30 } }),
      { jwksUri: JWKS_URI, issuer: ISSUER, audience: AUDIENCE },
    );
    expect(claims.sub).toBe("user-1");
  });

  it("rejects a token dated far in the future", async () => {
    const pair = rsaPair();
    mockJwks([jwkFor(pair, "key-1")]);
    const now = Math.floor(Date.now() / 1000);

    await expect(
      verifyIdToken(sign(pair, { claims: { iat: now + 3600 } }), {
        jwksUri: JWKS_URI,
        issuer: ISSUER,
        audience: AUDIENCE,
      }),
    ).rejects.toThrow("OIDC_ID_TOKEN_NOT_YET_VALID");
  });

  it("rejects a malformed token", async () => {
    const pair = rsaPair();
    mockJwks([jwkFor(pair, "key-1")]);

    await expect(
      verifyIdToken("not-a-jwt", {
        jwksUri: JWKS_URI,
        issuer: ISSUER,
        audience: AUDIENCE,
      }),
    ).rejects.toThrow("OIDC_ID_TOKEN_MALFORMED");
  });

  it("refetches the key set once when the kid is unknown (rotation)", async () => {
    const pair = rsaPair();
    // First response has the wrong key, the refresh has the right one.
    let call = 0;
    const stale = rsaPair();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        call += 1;
        const keys = call === 1 ? [jwkFor(stale, "old")] : [jwkFor(pair, "new")];
        return new Response(JSON.stringify({ keys }), { status: 200 });
      }),
    );

    const { claims } = await verifyIdToken<{ sub: string }>(
      sign(pair, { kid: "new" }),
      { jwksUri: JWKS_URI, issuer: ISSUER, audience: AUDIENCE },
    );

    expect(claims.sub).toBe("user-1");
    expect(call).toBe(2);
  });

  it("caches the key set between verifications", async () => {
    const pair = rsaPair();
    const fetchMock = mockJwks([jwkFor(pair, "key-1")]);

    await verifyIdToken(sign(pair), {
      jwksUri: JWKS_URI,
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    await verifyIdToken(sign(pair), {
      jwksUri: JWKS_URI,
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("readJwtHeader", () => {
  it("reads alg and kid", () => {
    const header = readJwtHeader(`${b64url({ alg: "RS256", kid: "abc" })}.x.y`);
    expect(header).toEqual({ alg: "RS256", kid: "abc" });
  });

  it("returns null for junk", () => {
    expect(readJwtHeader("!!!.x.y")).toBeNull();
  });
});
