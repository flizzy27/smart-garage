import { describe, expect, it } from "vitest";
import {
  createPkcePair,
  createStateToken,
  getOidcConfig,
  resolveRedirectUri,
  safeEquals,
  usernameFromClaims,
} from "@/lib/auth/oidc";

function withEnv<T>(vars: Record<string, string | undefined>, run: () => T): T {
  const previous: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(vars)) {
    previous[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

const FULL_CONFIG = {
  OIDC_ISSUER: "https://id.example.com/",
  OIDC_CLIENT_ID: "smart-garage",
  OIDC_CLIENT_SECRET: "secret",
};

describe("getOidcConfig", () => {
  it("is disabled unless issuer, client id and secret are all set", () => {
    expect(
      withEnv(
        { ...FULL_CONFIG, OIDC_CLIENT_SECRET: undefined },
        () => getOidcConfig(),
      ),
    ).toBeNull();

    expect(
      withEnv({ ...FULL_CONFIG, OIDC_ISSUER: undefined }, () => getOidcConfig()),
    ).toBeNull();
  });

  it("treats blank values as unset", () => {
    expect(
      withEnv({ ...FULL_CONFIG, OIDC_CLIENT_ID: "   " }, () => getOidcConfig()),
    ).toBeNull();
  });

  it("normalises the issuer and applies defaults", () => {
    const config = withEnv(
      { ...FULL_CONFIG, OIDC_SCOPES: undefined, OIDC_ALLOW_SIGNUP: undefined },
      () => getOidcConfig(),
    );

    expect(config?.issuer).toBe("https://id.example.com");
    expect(config?.scopes).toBe("openid profile email");
    expect(config?.allowSignup).toBe(true);
  });

  it("honours OIDC_ALLOW_SIGNUP=false", () => {
    const config = withEnv(
      { ...FULL_CONFIG, OIDC_ALLOW_SIGNUP: "false" },
      () => getOidcConfig(),
    );
    expect(config?.allowSignup).toBe(false);
  });

  it("verifies the id_token signature unless explicitly switched off", () => {
    expect(
      withEnv({ ...FULL_CONFIG, OIDC_VERIFY_ID_TOKEN: undefined }, () =>
        getOidcConfig(),
      )?.verifyIdToken,
    ).toBe(true);

    expect(
      withEnv({ ...FULL_CONFIG, OIDC_VERIFY_ID_TOKEN: "false" }, () =>
        getOidcConfig(),
      )?.verifyIdToken,
    ).toBe(false);
  });
});

describe("PKCE and state", () => {
  it("produces a fresh verifier and challenge each time", () => {
    const first = createPkcePair();
    const second = createPkcePair();

    expect(first.verifier).not.toBe(second.verifier);
    expect(first.challenge).not.toBe(second.challenge);
    // base64url: no padding or characters that would need escaping in a URL.
    expect(first.challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(createStateToken()).not.toBe(createStateToken());
  });
});

describe("safeEquals", () => {
  it("matches identical values and rejects everything else", () => {
    expect(safeEquals("abc", "abc")).toBe(true);
    expect(safeEquals("abc", "abd")).toBe(false);
    expect(safeEquals("abc", "abcd")).toBe(false);
    expect(safeEquals("", "")).toBe(true);
  });
});

describe("resolveRedirectUri", () => {
  const base = {
    issuer: "https://id.example.com",
    clientId: "id",
    clientSecret: "secret",
    scopes: "openid",
    allowSignup: true,
    buttonLabel: "SSO",
    verifyIdToken: true,
  };

  it("prefers an explicitly configured redirect uri", () => {
    const uri = resolveRedirectUri(
      { ...base, redirectUri: "https://garage.example.com/api/auth/oidc/callback" },
      "http://10.0.0.5:3000/api/auth/oidc/start",
    );
    expect(uri).toBe("https://garage.example.com/api/auth/oidc/callback");
  });

  it("derives one from the request for a plain LAN install", () => {
    const uri = resolveRedirectUri(
      { ...base, redirectUri: null },
      "http://tower.local:3000/api/auth/oidc/start?locale=en",
    );
    expect(uri).toBe("http://tower.local:3000/api/auth/oidc/callback");
  });

  it("respects reverse-proxy forwarding headers", () => {
    const uri = resolveRedirectUri(
      { ...base, redirectUri: null },
      "http://127.0.0.1:3000/api/auth/oidc/start",
      "https",
      "garage.example.com",
    );
    expect(uri).toBe("https://garage.example.com/api/auth/oidc/callback");
  });

  it("uses only the first entry of a forwarded header chain", () => {
    const uri = resolveRedirectUri(
      { ...base, redirectUri: null },
      "http://127.0.0.1:3000/api/auth/oidc/start",
      "https, http",
      "garage.example.com, internal",
    );
    expect(uri).toBe("https://garage.example.com/api/auth/oidc/callback");
  });
});

describe("usernameFromClaims", () => {
  it("prefers preferred_username", () => {
    expect(
      usernameFromClaims({ sub: "1", preferred_username: "Marcel", email: "m@x.de" }),
    ).toBe("marcel");
  });

  it("falls back to the local part of the e-mail", () => {
    expect(usernameFromClaims({ sub: "1", email: "First.Last@example.com" })).toBe(
      "first-last",
    );
  });

  it("strips characters the local username rule rejects", () => {
    expect(usernameFromClaims({ sub: "1", preferred_username: "a b!c@d" })).toBe(
      "a-b-c-d",
    );
  });

  it("pads a result that would be too short to be a valid username", () => {
    expect(usernameFromClaims({ sub: "1", preferred_username: "jo" }).length,
    ).toBeGreaterThanOrEqual(3);
  });

  it("never exceeds the 32 character limit", () => {
    const long = "a".repeat(80);
    expect(usernameFromClaims({ sub: "1", preferred_username: long }).length).toBe(32);
  });
});
