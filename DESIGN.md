# binance-fifo — Document Design

Local tool that takes a Binance account, computes FIFO realised gains in EUR, and exports a
CSV suitable for the Spanish tax workflow. Runs on one machine, no servers, no cloud.

---

## 1. Goals & non-goals

**Goals**
- Reproduce what Binance's Tax Report *should* provide but doesn't for ES residents.
- Cover Spot + Convert + Dust + Deposits/Withdrawals + Earn/Staking rewards.
- FIFO matching, EUR cost basis, auditable per-lot output.
- Idempotent, resumable ingestion (re-runs don't duplicate).
- Zero secrets in git; zero cloud services; one H2 file.

**Non-goals (v1)**
- Futures (different PnL semantics: margin, funding, liquidations).
- Multi-exchange aggregation.
- A web UI. CLI only.
- Real-time streaming. Daily/ad-hoc batch is enough.

---

## 2. Architecture — hexagonal lite

Three layers. Dependencies point inward.

```
┌────────────────────────────────────────────────────────────┐
│ infrastructure    binance │ persistence │ export │ cli     │
│                     ↑            ↑          ↑       ↑      │
│ application    IngestTrades  CalculateFifo  ExportReport   │
│                                  ↓                         │
│ domain         trade  │   fifo   │   movement  (pure Java) │
└────────────────────────────────────────────────────────────┘
```

- **domain/** — no Spring, no I/O. Records, enums, the `FifoEngine`. Heavily unit tested.
- **application/** — use cases (orchestration). Depend only on domain + ports (interfaces in
  infrastructure like `PriceResolver`, and Spring Data repos).
- **infrastructure/** — Binance HTTP client, JPA persistence, CSV writer, Spring Shell.

This is "hexagonal lite": no dedicated port/adapter module, because for a local tool the
ceremony doesn't pay off. What we DO protect is the purity of the FIFO engine — that's the
logic worth testing in isolation.

### 2.1 Package map

| Package | Responsibility |
|---|---|
| `domain.trade` | `Asset`, `Symbol`, `TradeSide`, `Trade`, `TradeSource` |
| `domain.fifo` | `AssetEvent`, `Lot`, `RealizedGain`, `FifoEngine`, `UncoveredDisposalException` |
| `domain.movement` | `Movement`, `MovementType`, `Conversion` |
| `application` | `IngestTradesUseCase`, `CalculateFifoUseCase`, `ExportTaxReportUseCase` |
| `infrastructure.binance` | `BinanceClient`, `HmacSigner`, `RateLimiter`, DTOs |
| `infrastructure.persistence` | JPA entities + Spring Data repos |
| `infrastructure.price` | `PriceResolver` (EUR conversion, cached) |
| `infrastructure.export` | `CsvWriter` |
| `infrastructure.cli` | `FifoShellCommands` |
| `config` | `BinanceProperties`, `WebClientConfig` |

---

## 3. Binance client

### 3.1 Authentication

- API key from env var `BINANCE_API_KEY`, secret from `BINANCE_API_SECRET`.
- Key permissions: **Read only**. IP-restricted when the user has a static IP.
- Never logged, never persisted, never flows into a DTO.
- Each SIGNED request has `timestamp=<now ms>` + `recvWindow=5000` appended, the
  canonical query string is HMAC-SHA256 signed, the signature is the last param,
  and `X-MBX-APIKEY` header carries the key.

### 3.2 Rate limiting

- Binance publishes weights per endpoint (global bucket 1200/min). Budget:
  - Proactive: `Bucket4j` token bucket sized to `binance.rate-limit.weight-per-minute`.
  - Reactive: read `X-MBX-USED-WEIGHT-1M` from every response; slow down when it approaches
    the cap instead of cliff-diving into a 429.
- On 429/418: exponential backoff respecting `Retry-After`.

### 3.3 Pagination

All historical endpoints follow the same shape: `startTime`, `endTime`, `limit` (max 1000),
and often `fromId`. Generic paginator:

```java
Flux<T> paginate(String endpoint, Params base) {
    return Flux.defer(() -> fetchPage(base))
        .expand(page -> page.size() < LIMIT
            ? Flux.empty()
            : fetchPage(base.withFromId(lastIdOf(page) + 1)))
        .flatMap(Flux::fromIterable);
}
```

### 3.4 Schema tolerance

`/sapi` endpoints mutate without notice. Every DTO is `@JsonIgnoreProperties(ignoreUnknown = true)`.
Unknown enum values are logged and skipped rather than crashing the run.

---

## 4. Data model

Stored in H2 file `./data/fifo.mv.db`. Flyway migration `V1__init_schema.sql`. All money uses
`DECIMAL(30,10)` — room for satoshi-level precision plus a safety margin. **Never `DOUBLE`.**

### 4.1 `trades`
Raw executed trades across all sources. Primary key = Binance trade id, making re-ingestion
idempotent via `MERGE INTO`. `source` distinguishes SPOT / CONVERT / DUST. For CONVERT, we
synthesise a stable pseudo-id from the quote id so the merge still deduplicates.

### 4.2 `movements`
Non-trade asset moves: deposits, withdrawals, rewards, airdrops, **and** user-injected
manual acquisitions. Single table (discriminated by `type`) rather than a class hierarchy —
persistence stays flat and the FIFO mapper pattern-matches cleanly. `metadata` CLOB keeps
the original JSON for audit.

### 4.3 `realized_gains`
Output of the FIFO engine, one row per matched (lot, disposal) pair. Includes both source
trade ids so any gain is traceable back to the evidence. Recomputed from scratch on every
`calculate-fifo` run — trades are immutable and the engine is fast enough.

### 4.4 `price_cache`
`(asset, quote, minute_utc) → price`. Populated from Binance 1m klines (the primary cost
basis for EUR conversion). Sparse — only minutes we've needed.

### 4.5 `ingestion_cursor`
`(source, symbol) → (last_id, last_sync_at)`. Makes `ingest` resumable; a crashed or
interrupted run picks up exactly where it left off.

### 4.6 `known_symbols`
Cache of the symbol-discovery pass (see §4.7). Without it, every `ingest` run would re-probe
every (base, quote) combination against `/api/v3/myTrades`.

### 4.7 Symbol discovery

Binance has no "list every pair I've ever traded" endpoint. Strategy:

1. `/api/v3/account` → all assets with any history (Binance keeps zero-balance entries for
   assets you've touched).
2. For each non-quote asset, generate candidate symbols by joining with common quotes:
   `USDT, BUSD, EUR, BTC, ETH` (configurable).
3. Validate candidates against `/api/v3/exchangeInfo`.
4. Call `/api/v3/myTrades` once per candidate — empty results → discard.
5. Persist survivors to `known_symbols`.

Subsequent runs use `known_symbols` directly and only re-probe if the user asks
(`ingest --rediscover`).

---

## 5. EUR pricing

Hacienda wants everything denominated in EUR at the moment of each taxable event. Most
Binance trades are in USDT/BUSD/BTC — so every acquisition and disposal needs a synthetic
EUR price.

**Primary source:** Binance 1-minute klines (`/api/v3/klines`), specifically `EURUSDT` plus
any direct `<asset>EUR` pair that exists.

**Resolution algorithm** (`PriceResolver.toEur(asset, amount, at)`):
1. If `asset == EUR` → passthrough.
2. If `<asset>EUR` exists on Binance → look up that minute's kline close; cache it.
3. Otherwise hop via the most liquid intermediate (USDT): `asset → USDT → EUR`.
4. If the exact minute is missing (holiday, weekend for fiat pairs that rely on reference
   rates), fall back to the nearest earlier minute within a tolerance.
5. Every resolved price is cached in `price_cache` — re-runs are zero-query.

This is a clear interface, kept behind a port so v2 can swap to ECB reference rates if the
tax advisor prefers.

---

## 6. FIFO engine

### 6.1 Why pure domain

The engine is the single place whose correctness determines whether the tax report is right.
Isolating it from Spring / JPA / HTTP means:
- Unit tests run in milliseconds with no containers.
- Debugging is a data problem (input events → output gains), not a framework problem.
- A future audit can re-run it against archived event lists to prove reproducibility.

### 6.2 Input contract

`FifoEngine.apply(List<AssetEvent>)`. Every event is already:
- **Sorted-able** by `(timestamp, sequence)`. `sequence` is a tiebreaker — for two trades in
  the same millisecond, the lower Binance trade id comes first.
- **Priced in EUR**. `ACQUISITION` carries `costEur`; `DISPOSAL` carries `valueEur`. The
  engine does no currency math whatsoever.
- **Per-asset**. One event refers to one asset's leg; a BTC/USDT sell becomes two events
  (dispose BTC + acquire USDT).

### 6.3 Trade → AssetEvent mapping (AssetEventMapper)

| Input | Emitted events |
|---|---|
| `BUY BTC/USDT` | `ACQUISITION(BTC, qty, cost=quoteQty × EUR/USDT + feeShare)`, `DISPOSAL(USDT, quoteQty, value=quoteQty × EUR/USDT)` |
| `SELL BTC/USDT` | `DISPOSAL(BTC, qty, value=quoteQty × EUR/USDT − feeShare)`, `ACQUISITION(USDT, quoteQty, cost=quoteQty × EUR/USDT)` |
| Convert `X → Y` | `DISPOSAL(X, fromAmount, value=fromAmount × EUR/X)`, `ACQUISITION(Y, toAmount, cost=fromAmount × EUR/X)` (spread absorbed — Convert has no explicit fee) |
| Dust → BNB | Same as Convert: dispose of dust asset, acquire BNB at that minute's EUR rate |
| Deposit | `ACQUISITION(asset, amount, cost=amount × EUR/asset)` **⚠ assumption** — cost basis = market value at deposit. If acquired earlier off-exchange, user must override via `manual-acquisition`. |
| Withdrawal | `DISPOSAL(asset, amount, value=amount × EUR/asset)` |
| Staking/Earn reward | `ACQUISITION(asset, amount, cost=amount × EUR/asset)` (taxable income at receipt in ES) |

**BNB commissions.** Binance deducts trading fees from your BNB balance. These are treated as
an extra `DISPOSAL(BNB, fee, value=fee × EUR/BNB)` **and** added to the `costEur` of the
acquisition leg on buys (subtracted from `valueEur` of the disposal leg on sells). A
`FeeAllocator` component owns this — it's fiddly enough to deserve its own tests.

### 6.4 Matching

Per-asset `Deque<Lot>`. On `ACQUISITION`, enqueue. On `DISPOSAL`, pop from the head until
filled, emitting a `RealizedGain` per partial match.

**Precision.** All arithmetic uses `BigDecimal` with `MathContext.DECIMAL64` (16 significant
digits) to avoid `ArithmeticException: Non-terminating decimal expansion`. Never `double`.

**Uncovered disposals** throw `UncoveredDisposalException`. This is almost always a missing
transfer-in from another wallet or a pre-API holding. The user fixes it by running
`manual-acquisition` and re-running `calculate-fifo`.

---

## 7. Export format

CSV written by `ExportTaxReportUseCase` / `CsvWriter`. Columns:

```
fecha_adquisicion, fecha_transmision, activo, cantidad,
valor_adquisicion_eur, valor_transmision_eur, pnl_eur,
tipo,                -- corto_plazo | largo_plazo (holding > 1 year)
exchange             -- "Binance" for now
```

- Dates in `Europe/Madrid` local time (converted from UTC at the export boundary only).
- Decimal separator: `.` by default; a `--locale es` flag can switch to `,` + `;` for
  Excel-ES users.
- Filter: `--year 2025` limits by `fecha_transmision`.
- Trailing rows: per-asset subtotal and grand total for quick sanity-check against the
  aggregator.

---

## 8. CLI surface

Thin Spring Shell layer. Every command delegates to a single use case.

| Command | Effect |
|---|---|
| `ingest [--from ISO] [--to ISO] [--rediscover]` | Pulls from Binance, incremental via cursors |
| `calculate-fifo` | Recomputes `realized_gains` from scratch |
| `export --year N [--out PATH] [--locale es\|en]` | Writes filtered CSV |
| `status` | Counts per source + last-sync timestamps + uncovered disposal warnings |
| `manual-acquisition --asset --qty --cost-eur --date` | Injects pre-API holdings |

---

## 9. Failure modes we've pre-decided how to handle

| Failure | Handling |
|---|---|
| Binance 429 / 418 | Respect `Retry-After`; exponential backoff |
| `/sapi` schema drift | Tolerant DTOs + structured log; run continues |
| Uncovered disposal | Engine throws; CLI prints the offending event + `manual-acquisition` hint |
| Missing EUR kline for a minute | Fall back to nearest earlier minute within N minutes; warn if outside |
| Timezone confusion | Persist UTC everywhere; convert to `Europe/Madrid` only in export |
| Partial ingest crash | Cursor already committed per page → re-run resumes from the crash point |
| Re-ingest after crash | `MERGE INTO trades` makes it a no-op for rows already stored |

---

## 10. Execution plan (recap, keyed to phases)

1. **Phase 0** — Spring init, env vars, Flyway baseline.
2. **Phase 1** — `HmacSigner` + `BinanceClient` with one endpoint (`/myTrades` on BTCUSDT)
   printing rows to the console.
3. **Phase 3** — `trades` table + JPA repo + MERGE-based upsert.
4. **Phase 5** — `PriceResolver` with 1m-kline backfill + cache.
5. **Phase 6** — `FifoEngine` + `AssetEventMapper` with the four mandatory test cases
   (1↔1, 1→N, 1→3-lot crossing, BNB fee allocation).
6. **Phase 2 + 4** — Symbol discovery, full ingestion (Spot/Convert/Dust/Deposits/Withdrawals/Earn).
7. **Phase 7 + 8** — CSV export + Spring Shell commands.

The ordering prioritises unblocking the auth/signing path first, then building the
correctness-critical engine against cached inputs, and only then widening ingestion breadth.
