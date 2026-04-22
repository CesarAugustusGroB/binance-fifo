import { decimal } from "@binance-fifo/shared";
import { describe, expect, it } from "vitest";

import { FifoEngine } from "./engine";
import type { AssetEvent } from "./types";

function acquisition(
  qty: string,
  costEur: string,
  at: string,
  sequence: number,
  sourceId: string
): AssetEvent {
  return {
    type: "ACQUISITION",
    asset: "BTC",
    qty: decimal(qty),
    costEur: decimal(costEur),
    at: new Date(at),
    sequence,
    sourceId
  };
}

function disposal(
  qty: string,
  valueEur: string,
  at: string,
  sequence: number,
  sourceId: string
): AssetEvent {
  return {
    type: "DISPOSAL",
    asset: "BTC",
    qty: decimal(qty),
    valueEur: decimal(valueEur),
    at: new Date(at),
    sequence,
    sourceId
  };
}

describe("FifoEngine", () => {
  it("matches a single buy and sell", () => {
    const engine = new FifoEngine();
    engine.apply([
      acquisition("1", "10000", "2024-01-01T00:00:00.000Z", 0, "buy-1"),
      disposal("1", "15000", "2024-06-01T00:00:00.000Z", 0, "sell-1")
    ]);

    expect(engine.gains).toHaveLength(1);
    expect(engine.gains[0]?.pnlEur.toFixed()).toBe("5000");
  });

  it("tracks uncovered disposals instead of throwing", () => {
    const engine = new FifoEngine();
    engine.apply([
      disposal("1", "15000", "2024-06-01T00:00:00.000Z", 0, "sell-1")
    ]);

    expect(engine.gains).toHaveLength(0);
    expect(engine.uncovered).toHaveLength(1);
    expect(engine.uncovered[0]?.remainingQty.toFixed()).toBe("1");
  });

  it("splits one sell across multiple lots", () => {
    const engine = new FifoEngine();
    engine.apply([
      acquisition("0.25", "5000", "2024-01-01T00:00:00.000Z", 0, "buy-1"),
      acquisition("0.25", "6000", "2024-02-01T00:00:00.000Z", 0, "buy-2"),
      acquisition("0.5", "14000", "2024-03-01T00:00:00.000Z", 0, "buy-3"),
      disposal("0.6", "18000", "2024-06-01T00:00:00.000Z", 0, "sell-1")
    ]);

    expect(engine.gains).toHaveLength(3);
    expect(engine.gains[0]?.qty.toFixed()).toBe("0.25");
    expect(engine.gains[1]?.qty.toFixed()).toBe("0.25");
    expect(engine.gains[2]?.qty.toFixed()).toBe("0.1");
  });
});
