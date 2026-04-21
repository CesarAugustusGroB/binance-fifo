# binance-fifo — Seed Backlog

Temporary local backlog. Will be migrated to the Notion Tasks database once the Notion MCP is
authenticated. Columns match the planned Notion schema (Status / Type / Priority / Estimate).

---

## In Progress
_None_

## To Do

### BF-01 — End-to-end vertical slice: /myTrades on BTCUSDT
- **Type:** Feature · **Priority:** Critical · **Estimate:** M · **Phase:** 1
- Implement `BinanceClient.myTrades` with signed request (timestamp + recvWindow + HMAC).
- Single endpoint, single symbol, dump rows to console.
- Acceptance: `mvn spring-boot:run` + `ingest --from 2024-01-01` prints a trade count > 0 when
  credentials are set.
- Branch: `feature/bf-01-binance-mytrades`

### BF-02 — MERGE-based upsert for trades
- **Type:** Feature · **Priority:** High · **Estimate:** S · **Phase:** 3
- Persist BTCUSDT trades to the `trades` table using `MERGE INTO ... KEY(id)`.
- Acceptance: re-running `ingest` on the same window is a no-op (no duplicates, row count stable).

### BF-03 — PriceResolver MVP with 1m-kline cache
- **Type:** Feature · **Priority:** High · **Estimate:** L · **Phase:** 5
- Implement `PriceResolver.toEur` using EURUSDT klines + `price_cache`.
- Handle the hop case (asset → USDT → EUR).
- Acceptance: unit test pulling a known timestamp returns the expected EUR value from cache.

### BF-04 — FIFO engine: mandatory test cases
- **Type:** Test · **Priority:** Critical · **Estimate:** M · **Phase:** 6
- Complete `FifoEngineTest` with: 1 buy / N sells, 1 sell crossing 3 lots, BNB fee allocation.
- Add `AssetEventMapper` + its tests (trade → AssetEvent pairs).

### BF-05 — Symbol discovery
- **Type:** Feature · **Priority:** High · **Estimate:** M · **Phase:** 2
- `/api/v3/account` → candidate symbols via common quotes → validate → probe `/myTrades`.
- Persist to `known_symbols`.

### BF-06 — Ingest all sources
- **Type:** Feature · **Priority:** High · **Estimate:** L · **Phase:** 4
- Convert (`/sapi/v1/convert/tradeFlow` → two synthetic trades), Dust (`/asset/dribblet`),
  Deposits, Withdrawals, Earn rewards. Each with cursor in `ingestion_cursor`.

### BF-07 — CSV export with fiscal-year filter
- **Type:** Feature · **Priority:** High · **Estimate:** S · **Phase:** 7
- Implement `CsvWriter.writeRealizedGains` + `ExportTaxReportUseCase.run(year, path)`.
- Europe/Madrid conversion at the boundary only.

### BF-08 — Rate limiter + 429 backoff
- **Type:** Chore · **Priority:** Medium · **Estimate:** M · **Phase:** 1
- Bucket4j bucket sized from `binance.rate-limit.weight-per-minute`.
- Proactive throttle using `X-MBX-USED-WEIGHT-1M` response header.

### BF-09 — `status` shell command
- **Type:** Feature · **Priority:** Medium · **Estimate:** S · **Phase:** 8
- Counts per source, cursor positions, count of pending uncovered disposals (if any).

### BF-10 — `manual-acquisition` shell command
- **Type:** Feature · **Priority:** Medium · **Estimate:** S · **Phase:** 8
- Insert a `MANUAL_ACQUISITION` movement for pre-API holdings / off-exchange buys.

## Backlog (later)

### BF-11 — CI/CD pipeline (GitHub Actions)
- **Type:** Chore · **Priority:** Medium · **Estimate:** S
- `mvn verify` on push to `develop` / PR. Cache Maven dependencies.

### BF-12 — Futures support (v2 scope)
- **Type:** Feature · **Priority:** Low · **Estimate:** XL
- Different PnL semantics (margin, funding, liquidations). Explicitly out of v1.

### BF-13 — ECB reference-rate PriceResolver
- **Type:** Feature · **Priority:** Low · **Estimate:** M
- Swap Binance klines for ECB daily reference rates if the tax advisor prefers.

## Done

- **BF-00** — Project scaffolding + DESIGN.md (this commit).
