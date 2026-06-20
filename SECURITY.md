# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| latest release | yes |
| older releases | security fixes at maintainer discretion |

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, report them by opening a **private security advisory** on GitHub:

1. Go to the repository Security tab
2. Click **Report a vulnerability**
3. Describe the issue, impact, and steps to reproduce

If GitHub private reporting is unavailable, open a minimal public issue asking for a private contact channel — do not include exploit details.

We aim to acknowledge reports within **7 days** and provide a fix timeline when possible.

## Scope

In scope:

- Authentication and session handling
- Authorization bypass (accessing another user's vehicles or files)
- SQL injection, XSS, CSRF
- Path traversal via file upload or download
- Remote code execution via dependencies or misconfiguration

Out of scope:

- Denial of service against a self-hosted instance without a demonstrated flaw in Smart Garage code
- Issues in third-party services (PostgreSQL, reverse proxy) not caused by Smart Garage configuration defaults
- Social engineering

## Self-hosting responsibilities

Smart Garage users are responsible for:

- Keeping instances updated
- Using HTTPS via a reverse proxy when exposed to the internet
- Setting strong `AUTH_SECRET` and database passwords
- Regular backups (see [DEPLOYMENT.md](./DEPLOYMENT.md))

## Secure defaults

The project aims to:

- Require authentication for all application routes except login/register
- Never expose upload directories as public static files
- Store passwords with Argon2id (when auth is implemented)
- Document required environment variables in `.env.example`
