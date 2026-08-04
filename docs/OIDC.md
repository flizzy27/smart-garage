# Single sign-on (OpenID Connect)

Smart Garage can hand login over to your own identity provider — **Pocket ID**,
Authentik, Authelia, Keycloak, Zitadel, or anything else that speaks OpenID
Connect.

This is **optional**. Leave the variables unset and nothing changes: the normal
username and password form is all you get.

## Setup

### 1. Register the app with your provider

Create a new OIDC client (confidential / with a client secret) and set the
redirect URI to:

```
http://<your-server>:<port>/api/auth/oidc/callback
```

Behind a reverse proxy, use the public URL instead:

```
https://garage.example.com/api/auth/oidc/callback
```

Requested scopes: `openid profile email`.

### 2. Add the variables to the container

On Unraid: **Docker → smart-garage → Edit → Add another Path, Port, Variable…**
Add each of these as a *Variable*.

| Variable | Required | Description |
|----------|----------|-------------|
| `OIDC_ISSUER` | yes | Base URL of your provider, e.g. `https://id.example.com`. Smart Garage reads `<issuer>/.well-known/openid-configuration`. |
| `OIDC_CLIENT_ID` | yes | Client ID from your provider |
| `OIDC_CLIENT_SECRET` | yes | Client secret from your provider |
| `OIDC_BUTTON_LABEL` | no | Text on the login button (default `Single Sign-On`) |
| `OIDC_REDIRECT_URI` | no | Override the callback URL. Only needed if the URL the browser uses differs from what the container sees and your proxy does not send `X-Forwarded-Proto` / `X-Forwarded-Host`. |
| `OIDC_SCOPES` | no | Default `openid profile email` |
| `OIDC_ALLOW_SIGNUP` | no | `true` (default) creates an account on first login. Set to `false` to only allow people who already have one. |
| `OIDC_VERIFY_ID_TOKEN` | no | `true` (default) verifies the ID token signature against your provider's JWKS. Only set to `false` if your provider publishes no usable key set. |

Restart the container. A **Sign in with …** button appears above the login form.

`docker-compose` equivalent:

```yaml
environment:
  OIDC_ISSUER: https://id.example.com
  OIDC_CLIENT_ID: smart-garage
  OIDC_CLIENT_SECRET: your-secret
  OIDC_BUTTON_LABEL: Pocket ID
```

## How accounts are matched

When someone signs in through your provider, Smart Garage looks for a local
account in this order:

1. **A previously linked account** — matched on the provider's `sub` claim. This
   link survives a username or e-mail change on the provider side.
2. **An existing account with the same e-mail address** — linked automatically on
   the first SSO login, so you keep your vehicles when you switch from a password
   to SSO.
3. **A new account** — created from the provider's claims, unless
   `OIDC_ALLOW_SIGNUP=false`.

The **first account on a fresh install becomes the administrator**, whether it is
created by SSO or by registering with a password.

Deactivated accounts stay locked out no matter what the provider says.

## Notes on security

- Authorization code flow with **PKCE (S256)** — no tokens ever touch the
  browser, only Smart Garage's own opaque session cookie.
- The **ID token signature is verified** against your provider's published JWKS
  (`RS*`, `PS*` and `ES*`). `alg: none` and the HMAC family are rejected
  outright — the latter is a well-known key-confusion attack. Issuer, audience,
  `azp`, `exp` and `iat` are all checked, with two minutes of clock tolerance.
  Keys are cached for ten minutes and refetched once on an unknown key id, so
  provider key rotation does not lock anybody out.
- The `state` value is compared in constant time and stored in a short-lived
  `HttpOnly` cookie that is discarded after every attempt, successful or not.
- The client secret stays in the container's environment and is never sent to the
  browser or rendered into a page.
- SSO accounts get a random, unusable password hash — they cannot be signed into
  through the password form.
- `userinfo` can fill in missing claims but can never change **who** signed in:
  a subject from a verified ID token always wins.

Verified end to end against a real Keycloak instance, including account linking
by e-mail and rejection of a token signed with a key outside the published JWKS.

## Troubleshooting

| Problem | Cause / fix |
|---------|-------------|
| No SSO button on the login page | One of the three required variables is missing or blank. Check the container log and `docker exec smart-garage env \| grep OIDC`. |
| "Single sign-on failed" | Usually a redirect URI mismatch. Compare the URI registered with your provider against the one in the container's log line for the failed attempt. Behind a proxy, set `OIDC_REDIRECT_URI` explicitly. |
| "No account is linked to this identity…" | `OIDC_ALLOW_SIGNUP=false` and no local account has that e-mail. Create the account first, or allow sign-up. |
| "This account is disabled" | An administrator deactivated it under **Admin → Users**. |
| Login loops back to the form | The provider must be reachable *from inside the container*. A `.local` hostname or a split-DNS name often is not — use an IP or a name the container can resolve. |

## Trying it without a provider

The repository ships a throwaway provider used to verify the flow during
development:

```bash
cd frontend
npm run dev:oidc-provider          # listens on http://localhost:9099
```

Then start the app with `OIDC_ISSUER=http://localhost:9099`,
`OIDC_CLIENT_ID=smart-garage`, `OIDC_CLIENT_SECRET=anything`. It is a test
double, not an identity provider — never point a real install at it.
