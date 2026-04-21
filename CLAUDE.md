# binance-fifo

Local-only FIFO tax calculator for Binance (Spot + Convert + Dust + Deposits/Withdrawals + Earn).
Pulls account history, stores it in a local H2 file, runs FIFO matching in EUR, exports a CSV
for the Spanish tax workflow. No cloud, no server, one machine.

## Tech Stack
- Java 21
- Spring Boot 3.3.5
- Spring WebFlux (async pagination of Binance endpoints)
- Spring Data JPA + H2 (file-based at `./data/fifo.mv.db`)
- Flyway (schema migrations in `src/main/resources/db/migration`)
- Spring Shell (CLI — no HTTP server exposed)
- Bucket4j (rate limiting for Binance weight budget)
- Maven

## Commands
- `mvn spring-boot:run` — start the interactive shell
- `mvn clean package` — build the fat JAR (`target/binance-fifo-0.0.1-SNAPSHOT.jar`)
- `mvn test` — run unit tests (FIFO engine, HMAC signer)
- `java -jar target/binance-fifo-0.0.1-SNAPSHOT.jar` — run the built JAR

### Shell commands inside the app
- `ingest [--from ISO] [--to ISO]` — pull trades + movements from Binance
- `calculate-fifo` — run the FIFO engine, write `realized_gains`
- `export --year N [--out PATH]` — write the CSV for a fiscal year
- `status` — ingestion coverage + last-sync per source
- `manual-acquisition --asset --qty --cost-eur --date` — inject pre-API holdings

## Project Structure
- `src/main/java/com/binancefifo/domain/` — pure domain (trade, fifo, movement). No Spring, no I/O.
- `src/main/java/com/binancefifo/application/` — use cases (Ingest, CalculateFifo, Export).
- `src/main/java/com/binancefifo/infrastructure/` — Binance HTTP, JPA, CSV, Spring Shell.
- `src/main/java/com/binancefifo/config/` — `@ConfigurationProperties`, `WebClient` bean.
- `src/main/resources/db/migration/` — Flyway SQL.
- `src/test/java/` — unit tests. FIFO engine and HmacSigner are the correctness-critical ones.
- `data/` — H2 database file lives here. Gitignored.

## Conventions
- Hexagonal lite: domain has no Spring; everything I/O lives in `infrastructure`.
- `BigDecimal` everywhere for money; `MathContext.DECIMAL64`. Never `double`.
- Persist timestamps in UTC; convert to `Europe/Madrid` only at the export boundary.
- DTOs are `@JsonIgnoreProperties(ignoreUnknown = true)` — Binance `/sapi` drifts silently.
- Branch naming: `feature/<phase>-<slug>`, `bugfix/<slug>`, `hotfix/<slug>`, `release/<version>`.
- Commit style: Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`).
- Secrets: `BINANCE_API_KEY` / `BINANCE_API_SECRET` from env vars only. Never in git, never logged.

## Gitflow
- `main` — tagged releases only
- `develop` — integration; all feature branches PR into here
- `feature/*` — feature work (branched from `develop`)
- `release/*` — release prep (branched from `develop`, merged to both `main` and `develop`)
- `hotfix/*` — production fixes (branched from `main`, merged to both)

## Notion Board
- **Workspace**: https://www.notion.so/3496c88ed42481daacf6e32e287d40fb
- **Tasks DB**: https://www.notion.so/d03596a67c3f48b6ae0b50899babd9c7
- **Changelog DB**: https://www.notion.so/f64177768f9a41e783a11ffb4362b4de
- **Bugs DB**: https://www.notion.so/ac40df2aa7db4b8f8abca8bdaba6e164

Task IDs use the `BF-NN` prefix. Create new tasks via `/notion` or in Notion directly; commit
messages should reference the ID (`feat(BF-03): ...`).

## MCP Servers
- Notion (authenticated at user level) — used for the project board once set up.
- No project-specific MCPs yet. `.mcp.json` reserved for future custom servers.

## Key Documents
- `DESIGN.md` — architecture, data model, FIFO semantics, EUR pricing, failure modes.
