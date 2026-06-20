# Docker

Smart Garage ships as **one production container**: Next.js app + SQLite + uploads on a single `/data` volume.

## Production (recommended)

From the repository root:

```bash
mkdir -p data
docker compose up -d --build
```

| File | Purpose |
|------|---------|
| [../Dockerfile](../Dockerfile) | Multi-stage build (deps → build → slim runtime) |
| [../docker-compose.yml](../docker-compose.yml) | Production service on port 3000 |
| [entrypoint.sh](./entrypoint.sh) | Runs `prisma migrate deploy`, then `node server.js` |

### Volume layout

```
data/                    # host bind mount → /data in container
├── smart-garage.db      # SQLite database
└── uploads/             # vehicle images & documents
```

## Unraid

See [../docs/UNRAID.md](../docs/UNRAID.md).

## Development database (legacy / optional)

[docker-compose.dev.yml](./docker-compose.dev.yml) starts PostgreSQL for older dev workflows.  
**Current V1 app uses SQLite** — local dev typically uses `frontend/.env` with `file:../data/smart-garage.db`.

```bash
cd frontend
npm install
npm run db:repair
npm run dev
```

## Build image only

```bash
docker build -t smart-garage:0.2.0 .
```
