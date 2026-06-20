# Docker

Production image for Smart Garage.

| File | Purpose |
|------|---------|
| [../Dockerfile](../Dockerfile) | Multi-stage build → `ghcr.io/flizzy27/smart-garage` |
| [entrypoint.sh](./entrypoint.sh) | `prisma migrate deploy` → `node server.js` |
| [../docker-compose.yml](../docker-compose.yml) | Pull and run `latest` |

## Data volume

```
/data/
├── smart-garage.db
└── uploads/
```

Published automatically by GitHub Actions on push to `main` and version tags.
