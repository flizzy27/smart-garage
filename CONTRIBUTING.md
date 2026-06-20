# Contributing

Thanks for helping improve Smart Garage.

## Before a pull request

1. Open an issue for larger changes
2. Fork and branch from `main`
3. From `frontend/`:

   ```bash
   npm ci
   npx prisma generate
   npm run lint
   npm run typecheck
   npm run build
   ```

4. Keep PRs focused; note breaking changes for self-hosters (migrations, env vars, Docker)

## Conventions

- TypeScript, Next.js App Router, Tailwind CSS
- Business logic in `frontend/lib/services/` (no React imports)
- Prisma schema changes need a migration

## Security

See [SECURITY.md](SECURITY.md) — no public issues for vulnerabilities.

## License

Contributions are licensed under [MIT](LICENSE).
