# Community Applications — submission packet

Everything needed to submit **Smart Garage** to the Unraid Community Applications store.

**Submit at:** [https://ca.unraid.net/submit/new](https://ca.unraid.net/submit/new)

---

## Repository

| Field | Value |
|-------|-------|
| **GitHub URL** | `https://github.com/flizzy27/smart-garage` |
| **License** | MIT ([LICENSE](../LICENSE)) |
| **Visibility** | Public, active |
| **Default branch** | `main` |

## Maintainer profile

| File | URL |
|------|-----|
| `ca_profile.xml` | https://github.com/flizzy27/smart-garage/blob/main/ca_profile.xml |

## Docker template

| File | URL |
|------|-----|
| Template XML | https://raw.githubusercontent.com/flizzy27/smart-garage/main/templates/smart-garage.xml |
| App icon | https://raw.githubusercontent.com/flizzy27/smart-garage/main/templates/icon.png |
| Repo icon | https://raw.githubusercontent.com/flizzy27/smart-garage/main/icon.svg |

## Container image

| Field | Value |
|-------|-------|
| **Registry** | GitHub Container Registry |
| **Image** | `ghcr.io/flizzy27/smart-garage:latest` |
| **Also tagged** | `ghcr.io/flizzy27/smart-garage:v0.3.0` (and release tags) |
| **Published by** | GitHub Actions [docker-publish.yml](../.github/workflows/docker-publish.yml) |
| **Visibility** | Must be **Public** (GitHub → Packages → smart-garage → Package settings) |

## App metadata (for moderators)

| Field | Value |
|-------|-------|
| **Name** | `smart-garage` |
| **Display name** | Smart Garage |
| **Category** | Productivity:Utilities |
| **Overview** | Self-hosted vehicle management — maintenance, fuel, expenses, documents |
| **Project** | https://github.com/flizzy27/smart-garage |
| **Support** | https://github.com/flizzy27/smart-garage/issues |
| **WebUI** | `http://[IP]:[PORT:3000]/` |
| **Shell** | `sh` |
| **Privileged** | `false` |
| **Network** | `bridge` |

## User-configurable settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Web UI | Port | 3000 | HTTP port |
| AppData | Path | `/mnt/user/appdata/smart-garage` | SQLite DB + uploads |
| Max upload size (MB) | Variable | 25 | Document upload limit |
| Max image size (MB) | Variable | 10 | Vehicle image limit |

Hidden (auto-set): `DATABASE_URL`, `UPLOAD_DIR`, `NODE_ENV`

## How updates work

- Template uses `:latest` image tag
- Users update via Unraid **Force Update**
- CI rebuilds and pushes `latest` on every `main` push and version tag
- Entrypoint runs `prisma migrate deploy` before starting the app

## Security notes for review

- No secrets in repository
- No default admin account or password in production image
- Passwords hashed with scrypt
- Session-based auth; per-user data isolation
- Upload size validated server-side
- SQLite file and uploads on user-controlled volume only

## Suggested GitHub repository settings

**About** (repository homepage):

- Description: `Self-hosted vehicle management for Unraid & homelab — maintenance, fuel, expenses, documents`
- Website: `https://github.com/flizzy27/smart-garage#readme`
- Topics: `unraid`, `docker`, `selfhosted`, `vehicle-management`, `maintenance`, `nextjs`, `homelab`

## Submission checklist

- [ ] GHCR package `smart-garage` is **public**
- [ ] GitHub Actions **Publish Docker image** workflow succeeded
- [ ] `ca_profile.xml` present at repo root
- [ ] `templates/smart-garage.xml` validates
- [ ] MIT `LICENSE` at repo root
- [ ] Sign in at ca.unraid.net with GitHub
- [ ] Enter repo URL → **Validate** → **Scan** → **Submit**

## After approval

Users find the app under **Apps** → search **Smart Garage** → Install.

Until then, users can install via the [direct template URL](./UNRAID.md).

## Optional: Unraid forum support thread

Creating a thread on [forums.unraid.net](https://forums.unraid.net/) and updating the `Support` field in `templates/smart-garage.xml` can speed up review. Current support link points to GitHub Issues.

---

*Maintainer: [flizzy27](https://github.com/flizzy27)*
