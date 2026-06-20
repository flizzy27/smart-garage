# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| Latest release (`latest` / newest tag) | Yes |
| Older tags | Security fixes at maintainer discretion |

## Reporting a vulnerability

**Do not report security vulnerabilities through public GitHub issues.**

Use **GitHub Private Security Advisory**:

1. Repository → **Security** → **Report a vulnerability**
2. Describe impact and reproduction steps

We aim to acknowledge within **7 days**.

## Scope

**In scope**

- Authentication and session handling
- Authorization bypass (another user's data)
- SQL injection, XSS, CSRF
- Path traversal via uploads/downloads
- Remote code execution via application code

**Out of scope**

- Generic DoS against a self-hosted instance
- Misconfigured reverse proxy / TLS (operator responsibility)
- Issues in Docker/Unraid themselves

## Self-hosting responsibilities

- Keep the container updated (`Force Update` / pull `latest`)
- Use HTTPS when exposing to the internet (reverse proxy)
- Back up `/data` regularly ([docs/INSTALL.md](docs/INSTALL.md))
- Do not expose the container port directly to the public internet without TLS

## Application security

- Open registration is intentional (local/trusted networks); restrict network access if needed
- Passwords stored with **scrypt** + per-user salt
- Sessions stored server-side; HTTP-only cookie
- Upload MIME types and sizes validated server-side
- No secrets committed to the repository
