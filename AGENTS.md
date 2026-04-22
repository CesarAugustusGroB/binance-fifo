# binance-fifo

Binance FIFO tax workspace implemented as a TypeScript monorepo. The Java/Spring/H2 layout has
been removed. The active architecture is `Next.js + PostgreSQL + Drizzle + Inngest` with
reusable packages for the Binance client, FIFO engine, DB schema, and shared helpers.

## Tech Stack
- Node 20+
- TypeScript
- Next.js 15 App Router
- PostgreSQL (Neon-friendly)
- Drizzle ORM + SQL migrations
- Inngest
- Zod
- decimal.js
- Vitest

## Commands
- `corepack pnpm install`
- `corepack pnpm dev`
- `corepack pnpm build`
- `corepack pnpm test`
- `corepack pnpm typecheck`
- `corepack pnpm db:migrate`
- `corepack pnpm fifo:ingest`
- `corepack pnpm fifo:recompute`
- `corepack pnpm fifo:status`

## Project Structure
- `apps/fifo-web/` — Next.js app, API routes, Inngest handlers, minimal UI
- `packages/binance-client/` — stateless Binance REST client
- `packages/fifo-engine/` — pure FIFO domain logic
- `packages/db/` — Drizzle schema, SQL migration, DB access
- `packages/shared/` — env/auth/date/decimal/CSV helpers

## Conventions
- Never use JS `number` for money or quantities. Use `decimal.js`.
- Keep timestamps in UTC until export.
- Binance responses are validated with Zod before mapping.
- Preserve raw Binance payloads in DB rows for reprocessing.
- Secrets stay in env vars only.
- Branch naming and commit style stay the same as before.
