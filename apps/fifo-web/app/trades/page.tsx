import { db, movements, trades } from "@binance-fifo/db";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function TradesPage() {
  if (!process.env.DATABASE_URL) {
    return (
      <main className="page-shell">
        <section className="hero">
          <span className="eyebrow">
            <span className="dot" />
            Operational view
          </span>
          <h1>
            Trades require
            <span className="accent">database configuration.</span>
          </h1>
          <p>
            Set <code>DATABASE_URL</code> in <code>.env.local</code> and restart the dev
            server before opening this page.
          </p>
        </section>
      </main>
    );
  }

  const [tradeRows, movementRows] = await Promise.all([
    db.select().from(trades).orderBy(desc(trades.executedAt)).limit(25),
    db.select().from(movements).orderBy(desc(movements.occurredAt)).limit(25)
  ]).catch(() => [[], []] as const);

  return (
    <main className="page-shell">
      <section className="hero">
        <span className="eyebrow">
          <span className="dot" />
          Operational view · Last 25 rows
        </span>
        <h1>
          Recent imported rows.
          <span className="accent">Raw ledger snapshot.</span>
        </h1>
        <p>Payloads stay in Postgres; this page is only the quick operator surface.</p>
      </section>

      <section className="panel">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Trades</h2>
          <span className="badge ok">{tradeRows.length} rows</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Executed</th>
              <th>Symbol</th>
              <th>Side</th>
              <th>Qty</th>
              <th>Quote qty</th>
            </tr>
          </thead>
          <tbody>
            {tradeRows.map((row) => (
              <tr key={row.id}>
                <td>{row.executedAt.toISOString()}</td>
                <td>{row.symbol}</td>
                <td>
                  <span className="badge" style={{
                    color: row.side === "BUY" ? "var(--accent)" : "var(--danger)",
                    borderColor: row.side === "BUY" ? "var(--border-strong)" : "rgba(255,107,107,0.3)"
                  }}>{row.side}</span>
                </td>
                <td>{row.qty}</td>
                <td>{row.quoteQty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel" style={{ marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Movements</h2>
          <span className="badge ok">{movementRows.length} rows</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Occurred</th>
              <th>Type</th>
              <th>Asset</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {movementRows.map((row) => (
              <tr key={row.id}>
                <td>{row.occurredAt.toISOString()}</td>
                <td>{row.type}</td>
                <td>{row.asset}</td>
                <td>{row.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
