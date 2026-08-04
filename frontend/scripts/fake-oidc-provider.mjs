/**
 * Minimal stand-in OpenID Connect provider for exercising the login flow
 * locally (issue #5). It implements just enough of the spec to drive the app:
 * discovery, an authorization endpoint that redirects straight back with a
 * code, and a token endpoint that returns an unsigned id_token.
 *
 * NOT a real IdP and not used by the app at runtime — it exists so the OIDC
 * path can be verified without standing up Pocket ID or Keycloak.
 *
 *   node scripts/fake-oidc-provider.mjs [port]
 */
import { createServer } from "node:http";

const port = Number(process.argv[2] ?? 9099);
const issuer = `http://localhost:${port}`;

const codes = new Map();

function base64url(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function idTokenFor(sub) {
  const header = base64url({ alg: "none", typ: "JWT" });
  const payload = base64url({
    iss: issuer,
    aud: "smart-garage",
    sub,
    email: `${sub}@example.com`,
    preferred_username: sub,
    name: "SSO Test User",
    exp: Math.floor(Date.now() / 1000) + 300,
  });
  return `${header}.${payload}.`;
}

const server = createServer((req, res) => {
  const url = new URL(req.url, issuer);

  if (url.pathname === "/.well-known/openid-configuration") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        issuer,
        authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/token`,
        userinfo_endpoint: `${issuer}/userinfo`,
      }),
    );
    return;
  }

  if (url.pathname === "/authorize") {
    const redirectUri = url.searchParams.get("redirect_uri");
    const state = url.searchParams.get("state");
    const challenge = url.searchParams.get("code_challenge");
    const method = url.searchParams.get("code_challenge_method");

    if (!redirectUri || !state || !challenge || method !== "S256") {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("missing PKCE/state parameters");
      return;
    }

    const code = `code-${Math.random().toString(36).slice(2)}`;
    codes.set(code, { challenge, sub: process.env.FAKE_OIDC_SUB ?? "ssouser" });

    const back = new URL(redirectUri);
    back.searchParams.set("code", code);
    back.searchParams.set("state", state);
    res.writeHead(302, { Location: back.toString() });
    res.end();
    return;
  }

  if (url.pathname === "/token" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const params = new URLSearchParams(body);
      const record = codes.get(params.get("code") ?? "");
      if (!record) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "invalid_grant" }));
        return;
      }
      codes.delete(params.get("code"));

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          access_token: "access-token",
          token_type: "Bearer",
          id_token: idTokenFor(record.sub),
        }),
      );
    });
    return;
  }

  if (url.pathname === "/userinfo") {
    const sub = process.env.FAKE_OIDC_SUB ?? "ssouser";
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        sub,
        email: `${sub}@example.com`,
        preferred_username: sub,
        name: "SSO Test User",
      }),
    );
    return;
  }

  res.writeHead(404).end();
});

server.listen(port, () => {
  console.log(`[fake-oidc] listening on ${issuer}`);
});
