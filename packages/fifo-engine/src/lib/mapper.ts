import { decimal } from "@binance-fifo/shared";

import type { AssetEvent, PersistedMovement, PersistedTrade } from "./types";
import type { PriceResolver } from "./price-resolver";

export async function mapTradesAndMovementsToAssetEvents(
  trades: PersistedTrade[],
  movements: PersistedMovement[],
  priceResolver: PriceResolver
): Promise<AssetEvent[]> {
  const tradeEvents = await Promise.all(
    trades.flatMap((trade) => mapTradeToEvents(trade, priceResolver))
  );
  const movementEvents = await Promise.all(
    movements.map((movement) => mapMovementToEvent(movement, priceResolver))
  );

  return [...tradeEvents.flat(), ...movementEvents];
}

async function mapTradeToEvents(
  trade: PersistedTrade,
  priceResolver: PriceResolver
): Promise<AssetEvent[]> {
  const quoteToEur = await priceResolver.toEur(trade.quoteAsset, trade.executedAt);
  const quoteValueEur = trade.quoteQty.mul(quoteToEur);
  const commissionEur =
    trade.commissionAsset && trade.commission.gt(0)
      ? trade.commission.mul(
          await priceResolver.toEur(trade.commissionAsset, trade.executedAt)
        )
      : decimal(0);

  if (trade.side === "BUY") {
    return [
      {
        type: "ACQUISITION",
        asset: trade.baseAsset,
        qty: trade.qty,
        costEur: quoteValueEur.plus(commissionEur),
        at: trade.executedAt,
        sequence: 0,
        sourceId: trade.id
      },
      {
        type: "DISPOSAL",
        asset: trade.quoteAsset,
        qty: trade.quoteQty,
        valueEur: quoteValueEur,
        at: trade.executedAt,
        sequence: 1,
        sourceId: `${trade.id}:quote`
      }
    ];
  }

  return [
    {
      type: "DISPOSAL",
      asset: trade.baseAsset,
      qty: trade.qty,
      valueEur: quoteValueEur.minus(commissionEur),
      at: trade.executedAt,
      sequence: 0,
      sourceId: trade.id
    },
    {
      type: "ACQUISITION",
      asset: trade.quoteAsset,
      qty: trade.quoteQty,
      costEur: quoteValueEur,
      at: trade.executedAt,
      sequence: 1,
      sourceId: `${trade.id}:quote`
    }
  ];
}

async function mapMovementToEvent(
  movement: PersistedMovement,
  priceResolver: PriceResolver
): Promise<AssetEvent> {
  const price = await priceResolver.toEur(movement.asset, movement.occurredAt);
  const totalValue = movement.amount.mul(price);

  if (
    movement.type === "DEPOSIT" ||
    movement.type === "STAKING_REWARD" ||
    movement.type === "EARN_REWARD" ||
    movement.type === "MANUAL_ACQUISITION"
  ) {
    return {
      type: "ACQUISITION",
      asset: movement.asset,
      qty: movement.amount,
      costEur: movement.costBasisEur ?? totalValue,
      at: movement.occurredAt,
      sequence: 0,
      sourceId: movement.id
    };
  }

  return {
    type: "DISPOSAL",
    asset: movement.asset,
    qty: movement.amount,
    valueEur: totalValue,
    at: movement.occurredAt,
    sequence: 0,
    sourceId: movement.id
  };
}
