import { db, movements, trades } from "@binance-fifo/db";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function TradesPage() {
  const [tradeRows, movementRows] = await Promise.all([
    db.select().from(trades).orderBy(desc(trades.executedAt)).limit(25),
    db.select().from(movements).orderBy(desc(movements.occurredAt)).limit(25)
  ]);

  return (
    <main className="page-shell">
      <section className="hero">
        <span className="muted">Operational view</span>
        <h1>Recent imported rows.</h1>
        <p>Raw payloads stay in the database; this page is only the quick operator surface.</p>
      </section>

      <section className="panel">
        <h2>Trades</h2>
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
                <td>{row.side}</td>
                <td>{row.qty}</td>
                <td>{row.quoteQty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <h2>Movements</h2>
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
