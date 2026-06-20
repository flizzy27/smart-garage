# Submit Smart Garage to Unraid Community Applications

This guide is for maintainers who want **Smart Garage** to appear when users search in **Apps** on Unraid.

## What is already in the repo

| File | Purpose |
|------|---------|
| [ca_profile.xml](../ca_profile.xml) | Maintainer profile (required for CA submission) |
| [templates/smart-garage.xml](../templates/smart-garage.xml) | Docker template with port, AppData path, upload limits |
| [icon.svg](../icon.svg) | Repository icon for CA |
| [templates/icon.png](../templates/icon.png) | App icon in the template |

Configurable in the template:

- **Web UI port** (`Type="Port"`)
- **AppData path** (`Type="Path"` → `/data`)
- **MAX_UPLOAD_SIZE_MB** (`Type="Variable"`)
- **MAX_IMAGE_SIZE_MB** (`Type="Variable"`)

## Requirements before submitting

1. Public GitHub repo: `https://github.com/flizzy27/smart-garage`
2. OSI license at repo root ([MIT](../LICENSE))
3. Published Docker image: `ghcr.io/flizzy27/smart-garage:latest`  
   Built by [.github/workflows/docker-publish.yml](../.github/workflows/docker-publish.yml) on version tags (`v*`)
4. After first GHCR push: set package visibility to **Public** in GitHub → Packages → smart-garage → Package settings

## Submission steps

1. Open [https://ca.unraid.net/submit/new](https://ca.unraid.net/submit/new)
2. Sign in with GitHub
3. Enter repository URL: `https://github.com/flizzy27/smart-garage`
4. Run **Validate** — fix any XML errors reported
5. Run **Scan** — ensure template and image reference pass
6. **Submit** for human review

Official docs:

- [Submission help](https://ca.unraid.net/submit/help)
- [Repository XML format](https://ca.unraid.net/submit/help/repository-xml)
- [Builder guide](https://ca.unraid.net/submit/help/builders)

## After approval

Users can open **Apps** → search **Smart Garage** → Install.

Until approval, users can still install via the direct template URL (see [UNRAID.md](./UNRAID.md)).

## Optional: Unraid support forum thread

Create a support thread on [forums.unraid.net](https://forums.unraid.net/) and update `Support` in `templates/smart-garage.xml` to that URL — recommended for CA review.

## Publishing a new version

1. Update [CHANGELOG.md](../CHANGELOG.md) and [VERSION](../VERSION)
2. Commit and tag: `git tag v0.2.2 && git push origin v0.2.2`
3. Wait for GitHub Actions to push `ghcr.io/flizzy27/smart-garage:v0.2.2` and `:latest`
4. Update `Repository` tag in the template if you pin versions (optional)
