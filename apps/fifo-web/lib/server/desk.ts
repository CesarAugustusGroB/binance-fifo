import {
  countUncovered,
  listOpenLots,
  listRecentRealizedGains,
  listUncoveredDisposals,
  readLastRecomputeAt,
  readRealizedTotals
} from "@binance-fifo/db";
import { Decimal, decimal, madridYear } from "@binance-fifo/shared";

export const TAX_RATE_BASE = 0.21;

export interface DeskLot {
  sourceId: string;
  qty: string;
  costPerUnitEur: string;
  acquiredAt: Date;
}

export interface DeskAsset {
  symbol: string;
  totalQty: string;
  avgCostEur: string;
  lots: DeskLot[];
}

export interface DeskLedgerEntry {
  sellSourceId: string;
  asset: string;
  executedAt: Date;
  qty: string;
  proceedsEur: string;
  costEur: string;
  realizedEur: string;
  matched: Array<{
    buySourceId: string | null;
    qty: string;
    costEur: string;
    acquiredAt: Date;
  }>;
}

export async function readOpenLots(): Promise<DeskAsset[]> {
  const rows = await listOpenLots();
  const byAsset = new Map<string, DeskAsset>();

  for (const row of rows) {
    let bucket = byAsset.get(row.asset);
    if (!bucket) {
      bucket = {
        symbol: row.asset,
        totalQty: "0",
        avgCostEur: "0",
        lots: []
      };
      byAsset.set(row.asset, bucket);
    }
    bucket.lots.push({
      sourceId: row.sourceId,
      qty: row.qty,
      costPerUnitEur: row.costPerUnitEur,
      acquiredAt: new Date(row.acquiredAt)
    });
  }

  for (const bucket of byAsset.values()) {
    let totalQty = decimal(0);
    let totalCost = decimal(0);
    for (const lot of bucket.lots) {
      const qty = decimal(lot.qty);
      const cost = decimal(lot.costPerUnitEur).mul(qty);
      totalQty = totalQty.plus(qty);
      totalCost = totalCost.plus(cost);
    }
    bucket.totalQty = totalQty.toFixed();
    bucket.avgCostEur = totalQty.gt(0) ? totalCost.div(totalQty).toFixed() : "0";
  }

  return [...byAsset.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
}

export async function readRecentLedger(limit = 50): Promise<DeskLedgerEntry[]> {
  const rows = await listRecentRealizedGains(limit);
  const bySell = new Map<string, DeskLedgerEntry>();

  for (const row of rows) {
    const sellKey = row.sellSourceId ?? `GAIN:${row.id}`;
    let entry = bySell.get(sellKey);
    if (!entry) {
      entry = {
        sellSourceId: sellKey,
        asset: row.asset,
        executedAt: new Date(row.disposalDate),
        qty: "0",
        proceedsEur: "0",
        costEur: "0",
        realizedEur: "0",
        matched: []
      };
      bySell.set(sellKey, entry);
    }
    entry.qty = decimal(entry.qty).plus(decimal(row.qty)).toFixed();
    entry.proceedsEur = decimal(entry.proceedsEur)
      .plus(decimal(row.disposalValueEur))
      .toFixed();
    entry.costEur = decimal(entry.costEur).plus(decimal(row.acquisitionCostEur)).toFixed();
    entry.realizedEur = decimal(entry.realizedEur).plus(decimal(row.pnlEur)).toFixed();
    entry.matched.push({
      buySourceId: row.buySourceId,
      qty: row.qty,
      costEur: row.acquisitionCostEur,
      acquiredAt: new Date(row.acquisitionDate)
    });
  }

  return [...bySell.values()].sort(
    (a, b) => b.executedAt.getTime() - a.executedAt.getTime()
  );
}

export async function readUncovered() {
  const rows = await listUncoveredDisposals();
  return rows.map((row) => ({
    id: row.id,
    asset: row.asset,
    qty: row.qty,
    valueEur: row.valueEur,
    occurredAt: new Date(row.occurredAt),
    sourceId: row.sourceId,
    reason: row.reason
  }));
}

export interface DeskSummary {
  year: number;
  costBasisEur: string;
  realizedEur: string;
  realizedByAsset: Array<{
    asset: string;
    proceedsEur: string;
    costEur: string;
    realizedEur: string;
    disposals: number;
  }>;
  taxProjectionEur: string;
  uncoveredCount: number;
  lastRecomputeAt: Date | null;
}

export async function readDeskSummary(year?: number): Promise<DeskSummary> {
  const targetYear = year ?? madridYear(new Date());
  const yearStart = new Date(Date.UTC(targetYear, 0, 1));
  const yearEnd = new Date(Date.UTC(targetYear + 1, 0, 1));

  const [lots, realizedRows, lastAt, uncoveredCount] = await Promise.all([
    listOpenLots(),
    readRealizedTotals(yearStart, yearEnd),
    readLastRecomputeAt(),
    countUncovered()
  ]);

  let costBasis = decimal(0);
  for (const lot of lots) {
    costBasis = costBasis.plus(decimal(lot.qty).mul(decimal(lot.costPerUnitEur)));
  }

  let realized = decimal(0);
  const realizedByAsset = realizedRows.map((row) => {
    const r: Decimal = decimal(row.pnl ?? "0");
    realized = realized.plus(r);
    return {
      asset: row.asset,
      proceedsEur: decimal(row.proceeds ?? "0").toFixed(),
      costEur: decimal(row.cost ?? "0").toFixed(),
      realizedEur: r.toFixed(),
      disposals: Number(row.disposals ?? 0)
    };
  });

  const taxProjection = realized.gt(0)
    ? realized.mul(TAX_RATE_BASE)
    : decimal(0);

  return {
    year: targetYear,
    costBasisEur: costBasis.toFixed(),
    realizedEur: realized.toFixed(),
    realizedByAsset,
    taxProjectionEur: taxProjection.toFixed(),
    uncoveredCount,
    lastRecomputeAt: lastAt ? new Date(lastAt) : null
  };
}
