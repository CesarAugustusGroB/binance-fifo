# binance-fifo Design

`binance-fifo` is now a TypeScript monorepo for Binance FIFO tax processing. The repo no longer
targets a local Java CLI. It is built around reusable packages, a Next.js control plane, a
PostgreSQL backing store, and durable background jobs.

## Goals

- Preserve the original product intent: ingest Binance history, compute FIFO gains in EUR,
  and export a CSV suited to the Spanish tax workflow.
- Keep the correctness-critical logic independent from UI, network, and database concerns.
- Store raw Binance payloads so mapping bugs can be fixed and replayed without re-querying
  the exchange.
- Support long-running ingestion and recompute flows in a Vercel-friendly model.

## Architecture

### `packages/binance-client`

- Stateless signed client based on native `fetch`
- HMAC signer using `node:crypto`
- Zod schemas for response validation
- Async-generator pagination for trade history and other historical endpoints
- Header-aware throttling based on `x-mbx-used-weight-1m`

### `packages/fifo-engine`

- Pure TypeScript domain package
- Uses `decimal.js` for all quantities, prices, and PnL
- Defines `AssetEvent`, `RealizedGain`, and the FIFO queue/matching engine
- Exposes mapping helpers that convert persisted trades and movements into FIFO events
- Reports uncovered disposals as structured output rather than crashing the whole process

### `packages/db`

- Drizzle schema and migrations for PostgreSQL
- Core tables:
  - `trades`
  - `movements`
  - `price_cache`
  - `realized_gains`
  - `ingestion_cursor`
  - `known_symbols`
- Raw Binance payloads are stored in JSONB for auditability and replay

### `apps/fifo-web`

- Next.js 15 App Router app
- Minimal operator UI for status and recent imported rows
- Internal API routes for ingest, recompute, export, status, and manual acquisition
- Inngest handlers for durable ingest and recompute orchestration

## Data flow

1. `POST /api/ingest` sends `fifo/ingest.requested` to Inngest.
2. The ingest function discovers candidate symbols from account balances, pages `myTrades`,
   stores raw trade rows, and updates ingestion cursors.
3. `fifo/recompute.requested` loads persisted trades and movements, resolves EUR prices, maps
   rows to `AssetEvent`s, runs the FIFO engine, and replaces `realized_gains`.
4. `GET /api/export?year=YYYY` converts persisted gains into CSV rows with `Europe/Madrid`
   timestamps at the export boundary.

## Pricing model

- If the asset is `EUR`, the conversion factor is `1`.
- Attempt direct `<asset>EUR` klines first, then fall back to `<asset>USDT` and `EURUSDT`.
- If the exact minute is unavailable, reuse the nearest earlier cached or Binance 1m kline.
- Cache resolved prices per `(asset, quote, minute)` in `price_cache`, and dedupe in-flight lookups during replay flows.
- Missing markets and unsupported assets raise explicit resolver errors instead of silently falling through.
- Keep all timestamps in UTC until export.

## Current scope

Implemented in this pass:

- Monorepo workspace conversion
- TypeScript Binance signer/client scaffold
- Pure FIFO engine and core tests
- Drizzle schema and initial SQL migration
- Next.js control plane, internal routes, and Inngest wiring
- Spot trade ingestion scaffold
- Recompute/export/status server flows

Still intentionally incomplete:

- Full Convert, Dust, Deposit, Withdrawal, and Earn ingestion sources
- BNB fee disposal side-events
- Symbol validation against exchange metadata
- Rich UI workflows beyond the operator dashboard
- Production-grade retry/backoff policy for all Binance failure shapes
