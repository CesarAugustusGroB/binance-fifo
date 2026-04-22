# binance-fifo

Binance FIFO tax workspace rebuilt as a `pnpm` monorepo around reusable TypeScript packages.
It stores raw Binance payloads in PostgreSQL, resolves EUR values with cached klines, computes
FIFO gains with deterministic decimal math, and exposes operator workflows through a Next.js
app plus authenticated internal API routes.

See [`DESIGN.md`](./DESIGN.md) for the architecture and data model.

## Stack

- Node 20+ / TypeScript
- Next.js 15 App Router
- PostgreSQL (Neon-friendly) + Drizzle
- Inngest for durable ingest/recompute jobs
- Zod for Binance DTO validation
- `decimal.js` for all monetary arithmetic
- Vitest for unit tests

## Workspace layout

```text
apps/
  fifo-web/          Next.js app, API routes, Inngest handlers, minimal operator UI
packages/
  binance-client/    Signed Binance client with Zod-validated DTOs
  fifo-engine/       Pure FIFO domain logic
  db/                Drizzle schema, migrations, DB access helpers
  shared/            Env parsing, auth, date, decimal, CSV helpers
```

## Environment

Copy `.env.example` into your local environment and provide:

```bash
BINANCE_API_KEY=
BINANCE_API_SECRET=
DATABASE_URL=
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
INTERNAL_API_TOKEN=
```

## Commands

```bash
corepack pnpm install
corepack pnpm db:migrate
corepack pnpm dev
```

Useful task scripts:

```bash
corepack pnpm build
corepack pnpm test
corepack pnpm typecheck
corepack pnpm fifo:ingest
corepack pnpm fifo:recompute
corepack pnpm fifo:status
```

## API surface

- `POST /api/ingest`
- `POST /api/recompute`
- `GET /api/export?year=YYYY`
- `GET /api/status`
- `POST /api/manual-acquisition`
- `POST /api/inngest`

All operational routes expect `Authorization: Bearer $INTERNAL_API_TOKEN`.
