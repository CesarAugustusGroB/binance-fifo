# binance-fifo

Local-only FIFO tax calculator for Binance (Spot + Convert + Dust + Deposits/Withdrawals + Earn).
Reads your account via the Binance REST API, stores everything in a local H2 file, runs FIFO
matching in EUR, and exports a CSV the Spanish tax workflow can consume.

See [`DESIGN.md`](./DESIGN.md) for the why.

## Quickstart

```bash
# 1. Set credentials (READ-only API key, IP-restricted if possible)
export BINANCE_API_KEY=...
export BINANCE_API_SECRET=...

# 2. Build
mvn clean package

# 3. Run the shell
java -jar target/binance-fifo-0.0.1-SNAPSHOT.jar
```

## Shell commands

```
ingest --from 2020-01-01 --to 2025-12-31
calculate-fifo
export --year 2025 --out ./report-2025.csv
status
manual-acquisition --asset BTC --qty 0.5 --cost-eur 9000 --date 2019-08-10
```

## Stack

- Spring Boot 3.3, Java 21
- WebFlux (async pagination of Binance endpoints)
- H2 file-based (`./data/fifo.mv.db`, gitignored)
- Flyway for schema versioning
- Spring Shell for the CLI

## Not in v1

Futures. PnL semantics are different (margin, funding, liquidations) and will be a follow-up.
