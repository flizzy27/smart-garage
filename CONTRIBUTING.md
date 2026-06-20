# Contributing to Smart Garage

Thank you for your interest in contributing. Smart Garage is an open-source, self-hosted project — clear conventions help everyone.

## Before you start

1. Read [PROJECT.md](../PROJECT.md) for product scope
2. Read [ARCHITECTURE.md](../ARCHITECTURE.md) for system design
3. Check [ROADMAP.md](../ROADMAP.md) for planned phases — open an issue before large changes

## Development setup

See the [README](../README.md#quick-start-development).

## How to contribute

1. **Fork** the repository
2. **Create a branch** from `main` — use a descriptive name (`fix/login-redirect`, `docs/deployment`)
3. **Make changes** following project conventions (see below)
4. **Run checks** from `frontend/`:
   ```bash
   npm run lint
   npm run typecheck
   npm run build
   ```
5. **Open a pull request** against `main` with a clear description

## Code conventions

| Area | Convention |
|------|------------|
| Language | TypeScript only (no `.js` source files) |
| Framework | Next.js App Router in `frontend/` |
| Styling | Tailwind CSS |
| Components | Reusable; default to Server Components |
| Business logic | `frontend/lib/domain/` and `frontend/lib/services/` — no React imports |
| Database | Prisma schema changes need review; see [DATABASE.md](../DATABASE.md) |
| Docs | Update relevant `.md` files for architectural changes |

## Pull request guidelines

- Keep PRs focused — one concern per PR when possible
- Link related issues
- Note breaking changes for self-hosters (env vars, migrations, Docker)
- Do not commit `.env`, secrets, or `data/` directory contents
- Schema migrations require a description of upgrade impact

## Reporting bugs

Open a [GitHub issue](https://github.com/flizzy27/smart_garage/issues) with:

- Smart Garage version or commit hash
- Steps to reproduce
- Expected vs actual behavior
- Environment (OS, Docker, browser)

## Security issues

Do **not** open public issues for vulnerabilities. See [SECURITY.md](../SECURITY.md).

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](../LICENSE).
