# Unraid

Install **Smart Garage** without `docker compose`.

## Quick install

1. **Docker** → **Add Container**
2. **Install another application's template**
3. URL:

   ```
   https://raw.githubusercontent.com/flizzy27/smart-garage/main/templates/smart-garage.xml
   ```

4. Set port, AppData, upload limits → **Apply**
5. Open WebUI → register → add vehicle

## Settings

| Field | Default | Notes |
|-------|---------|-------|
| Web UI port | 3000 | Change if occupied |
| AppData | `/mnt/user/appdata/smart-garage` | Auto-created |
| Max upload (MB) | 25 | PDFs, receipts |
| Max image (MB) | 10 | Vehicle photos |

## Updates

**Docker** → **smart-garage** → **Force Update** → restart

Uses `ghcr.io/flizzy27/smart-garage:latest`.

## Backup

Copy `/mnt/user/appdata/smart-garage` (entire folder).

## Community Applications store

To appear in **Apps** search, submit the repo: [CA-SUBMISSION.md](./CA-SUBMISSION.md)

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `compose` unknown | Use template above — no compose on Unraid |
| Pull error | Make GHCR package public (GitHub → Packages) |
| Container exits on start (`prisma/config`) | Update to **v0.4.3+** via Force Update |
| Port conflict | Use 3001 or another free port |

More: [INSTALL.md](./INSTALL.md)
