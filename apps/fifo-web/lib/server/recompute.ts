import { BinanceClient } from "@binance-fifo/binance-client";
import { loadTradesAndMovements, replaceRealizedGains } from "@binance-fifo/db";
import {
  FifoEngine,
  mapTradesAndMovementsToAssetEvents,
  type PersistedMovement,
  type PersistedTrade
} from "@binance-fifo/fifo-engine";
import { decimal, readBinanceEnv } from "@binance-fifo/shared";

import { BinancePriceResolver } from "./price-resolver";

function toTradeDomain(
  row: Awaited<ReturnType<typeof loadTradesAndMovements>>["tradeRows"][number]
): PersistedTrade {
  return {
    id: row.id,
    source: row.source as PersistedTrade["source"],
    symbol: row.symbol,
    baseAsset: row.baseAsset,
    quoteAsset: row.quoteAsset,
    side: row.side as PersistedTrade["side"],
    qty: decimal(row.qty),
    price: decimal(row.price),
    quoteQty: decimal(row.quoteQty),
    commission: decimal(row.commission ?? "0"),
    commissionAsset: row.commissionAsset,
    executedAt: new Date(row.executedAt)
  };
}

function toMovementDomain(
  row: Awaited<ReturnType<typeof loadTradesAndMovements>>["movementRows"][number]
): PersistedMovement {
  return {
    id: row.id,
    type: row.type as PersistedMovement["type"],
    asset: row.asset,
    amount: decimal(row.amount),
    fee: row.fee ? decimal(row.fee) : null,
    occurredAt: new Date(row.occurredAt),
    costBasisEur:
      row.type === "MANUAL_ACQUISITION" &&
      row.metadata &&
      typeof row.metadata === "object" &&
      "costEur" in row.metadata &&
      typeof row.metadata.costEur === "string"
        ? decimal(row.metadata.costEur)
        : undefined
  };
}

export async function recomputeRealizedGains() {
  const env = readBinanceEnv();
  const client = new BinanceClient({
    apiKey: env.BINANCE_API_KEY,
    secret: env.BINANCE_API_SECRET
  });
  const resolver = new BinancePriceResolver(client);
  const { tradeRows, movementRows } = await loadTradesAndMovements();

  const domainTrades = tradeRows.map(toTradeDomain);
  const domainMovements = movementRows.map(toMovementDomain);
  const events = await mapTradesAndMovementsToAssetEvents(
    domainTrades,
    domainMovements,
    resolver
  );

  const engine = new FifoEngine();
  engine.apply(events);

  await replaceRealizedGains(
    engine.gains.map((gain) => ({
      asset: gain.asset,
      qty: gain.qty.toFixed(),
      acquisitionDate: gain.acquisitionDate,
      acquisitionCostEur: gain.acquisitionCostEur.toFixed(),
      disposalDate: gain.disposalDate,
      disposalValueEur: gain.disposalValueEur.toFixed(),
      pnlEur: gain.pnlEur.toFixed(),
      buySourceId: gain.buySourceId,
      sellSourceId: gain.sellSourceId
    }))
  );

  return {
    gains: engine.gains.length,
    uncovered: engine.uncovered.map((entry) => ({
      asset: entry.event.asset,
      remainingQty: entry.remainingQty.toFixed(),
      sourceId: entry.event.sourceId
    }))
  };
}

export async function warmPriceCache() {
  const env = readBinanceEnv();
  const client = new BinanceClient({
    apiKey: env.BINANCE_API_KEY,
    secret: env.BINANCE_API_SECRET
  });
  const resolver = new BinancePriceResolver(client);
  const { tradeRows, movementRows } = await loadTradesAndMovements();
  const timestamps = [
    ...tradeRows.map((row) => new Date(row.executedAt)),
    ...movementRows.map((row) => new Date(row.occurredAt))
  ];
  const assets = new Set([
    ...tradeRows.flatMap((row) => [row.baseAsset, row.quoteAsset, row.commissionAsset ?? ""]),
    ...movementRows.map((row) => row.asset)
  ]);

  for (const asset of assets) {
    if (!asset) {
      continue;
    }
    for (const timestamp of timestamps) {
      await resolver.toEur(asset, timestamp);
    }
  }

  return true;
}
