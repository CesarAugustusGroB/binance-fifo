import Link from "next/link";

import { readStatusSnapshot } from "../lib/server/status";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const requiredEnv = [
    "BINANCE_API_KEY",
    "BINANCE_API_SECRET",
    "DATABASE_URL",
    "INNGEST_EVENT_KEY",
    "INNGEST_SIGNING_KEY",
    "INTERNAL_API_TOKEN"
  ];
  const missingEnv = requiredEnv.filter((name) => !process.env[name]);

  const status =
    missingEnv.length === 0
      ? await readStatusSnapshot().catch(() => ({
          tradeCount: 0,
          movementCount: 0,
          gainCount: 0,
          cursors: [],
          setupMissing: []
        }))
      : {
          tradeCount: 0,
          movementCount: 0,
          gainCount: 0,
          cursors: [],
          setupMissing: missingEnv
        };

  const ready = status.setupMissing.length === 0;

  return (
    <main className="page-shell">
      <section className="hero">
        <span className="eyebrow">
          <span className="dot" />
          {ready ? "Workspace online · FIFO engine ready" : "Configuration pending"}
        </span>
        <h1>
          Welcome back.
          <span className="accent">Your FIFO desk is ready.</span>
        </h1>
        <p>
          Raw Binance payloads stored in PostgreSQL, FIFO gains recomputed in EUR with
          deterministic decimal math, and CLI workflows exposed through authenticated routes
          and durable Inngest jobs.
        </p>
      </section>

      {!ready ? (
        <section className="panel" style={{ marginBottom: 24, borderColor: "rgba(255, 184, 107, 0.3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span className="badge warn">Setup required</span>
          </div>
          <p className="muted" style={{ margin: "0 0 12px" }}>
            The app is running, but it cannot query Binance or Postgres until the following
            environment variables are configured.
          </p>
          <pre>{status.setupMissing.join("\n")}</pre>
          <p className="muted" style={{ margin: "12px 0 0" }}>
            Add them to <code>apps/fifo-web/.env.local</code> or the repo root, then restart{" "}
            <code>corepack pnpm dev</code>.
          </p>
        </section>
      ) : null}

      <section className="grid">
        <article className="panel">
          <h2>Trades</h2>
          <div className="stat accent">{status.tradeCount.toLocaleString()}</div>
          <p className="muted" style={{ marginTop: 8 }}>Stored raw trade rows</p>
        </article>
        <article className="panel">
          <h2>Movements</h2>
          <div className="stat">{status.movementCount.toLocaleString()}</div>
          <p className="muted" style={{ marginTop: 8 }}>Deposits, withdrawals, rewards, manual acquisitions</p>
        </article>
        <article className="panel">
          <h2>Realized gains</h2>
          <div className="stat">{status.gainCount.toLocaleString()}</div>
          <p className="muted" style={{ marginTop: 8 }}>Current recompute output rows</p>
        </article>
      </section>

      <section className="panel" style={{ marginTop: 24 }}>
        <h2>Control plane</h2>
        <div className="actions" style={{ marginTop: 8 }}>
          <Link className="button" href="/trades">
            Browse trades →
          </Link>
          <Link className="button secondary" href="/api/status">
            Status endpoint
          </Link>
        </div>
      </section>

      <section className="grid" style={{ marginTop: 24 }}>
        <article className="panel">
          <h3>Latest cursors</h3>
          {status.cursors.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Symbol</th>
                  <th>Last sync</th>
                </tr>
              </thead>
              <tbody>
                {status.cursors.map((cursor) => (
                  <tr key={`${cursor.source}:${cursor.symbol}`}>
                    <td>{cursor.source}</td>
                    <td>{cursor.symbol || "—"}</td>
                    <td>{cursor.lastSyncAt ? new Date(cursor.lastSyncAt).toISOString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">No ingestion cursors yet.</p>
          )}
        </article>

        <article className="panel">
          <h3>Manual acquisition</h3>
          <p className="muted" style={{ margin: "0 0 12px" }}>
            Use the authenticated API route to cover uncovered disposals with historic holdings.
          </p>
          <pre>{`curl -X POST /api/manual-acquisition \\
  -H "Authorization: Bearer $INTERNAL_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"asset":"BTC","qty":"0.5","costEur":"9000","date":"2019-08-10T00:00:00Z"}'`}</pre>
        </article>
      </section>
    </main>
  );
}
