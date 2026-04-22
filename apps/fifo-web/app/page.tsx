import Link from "next/link";

import { readStatusSnapshot } from "../lib/server/status";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const status = await readStatusSnapshot();

  return (
    <main className="page-shell">
      <section className="hero">
        <span className="muted">Next.js 15 + Drizzle + Neon + Inngest</span>
        <h1>Binance FIFO rebuilt around reusable packages and durable jobs.</h1>
        <p>
          This workspace stores raw Binance payloads in PostgreSQL, recomputes FIFO gains in
          EUR with deterministic decimal math, and exposes the old CLI workflows through
          authenticated routes and automation-friendly jobs.
        </p>
      </section>

      <section className="grid">
        <article className="panel">
          <h2>Trades</h2>
          <div className="stat">{status.tradeCount}</div>
          <p className="muted">Stored raw trade rows</p>
        </article>
        <article className="panel">
          <h2>Movements</h2>
          <div className="stat">{status.movementCount}</div>
          <p className="muted">Deposits, withdrawals, rewards, manual acquisitions</p>
        </article>
        <article className="panel">
          <h2>Realized gains</h2>
          <div className="stat">{status.gainCount}</div>
          <p className="muted">Current recompute output rows</p>
        </article>
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <h2>Control plane</h2>
        <div className="actions">
          <Link className="button secondary" href="/trades">
            Browse trades
          </Link>
        </div>
      </section>

      <section className="grid" style={{ marginTop: 16 }}>
        <article className="panel">
          <h3>Latest cursors</h3>
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
                  <td>{cursor.symbol || "-"}</td>
                  <td>{cursor.lastSyncAt ? new Date(cursor.lastSyncAt).toISOString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="panel">
          <h3>Manual acquisition</h3>
          <p className="muted">
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
