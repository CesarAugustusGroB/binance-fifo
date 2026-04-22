import type { TradeDto } from "@binance-fifo/binance-client";
import type { KnownSymbolCandidate } from "./discover-symbols";

export function mapSpotTradeDto(symbol: KnownSymbolCandidate, trade: TradeDto) {
  return {
    id: `SPOT:${trade.id}`,
    source: "SPOT",
    symbol: symbol.symbol,
    baseAsset: symbol.baseAsset,
    quoteAsset: symbol.quoteAsset,
    side: trade.isBuyer ? "BUY" : "SELL",
    qty: trade.qty,
    price: trade.price,
    quoteQty: trade.quoteQty,
    commission: trade.commission,
    commissionAsset: trade.commissionAsset,
    executedAt: new Date(trade.time),
    raw: trade
  } as const;
}
