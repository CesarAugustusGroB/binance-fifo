import { describe, expect, it } from "vitest";

import {
  buildExchangeMetadataIndex,
  createRediscoveryPlan,
  discoverBalanceSymbols,
  reuseKnownSymbols,
  type StoredKnownSymbol
} from "./discover-symbols";

describe("discover-symbols", () => {
  it("validates balance-derived candidates against exchange metadata", () => {
    const result = discoverBalanceSymbols(
      {
        balances: [
          { asset: "BTC", free: "0.5", locked: "0" },
          { asset: "ETH", free: "0", locked: "0" },
          { asset: "ADA", free: "10", locked: "0" }
        ]
      },
      {
        symbols: [
          {
            symbol: "BTCEUR",
            status: "TRADING",
            baseAsset: "BTC",
            quoteAsset: "EUR",
            isSpotTradingAllowed: true
          },
          {
            symbol: "ADABTC",
            status: "TRADING",
            baseAsset: "ADA",
            quoteAsset: "BTC",
            isSpotTradingAllowed: true
          },
          {
            symbol: "ADAUSDT",
            status: "TRADING",
            baseAsset: "ADA",
            quoteAsset: "USDT",
            isSpotTradingAllowed: false
          }
        ]
      }
    );

    expect(result).toEqual([
      { symbol: "BTCEUR", baseAsset: "BTC", quoteAsset: "EUR" },
      { symbol: "ADABTC", baseAsset: "ADA", quoteAsset: "BTC" }
    ]);
  });

  it("reuses only active known symbols that still exist in exchange metadata", () => {
    const knownSymbols: StoredKnownSymbol[] = [
      {
        symbol: "BTCEUR",
        baseAsset: "BTC",
        quoteAsset: "EUR",
        isActive: true
      },
      {
        symbol: "OLDPAIR",
        baseAsset: "OLD",
        quoteAsset: "PAIR",
        isActive: true
      },
      {
        symbol: "ADABTC",
        baseAsset: "ADA",
        quoteAsset: "BTC",
        isActive: false
      }
    ];

    const result = reuseKnownSymbols(knownSymbols, {
      symbols: [
        {
          symbol: "BTCEUR",
          status: "TRADING",
          baseAsset: "BTC",
          quoteAsset: "EUR",
          isSpotTradingAllowed: true
        },
        {
          symbol: "ADABTC",
          status: "TRADING",
          baseAsset: "ADA",
          quoteAsset: "BTC",
          isSpotTradingAllowed: true
        }
      ]
    });

    expect(result).toEqual([{ symbol: "BTCEUR", baseAsset: "BTC", quoteAsset: "EUR" }]);
  });

  it("builds a rediscovery plan that reuses active rows, probes the rest, and deactivates stale rows", () => {
    const knownSymbols: StoredKnownSymbol[] = [
      {
        symbol: "BTCEUR",
        baseAsset: "BTC",
        quoteAsset: "EUR",
        isActive: true
      },
      {
        symbol: "STALEPAIR",
        baseAsset: "STALE",
        quoteAsset: "PAIR",
        isActive: true
      },
      {
        symbol: "ADABTC",
        baseAsset: "ADA",
        quoteAsset: "BTC",
        isActive: false
      }
    ];

    const result = createRediscoveryPlan(knownSymbols, {
      symbols: [
        {
          symbol: "BTCEUR",
          status: "TRADING",
          baseAsset: "BTC",
          quoteAsset: "EUR",
          isSpotTradingAllowed: true
        },
        {
          symbol: "ADABTC",
          status: "TRADING",
          baseAsset: "ADA",
          quoteAsset: "BTC",
          isSpotTradingAllowed: true
        },
        {
          symbol: "XRPUSDT",
          status: "TRADING",
          baseAsset: "XRP",
          quoteAsset: "USDT",
          isSpotTradingAllowed: true
        }
      ]
    });

    expect(result).toEqual({
      reusableSymbols: [{ symbol: "BTCEUR", baseAsset: "BTC", quoteAsset: "EUR" }],
      probeSymbols: [
        { symbol: "ADABTC", baseAsset: "ADA", quoteAsset: "BTC" },
        { symbol: "XRPUSDT", baseAsset: "XRP", quoteAsset: "USDT" }
      ],
      inactiveSymbols: ["STALEPAIR"]
    });
  });

  it("indexes only spot-allowed exchange symbols", () => {
    const index = buildExchangeMetadataIndex({
      symbols: [
        {
          symbol: "BTCEUR",
          status: "TRADING",
          baseAsset: "BTC",
          quoteAsset: "EUR",
          isSpotTradingAllowed: true
        },
        {
          symbol: "BTCPERP",
          status: "TRADING",
          baseAsset: "BTC",
          quoteAsset: "PERP",
          isSpotTradingAllowed: false
        }
      ]
    });

    expect([...index.values()]).toEqual([
      { symbol: "BTCEUR", baseAsset: "BTC", quoteAsset: "EUR" }
    ]);
  });
});
