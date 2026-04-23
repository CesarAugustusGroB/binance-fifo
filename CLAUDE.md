# binance-fifo

TypeScript monorepo for Binance FIFO tax processing.

## Active Stack
- Node 20+
- TypeScript
- Next.js 15
- PostgreSQL + Drizzle
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

## Structure
- `apps/fifo-web/`
- `packages/binance-client/`
- `packages/fifo-engine/`
- `packages/db/`
- `packages/shared/`

## Notion Board
- **Tasks DB**: https://www.notion.so/d03596a67c3f48b6ae0b50899babd9c7
- **Project page**: https://www.notion.so/3496c88ed42481daacf6e32e287d40fb

## Rules
- Money and quantities use `decimal.js`, never JS `number`.
- Binance creds and internal bearer token come from env vars only.
- Keep raw Binance payloads in Postgres rows.
- Convert timestamps to `Europe/Madrid` only at export.
