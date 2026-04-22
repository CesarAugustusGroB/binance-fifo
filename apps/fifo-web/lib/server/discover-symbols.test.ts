import { describe, expect, it } from "vitest";

import {
  buildMetadataCandidates,
  buildExchangeMetadataIndex,
  collectRelevantAssets,
  createRediscoveryPlan,
  collectNonZeroAssets,
  discoverBalanceSymbols,
  reuseKnownSymbols,
  type StoredKnownSymbol
} from "./discover-symbols";

describe("discover-symbols", () => {
  it("builds bootstrap candidates from metadata instead of a fixed quote list", () => {
    const result = discoverBalanceSymbols(
      {
        balances: [
          { asset: "FDUSD", free: "100", locked: "0" },
          { asset: "ETH", free: "0", locked: "0" }
        ]
      },
      {
        symbols: [
          {
            symbol: "BTCFDUSD",
            status: "TRADING",
            baseAsset: "BTC",
            quoteAsset: "FDUSD",
            isSpotTradingAllowed: true
          },
          {
            symbol: "ETHFDUSD",
            status: "TRADING",
            baseAsset: "ETH",
            quoteAsset: "FDUSD",
            isSpotTradingAllowed: true
          },
          {
            symbol: "BTCUSDT",
            status: "TRADING",
            baseAsset: "BTC",
            quoteAsset: "USDT",
            isSpotTradingAllowed: true
          }
        ]
      }
    );

    expect(result).toEqual([
      { symbol: "BTCFDUSD", baseAsset: "BTC", quoteAsset: "FDUSD" },
      { symbol: "ETHFDUSD", baseAsset: "ETH", quoteAsset: "FDUSD" }
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

  it("builds a rediscovery plan that narrows probes to relevant assets and reprobes unconfirmed rows", () => {
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
        },
        {
          symbol: "SOLBTC",
          status: "TRADING",
          baseAsset: "SOL",
          quoteAsset: "BTC",
          isSpotTradingAllowed: true
        },
        {
          symbol: "DOGEUSDT",
          status: "TRADING",
          baseAsset: "DOGE",
          quoteAsset: "USDT",
          isSpotTradingAllowed: true
        }
      ]
    },
    new Set(["BTC", "EUR", "XRP"]),
    new Set(["BTCEUR"])
    );

    expect(result).toEqual({
      reusableSymbols: [{ symbol: "BTCEUR", baseAsset: "BTC", quoteAsset: "EUR" }],
      probeSymbols: [
        { symbol: "ADABTC", baseAsset: "ADA", quoteAsset: "BTC" },
        { symbol: "XRPUSDT", baseAsset: "XRP", quoteAsset: "USDT" },
        { symbol: "SOLBTC", baseAsset: "SOL", quoteAsset: "BTC" }
      ],
      probeKnownSymbols: ["ADABTC"],
      inactiveSymbols: ["STALEPAIR"]
    });
  });

  it("collects relevant rediscovery assets from balances and known symbols", () => {
    const result = collectRelevantAssets(
      {
        balances: [
          { asset: "USDT", free: "50", locked: "0" },
          { asset: "BTC", free: "0", locked: "0" }
        ]
      },
      [
        { symbol: "BTCEUR", baseAsset: "BTC", quoteAsset: "EUR", isActive: true },
        { symbol: "ADABTC", baseAsset: "ADA", quoteAsset: "BTC", isActive: false }
      ]
    );

    expect([...result]).toEqual(["USDT", "BTC", "EUR", "ADA"]);
  });

  it("collects only non-zero balance assets", () => {
    const result = collectNonZeroAssets({
      balances: [
        { asset: "BTC", free: "0", locked: "0" },
        { asset: "EUR", free: "5", locked: "0" },
        { asset: "USDT", free: "0", locked: "1" }
      ]
    });

    expect([...result]).toEqual(["EUR", "USDT"]);
  });

  it("builds metadata candidates from relevant assets only", () => {
    const result = buildMetadataCandidates(
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
            symbol: "ETHUSDT",
            status: "TRADING",
            baseAsset: "ETH",
            quoteAsset: "USDT",
            isSpotTradingAllowed: true
          },
          {
            symbol: "SOLBTC",
            status: "TRADING",
            baseAsset: "SOL",
            quoteAsset: "BTC",
            isSpotTradingAllowed: true
          }
        ]
      },
      new Set(["BTC", "EUR"])
    );

    expect(result).toEqual([
      { symbol: "BTCEUR", baseAsset: "BTC", quoteAsset: "EUR" },
      { symbol: "SOLBTC", baseAsset: "SOL", quoteAsset: "BTC" }
    ]);
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
