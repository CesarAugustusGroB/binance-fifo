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

## Quick start

From a clean clone:

```bash
corepack pnpm install
```

Then add the required environment variables, run the database migration, and start the app:

```bash
corepack pnpm db:migrate
corepack pnpm dev
```

The app starts the Next.js control plane from `apps/fifo-web`. By default, open
`http://localhost:3000` and adjust the port only if your local setup overrides it.

## Local environment

For local development, put the required variables in either:

- `apps/fifo-web/.env.local` for the Next.js app only
- a repo-root `.env` file if you want the same values available to workspace scripts

Start from `.env.example` and provide every required variable:

```bash
BINANCE_API_KEY=
BINANCE_API_SECRET=
DATABASE_URL=
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
INTERNAL_API_TOKEN=
```

What each variable is used for:

- `BINANCE_API_KEY`: Binance API key used by ingest flows
- `BINANCE_API_SECRET`: Binance API secret used to sign exchange requests
- `DATABASE_URL`: PostgreSQL connection string for Drizzle and server routes
- `INNGEST_EVENT_KEY`: key used when enqueueing Inngest events
- `INNGEST_SIGNING_KEY`: signing key used by the Inngest handler
- `INTERNAL_API_TOKEN`: bearer token required by all operator-facing API routes

The Next.js app evaluates server-side modules during local startup and production builds, so keep
all six variables set before running `corepack pnpm db:migrate`, `corepack pnpm dev`, or
`corepack pnpm build`.

## Workspace commands

Bootstrapping and local development:

```bash
corepack pnpm install
corepack pnpm db:migrate
corepack pnpm dev
```

Quality and build checks:

```bash
corepack pnpm build
corepack pnpm test
corepack pnpm typecheck
```

Operator scripts:

```bash
corepack pnpm fifo:ingest
corepack pnpm fifo:recompute
corepack pnpm fifo:status
```

## Operator workflow

The usual local operator sequence is:

1. Start the app with `corepack pnpm dev`
2. Trigger an ingest
3. Trigger a recompute
4. Check status
5. Export a tax-year CSV
6. Add manual acquisitions when historic holdings need to be seeded

The bearer token in the examples below must match `INTERNAL_API_TOKEN`.

Set a local shell variable once:

```bash
export INTERNAL_API_TOKEN=change-me
```

Trigger an ingest job:

```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Authorization: Bearer $INTERNAL_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fromMs":1704067200000,"toMs":1735689599000,"rediscover":true}'
```

Trigger a recompute job:

```bash
curl -X POST http://localhost:3000/api/recompute \
  -H "Authorization: Bearer $INTERNAL_API_TOKEN"
```

Read the current status snapshot:

```bash
curl http://localhost:3000/api/status \
  -H "Authorization: Bearer $INTERNAL_API_TOKEN"
```

Export the realized gains CSV for a tax year:

```bash
curl "http://localhost:3000/api/export?year=2025" \
  -H "Authorization: Bearer $INTERNAL_API_TOKEN" \
  -o fifo-2025.csv
```

Seed a manual acquisition:

```bash
curl -X POST http://localhost:3000/api/manual-acquisition \
  -H "Authorization: Bearer $INTERNAL_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"asset":"BTC","qty":"0.5","costEur":"9000","date":"2019-08-10T00:00:00Z"}'
```

## API routes

- `POST /api/ingest`
- `POST /api/recompute`
- `GET /api/export?year=YYYY`
- `GET /api/status`
- `POST /api/manual-acquisition`
- `POST /api/inngest`

All operator-facing routes expect `Authorization: Bearer $INTERNAL_API_TOKEN`.
