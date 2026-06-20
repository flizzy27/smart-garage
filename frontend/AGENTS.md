# Frontend — AI agent notes

**Project context:** read [`../AGENTS.md`](../AGENTS.md) first (CI, Docker, version, pitfalls).

## Next.js 16

This is **not** the Next.js from training data. Before changing routing, config, or build:

- Read guides in `node_modules/next/dist/docs/`
- Heed deprecation notices in the installed version

## Layout

| Path | Purpose |
|------|---------|
| `app/[locale]/` | Localized pages |
| `app/api/` | Route handlers |
| `components/` | React components |
| `lib/` | Domain, services, repositories, utilities |
| `messages/en.json`, `messages/de.json` | All user-visible strings |
| `prisma/` | Schema, migrations, seed |

## Commands (from `frontend/`)

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npx prisma migrate dev
npx prisma db seed
```

## i18n

- Default locale: English
- German: `de`
- Never hardcode UI copy in components — use `next-intl` and message files

## Prisma

- SQLite only (`provider = "sqlite"`)
- `postinstall` runs `prisma generate` — relevant for Docker (see root `AGENTS.md` Dockerfile pitfall)
