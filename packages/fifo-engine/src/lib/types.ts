import type { Decimal } from "@binance-fifo/shared";

export interface Lot {
  qty: Decimal;
  costPerUnit: Decimal;
  at: Date;
  sourceId: string;
}

interface BaseEvent {
  asset: string;
  qty: Decimal;
  at: Date;
  sequence: number;
  sourceId: string;
}

export interface AcquisitionEvent extends BaseEvent {
  type: "ACQUISITION";
  costEur: Decimal;
}

export interface DisposalEvent extends BaseEvent {
  type: "DISPOSAL";
  valueEur: Decimal;
}

export type AssetEvent = AcquisitionEvent | DisposalEvent;

export interface RealizedGain {
  asset: string;
  qty: Decimal;
  acquisitionDate: Date;
  acquisitionCostEur: Decimal;
  disposalDate: Date;
  disposalValueEur: Decimal;
  pnlEur: Decimal;
  buySourceId: string;
  sellSourceId: string;
}

export interface UncoveredDisposal {
  event: DisposalEvent;
  remainingQty: Decimal;
}

export interface PersistedTrade {
  id: string;
  source: "SPOT" | "CONVERT" | "DUST";
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  side: "BUY" | "SELL";
  qty: Decimal;
  price: Decimal;
  quoteQty: Decimal;
  commission: Decimal;
  commissionAsset: string | null;
  executedAt: Date;
}

export interface PersistedMovement {
  id: string;
  type:
    | "DEPOSIT"
    | "WITHDRAWAL"
    | "STAKING_REWARD"
    | "EARN_REWARD"
    | "MANUAL_ACQUISITION";
  asset: string;
  amount: Decimal;
  fee: Decimal | null;
  occurredAt: Date;
  costBasisEur?: Decimal;
}
