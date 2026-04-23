import type {
  DepositDto,
  TradeDto,
  WithdrawalDto
} from "@binance-fifo/binance-client";
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

export function mapDepositDto(dto: DepositDto) {
  return {
    id: `DEPOSIT:${dto.id}`,
    type: "DEPOSIT" as const,
    asset: dto.coin,
    amount: dto.amount,
    fee: null,
    occurredAt: new Date(dto.insertTime),
    raw: dto,
    metadata: null
  };
}

export function mapWithdrawalDto(dto: WithdrawalDto) {
  const applyMs = Date.parse(dto.applyTime);
  const occurredAt = Number.isFinite(applyMs) ? new Date(applyMs) : new Date();
  return {
    id: `WITHDRAWAL:${dto.id}`,
    type: "WITHDRAWAL" as const,
    asset: dto.coin,
    amount: dto.amount,
    fee: null,
    occurredAt,
    raw: dto,
    metadata: null
  };
}
