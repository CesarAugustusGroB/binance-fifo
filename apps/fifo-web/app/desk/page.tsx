import Link from "next/link";

import { decimal } from "@binance-fifo/shared";

import {
  readDeskSummary,
  readOpenLots,
  readRecentLedger,
  readUncovered,
  type DeskAsset,
  type DeskLedgerEntry,
  type DeskSummary
} from "../../lib/server/desk";

export const dynamic = "force-dynamic";

type UncoveredRow = Awaited<ReturnType<typeof readUncovered>>[number];

interface DeskData {
  assets: DeskAsset[];
  ledger: DeskLedgerEntry[];
  uncovered: UncoveredRow[];
  summary: DeskSummary | null;
  setupMissing: boolean;
  error: string | null;
}

async function loadDesk(): Promise<DeskData> {
  if (!process.env.DATABASE_URL) {
    return { assets: [], ledger: [], uncovered: [], summary: null, setupMissing: true, error: null };
  }
  try {
    const [assets, ledger, uncovered, summary] = await Promise.all([
      readOpenLots(),
      readRecentLedger(25),
      readUncovered(),
      readDeskSummary()
    ]);
    return { assets, ledger, uncovered, summary, setupMissing: false, error: null };
  } catch (error) {
    return {
      assets: [],
      ledger: [],
      uncovered: [],
      summary: null,
      setupMissing: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function fmtEur(n: string | number) {
  const value = typeof n === "string" ? parseFloat(n) : n;
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(Number.isFinite(value) ? value : 0);
}

function fmtQty(n: string | number, digits = 4) {
  const value = typeof n === "string" ? parseFloat(n) : n;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(
    Number.isFinite(value) ? value : 0
  );
}

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function bandFor(costPerUnit: string, avg: string): "deep" | "mid" | "high" {
  const cp = decimal(costPerUnit);
  const a = decimal(avg);
  if (a.eq(0)) return "mid";
  const ratio = cp.div(a).toNumber();
  if (ratio < 0.7) return "deep";
  if (ratio < 1.2) return "mid";
  return "high";
}

const BAND_VARS = {
  deep: "var(--desk-deep)",
  mid: "var(--desk-mid)",
  high: "var(--desk-high)"
};

function Sparkline({ points, color = "var(--accent)" }: { points: number[]; color?: string }) {
  const w = 140;
  const h = 34;
  if (points.length < 2) {
    return (
      <svg className="desk-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
        <line x1="0" y1={h / 2} x2={w} y2={h / 2} stroke={color} strokeWidth="1" strokeDasharray="2 3" opacity="0.3" />
      </svg>
    );
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(2)},${(h - ((p - min) / range) * h).toFixed(2)}`)
    .join(" ");
  return (
    <svg className="desk-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth="1.4" />
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={color} opacity="0.1" />
    </svg>
  );
}

function LotStack({ asset }: { asset: DeskAsset }) {
  const totalQty = parseFloat(asset.totalQty) || 0;
  if (totalQty <= 0) return null;

  return (
    <article className="desk-lot">
      <header className="desk-lot-head">
        <div>
          <div className="desk-lot-sym">{asset.symbol}</div>
          <div className="desk-lot-meta">
            {fmtQty(asset.totalQty)} held · avg {fmtEur(asset.avgCostEur)}
          </div>
        </div>
      </header>

      <div className="desk-lot-bar" role="group" aria-label={`${asset.symbol} lot composition`}>
        {asset.lots.map((lot) => {
          const w = ((parseFloat(lot.qty) || 0) / totalQty) * 100;
          const band = bandFor(lot.costPerUnitEur, asset.avgCostEur);
          return (
            <div
              key={lot.sourceId}
              className="desk-lot-seg"
              style={{ width: `${w}%`, background: BAND_VARS[band] }}
              title={`${lot.sourceId} · ${fmtQty(lot.qty)} @ ${fmtEur(lot.costPerUnitEur)}`}
            >
              <span className="desk-lot-seg-label">
                {lot.sourceId.split(":").pop()?.slice(0, 8)}
              </span>
            </div>
          );
        })}
      </div>

      <ol className="desk-lot-legend">
        {asset.lots.map((lot) => {
          const band = bandFor(lot.costPerUnitEur, asset.avgCostEur);
          return (
            <li key={lot.sourceId}>
              <span className="desk-legend-dot" style={{ background: BAND_VARS[band] }} />
              <span className="desk-legend-id" title={lot.sourceId}>
                {lot.sourceId.split(":").pop()?.slice(0, 10) ?? lot.sourceId}
              </span>
              <span className="desk-legend-date">{fmtDate(lot.acquiredAt)}</span>
              <span className="desk-legend-qty">{fmtQty(lot.qty)}</span>
              <span className="desk-legend-cost">{fmtEur(lot.costPerUnitEur)}</span>
              <span className="desk-legend-src">{lot.sourceId.split(":")[0]}</span>
            </li>
          );
        })}
      </ol>
    </article>
  );
}

function LedgerRow({ entry }: { entry: DeskLedgerEntry }) {
  const realized = parseFloat(entry.realizedEur) || 0;
  const proceeds = parseFloat(entry.proceedsEur) || 0;
  const pct = proceeds > 0 ? (realized / proceeds) * 100 : 0;

  return (
    <div className="desk-ledger-row">
      <div className="desk-ledger-head">
        <span className="desk-ledger-id" title={entry.sellSourceId}>
          {entry.sellSourceId.split(":").pop()?.slice(0, 10) ?? entry.sellSourceId}
        </span>
        <span className="desk-ledger-date">{fmtDate(entry.executedAt)}</span>
        <span className="desk-side sell">SELL</span>
        <span className="desk-ledger-sym">{entry.asset}</span>
        <span className="desk-ledger-qty">{fmtQty(entry.qty)}</span>
        <span className="desk-ledger-proc">{fmtEur(entry.proceedsEur)}</span>
        <span className={`desk-ledger-real ${realized >= 0 ? "pos" : "neg"}`}>
          {realized >= 0 ? "+" : ""}{fmtEur(entry.realizedEur)}
          <em> · {pct.toFixed(1)}%</em>
        </span>
      </div>
      <div className="desk-ledger-match">
        <span className="desk-connector" aria-hidden>└─</span>
        <span className="desk-match-label">matched</span>
        {entry.matched.map((m, idx) => {
          const qtyNum = parseFloat(m.qty) || 0;
          const unit = qtyNum > 0 ? parseFloat(m.costEur) / qtyNum : 0;
          return (
            <span key={`${m.buySourceId ?? "?"}-${idx}`} className="desk-match-chip">
              <em>{m.buySourceId?.split(":").pop()?.slice(0, 10) ?? "manual"}</em>
              <span>{fmtQty(m.qty)}</span>
              <span className="muted">@ {fmtEur(unit)}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default async function DeskPage() {
  const { assets, ledger, uncovered, summary, setupMissing, error } = await loadDesk();

  const totalMark = 0;
  const realizedYTD = summary ? parseFloat(summary.realizedEur) || 0 : 0;
  const costBasis = summary ? parseFloat(summary.costBasisEur) || 0 : 0;
  const unrealized = totalMark - costBasis;

  return (
    <main className="desk">
      <div className="desk-bg" aria-hidden />

      <header className="desk-head">
        <div className="desk-eyebrow">
          <span className="desk-eyebrow-dot" />
          LEDGER · FIFO · EUR · EUROPE/MADRID
          {summary?.lastRecomputeAt ? (
            <> · LAST RECOMPUTE {summary.lastRecomputeAt.toISOString().slice(0, 16).replace("T", " ")}Z</>
          ) : null}
        </div>
        <h1 className="desk-title">
          The <em>Desk</em>.
          <span className="desk-title-trail">&nbsp;/ manage positions, inspect disposals, reconcile gains.</span>
        </h1>
        <div className="desk-kpis">
          <div className="desk-kpi">
            <span className="desk-kpi-label">Cost basis</span>
            <span className="desk-kpi-val">{fmtEur(costBasis)}</span>
          </div>
          <div className="desk-kpi">
            <span className="desk-kpi-label">Open lots</span>
            <span className="desk-kpi-val">
              {assets.reduce((s, a) => s + a.lots.length, 0)}
            </span>
          </div>
          <div className="desk-kpi">
            <span className="desk-kpi-label">Uncovered</span>
            <span className={`desk-kpi-val ${uncovered.length > 0 ? "neg" : "pos"}`}>
              {uncovered.length}
            </span>
          </div>
          <div className="desk-kpi">
            <span className="desk-kpi-label">Realized {summary?.year ?? ""}</span>
            <span className={`desk-kpi-val ${realizedYTD >= 0 ? "pos" : "neg"}`}>
              {realizedYTD >= 0 ? "+" : ""}{fmtEur(realizedYTD)}
            </span>
            <Sparkline points={summary?.realizedByAsset.map((r) => parseFloat(r.realizedEur) / 1000) ?? []} />
          </div>
        </div>
      </header>

      {setupMissing ? (
        <section className="desk-section">
          <div className="panel" style={{ textAlign: "center" }}>
            <h2 style={{ margin: 0 }}>Database not configured</h2>
            <p className="muted" style={{ marginTop: 12 }}>
              Set <code>DATABASE_URL</code> in <code>.env.local</code>, run{" "}
              <code>corepack pnpm db:migrate</code>, then reload this page.
            </p>
          </div>
        </section>
      ) : error ? (
        <section className="desk-section">
          <div className="panel" style={{ borderColor: "rgba(255,107,107,0.3)" }}>
            <h2 style={{ margin: 0 }}>Failed to load desk</h2>
            <p className="muted" style={{ marginTop: 12 }}>{error}</p>
          </div>
        </section>
      ) : null}

      <section className="desk-tape" aria-label="holdings tape">
        <div className="desk-tape-track">
          {[...assets, ...assets].map((a, i) => (
            <span key={`${a.symbol}-${i}`} className="desk-tape-pill">
              <em>{a.symbol}</em>
              <span>{fmtQty(a.totalQty)}</span>
              <span className="muted">avg {fmtEur(a.avgCostEur)}</span>
            </span>
          ))}
          {assets.length === 0 ? (
            <span className="desk-tape-pill muted">
              <em>—</em>
              <span>no open lots yet</span>
            </span>
          ) : null}
        </div>
      </section>

      <div className="desk-grid">
        <aside className="desk-rail">
          <div className="desk-rail-group">
            <div className="desk-rail-label">Assets</div>
            <div className="desk-chip-row">
              {assets.length === 0 ? (
                <span className="muted" style={{ fontSize: "0.78rem" }}>none</span>
              ) : (
                assets.map((a) => (
                  <button key={a.symbol} className="desk-chip active" type="button">
                    {a.symbol}
                  </button>
                ))
              )}
            </div>
          </div>
          <div className="desk-rail-group">
            <div className="desk-rail-label">Actions</div>
            <Link className="button desk-action" href="/api/export">Export CSV →</Link>
            <form action="/api/recompute" method="post">
              <button className="button secondary desk-action" type="submit">
                Recompute FIFO
              </button>
            </form>
            <form action="/api/ingest" method="post">
              <button className="button secondary desk-action" type="submit">
                Sync Binance
              </button>
            </form>
          </div>
          <div className="desk-rail-group desk-rail-legend">
            <div className="desk-rail-label">Cost band</div>
            <div className="desk-legend-row">
              <span className="desk-legend-dot" style={{ background: "var(--desk-deep)" }} /> deep — &lt; 70% avg
            </div>
            <div className="desk-legend-row">
              <span className="desk-legend-dot" style={{ background: "var(--desk-mid)" }} /> mid — 70–120% avg
            </div>
            <div className="desk-legend-row">
              <span className="desk-legend-dot" style={{ background: "var(--desk-high)" }} /> high — ≥ 120% avg
            </div>
          </div>
        </aside>

        <div className="desk-main">
          <section className="desk-section">
            <div className="desk-section-head">
              <h2>Open lots</h2>
              <span className="desk-section-note">
                {assets.length} assets · {assets.reduce((s, a) => s + a.lots.length, 0)} lots
              </span>
            </div>
            <div className="desk-lots">
              {assets.length === 0 ? (
                <p className="muted">No open lots yet — sync Binance or add a manual acquisition.</p>
              ) : (
                assets.map((a) => <LotStack key={a.symbol} asset={a} />)
              )}
            </div>
          </section>

          <section className="desk-section">
            <div className="desk-section-head">
              <h2>FIFO ledger</h2>
              <span className="desk-section-note">{ledger.length} recent disposals</span>
            </div>
            <div className="desk-ledger">
              <div className="desk-ledger-colhead">
                <span>ID</span>
                <span>DATE</span>
                <span>SIDE</span>
                <span>SYMBOL</span>
                <span>QTY</span>
                <span>PROCEEDS</span>
                <span>REALIZED</span>
              </div>
              {ledger.length === 0 ? (
                <div style={{ padding: 24 }}>
                  <p className="muted" style={{ margin: 0 }}>No disposals yet.</p>
                </div>
              ) : (
                ledger.map((entry) => <LedgerRow key={entry.sellSourceId} entry={entry} />)
              )}
            </div>
          </section>

          <section className="desk-section">
            <div className="desk-section-head">
              <h2>Realized P/L — by asset</h2>
              <span className="desk-section-note">period: {summary?.year ?? "—"}</span>
            </div>
            <table className="desk-realized">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Disposals</th>
                  <th>Proceeds</th>
                  <th>Cost</th>
                  <th>Realized</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                {(summary?.realizedByAsset ?? []).map((r) => {
                  const real = parseFloat(r.realizedEur) || 0;
                  return (
                    <tr key={r.asset}>
                      <td><em>{r.asset}</em></td>
                      <td>{r.disposals}</td>
                      <td>{fmtEur(r.proceedsEur)}</td>
                      <td>{fmtEur(r.costEur)}</td>
                      <td className={real >= 0 ? "pos" : "neg"}>
                        {real >= 0 ? "+" : ""}{fmtEur(r.realizedEur)}
                      </td>
                      <td><Sparkline points={[0, real / 1000, real / 500, real / 1000]} /></td>
                    </tr>
                  );
                })}
                {(!summary || summary.realizedByAsset.length === 0) ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: 24 }} className="muted">
                      No realized gains for this period.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
        </div>

        <aside className="desk-summary">
          <div className="desk-summary-card">
            <div className="desk-rail-label">Tax projection · {summary?.year ?? ""}</div>
            <div className="desk-summary-big">
              {fmtEur(parseFloat(summary?.taxProjectionEur ?? "0") || 0)}
            </div>
            <div className="muted">Estimated at 21% base rate · Spain general savings.</div>
            <div className="desk-summary-breakdown">
              <div>
                <span>Realized</span>
                <strong>{fmtEur(realizedYTD)}</strong>
              </div>
              <div>
                <span>Unrealized</span>
                <strong>{unrealized === 0 ? "—" : fmtEur(unrealized)}</strong>
              </div>
            </div>
          </div>

          <div className="desk-summary-card">
            <div className="desk-rail-label">Uncovered queue</div>
            {uncovered.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                All disposals covered.
              </p>
            ) : (
              <div className="desk-uncov">
                {uncovered.slice(0, 6).map((row) => (
                  <div key={row.id} className="desk-uncov-row">
                    <span>{row.asset}</span>
                    <strong>-{fmtQty(row.qty)}</strong>
                    <span className="badge warn">{row.reason ?? "uncovered"}</span>
                  </div>
                ))}
              </div>
            )}
            <button className="button secondary desk-action" type="button">
              Manual acquisition →
            </button>
          </div>

          <div className="desk-summary-card desk-quote">
            <blockquote>
              &ldquo;First in, first out — the honest order of things.&rdquo;
            </blockquote>
            <footer>— the ledger, always</footer>
          </div>
        </aside>
      </div>
    </main>
  );
}
