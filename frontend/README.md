# Frontend

Next.js application for Smart Garage. See the [root README](../README.md) for project overview.

## Commands

```bash
npm install
npm run dev       # http://localhost:3000
npm run build
npm run start
npm run lint
npm run typecheck
```

## Local database

PostgreSQL for development (from repository root):

```bash
docker compose -f docker/docker-compose.dev.yml up -d
```

Connection string: see [.env.example](../.env.example).

Prisma is not configured yet — see [ROADMAP.md](../ROADMAP.md) Phase 0.

## Structure (planned)

```
frontend/
├── app/              # App Router pages and API routes
├── components/       # React UI components
├── lib/
│   ├── domain/       # Business rules (no React/Prisma imports)
│   ├── services/     # Use cases
│   └── repositories/ # Data access
└── prisma/           # Schema and migrations (planned)
```

Full guides: [DEVELOPMENT.md](../DEVELOPMENT.md) · [ARCHITECTURE.md](../ARCHITECTURE.md) · [DATABASE_DESIGN.md](../DATABASE_DESIGN.md)

## Conventions

- TypeScript only
- Default to Server Components; use `"use client"` only when needed
- Tailwind CSS for styling
- Read `node_modules/next/dist/docs/` for Next.js 16 specifics (see [AGENTS.md](./AGENTS.md))
