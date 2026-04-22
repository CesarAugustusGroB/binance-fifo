import { Decimal, decimal } from "@binance-fifo/shared";

import type {
  AcquisitionEvent,
  AssetEvent,
  DisposalEvent,
  Lot,
  RealizedGain,
  UncoveredDisposal
} from "./types";

export class FifoEngine {
  private readonly queues = new Map<string, Lot[]>();

  readonly gains: RealizedGain[] = [];
  readonly uncovered: UncoveredDisposal[] = [];

  apply(events: AssetEvent[]): void {
    const sorted = [...events].sort(
      (left, right) =>
        left.at.getTime() - right.at.getTime() || left.sequence - right.sequence
    );

    for (const event of sorted) {
      if (event.type === "ACQUISITION") {
        this.processAcquisition(event);
      } else {
        this.processDisposal(event);
      }
    }
  }

  openLots(): ReadonlyMap<string, readonly Lot[]> {
    return this.queues;
  }

  private processAcquisition(event: AcquisitionEvent): void {
    const queue = this.queues.get(event.asset) ?? [];
    queue.push({
      qty: event.qty,
      costPerUnit: event.costEur.div(event.qty),
      at: event.at,
      sourceId: event.sourceId
    });
    this.queues.set(event.asset, queue);
  }

  private processDisposal(event: DisposalEvent): void {
    let remaining = event.qty;
    const proceedsPerUnit = event.valueEur.div(event.qty);
    const queue = this.queues.get(event.asset) ?? [];

    while (remaining.gt(0) && queue.length > 0) {
      const lot = queue[0];
      const matched = Decimal.min(remaining, lot.qty);
      const cost = matched.mul(lot.costPerUnit);
      const proceeds = matched.mul(proceedsPerUnit);

      this.gains.push({
        asset: event.asset,
        qty: matched,
        acquisitionDate: lot.at,
        acquisitionCostEur: cost,
        disposalDate: event.at,
        disposalValueEur: proceeds,
        pnlEur: proceeds.minus(cost),
        buySourceId: lot.sourceId,
        sellSourceId: event.sourceId
      });

      lot.qty = lot.qty.minus(matched);
      if (lot.qty.eq(0)) {
        queue.shift();
      }

      remaining = remaining.minus(matched);
    }

    if (remaining.gt(0)) {
      this.uncovered.push({
        event,
        remainingQty: decimal(remaining)
      });
    }
  }
}
