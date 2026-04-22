import {
  BinanceError,
  type BinanceClient
} from "@binance-fifo/binance-client";
import {
  getCachedPrice,
  getCachedPriceAtOrBefore,
  upsertCachedPrice
} from "@binance-fifo/db";
import { Decimal, decimal, truncateToMinute } from "@binance-fifo/shared";
import type { PriceResolver } from "@binance-fifo/fifo-engine";

type MarketResolutionSource =
  | "cache-exact"
  | "cache-fallback"
  | "binance-exact"
  | "binance-fallback";

interface ResolvedMarketPrice {
  minute: Date;
  price: Decimal;
  source: MarketResolutionSource;
}

interface ResolutionFailure {
  symbol: string;
  reason: string;
}

interface MarketResolutionAttempt {
  resolved: ResolvedMarketPrice | null;
  failure?: ResolutionFailure;
}

function resolutionKey(asset: string, quote: string, minute: Date) {
  return `${asset}:${quote}:${minute.toISOString()}`;
}

function isMissingMarketError(error: unknown) {
  if (!(error instanceof BinanceError) || typeof error.details !== "object" || !error.details) {
    return false;
  }

  const details = error.details as { code?: unknown };
  return details.code === -1121 || details.code === -1220;
}

export class PriceResolutionError extends Error {
  constructor(
    asset: string,
    at: Date,
    failures: ResolutionFailure[]
  ) {
    super(
      `Unable to resolve EUR price for ${asset} at ${at.toISOString()}. ` +
        `Attempts: ${failures.map((failure) => `${failure.symbol} (${failure.reason})`).join(", ")}`
    );
    this.name = "PriceResolutionError";
  }
}

export class BinancePriceResolver implements PriceResolver {
  private readonly pendingMarketLookups = new Map<
    string,
    Promise<ResolvedMarketPrice>
  >();
  private readonly pendingResolvedPrices = new Map<string, Promise<Decimal>>();
  private readonly missingMarkets = new Set<string>();

  constructor(
    private readonly client: Pick<BinanceClient, "fetchNearestKline">
  ) {}

  async toEur(asset: string, at: Date): Promise<Decimal> {
    if (asset === "EUR") {
      return decimal(1);
    }

    const minute = truncateToMinute(at);
    const direct = await getCachedPrice(asset, "EUR", minute);
    if (direct) {
      return decimal(direct.price);
    }

    const key = resolutionKey(asset, "EUR", minute);
    const pending = this.pendingResolvedPrices.get(key);
    if (pending) {
      return pending;
    }

    const resolution = this.resolveAssetToEur(asset, minute);
    this.pendingResolvedPrices.set(key, resolution);

    try {
      return await resolution;
    } finally {
      this.pendingResolvedPrices.delete(key);
    }
  }

  private async resolveAssetToEur(asset: string, minute: Date): Promise<Decimal> {
    const failures: ResolutionFailure[] = [];

    const directPrice = await this.tryResolveMarket(
      asset,
      "EUR",
      `${asset}EUR`,
      minute
    );
    if (directPrice.resolved) {
      await this.persistResolvedPrice(asset, "EUR", minute, directPrice.resolved);
      return directPrice.resolved.price;
    }
    if (directPrice.failure) {
      failures.push(directPrice.failure);
    }

    let assetUsdt: MarketResolutionAttempt;
    if (asset === "USDT") {
      assetUsdt = {
        resolved: {
          minute,
          price: decimal(1),
          source: "cache-exact"
        }
      };
    } else {
      assetUsdt = await this.tryResolveMarket(
        asset,
        "USDT",
        `${asset}USDT`,
        minute
      );
      if (assetUsdt.failure) {
        failures.push(assetUsdt.failure);
      }
    }

    const eurUsdt = await this.tryResolveMarket("EUR", "USDT", "EURUSDT", minute);
    if (eurUsdt.failure) {
      failures.push(eurUsdt.failure);
    }

    if (assetUsdt.resolved && eurUsdt.resolved) {
      const price = assetUsdt.resolved.price.div(eurUsdt.resolved.price);
      await upsertCachedPrice({
        asset,
        quote: "EUR",
        minute,
        price: price.toFixed()
      });
      return price;
    }

    throw new PriceResolutionError(asset, minute, failures);
  }

  private async tryResolveMarket(
    asset: string,
    quote: string,
    symbol: string,
    minute: Date
  ): Promise<MarketResolutionAttempt> {
    const exact = await getCachedPrice(asset, quote, minute);
    if (exact) {
      return {
        resolved: {
          minute,
          price: decimal(exact.price),
          source: "cache-exact"
        }
      };
    }

    const fallback = await getCachedPriceAtOrBefore(asset, quote, minute);
    if (fallback) {
      return {
        resolved: {
          minute: new Date(fallback.minute),
          price: decimal(fallback.price),
          source:
            new Date(fallback.minute).getTime() === minute.getTime()
              ? "cache-exact"
              : "cache-fallback"
        }
      };
    }

    if (this.missingMarkets.has(symbol)) {
      return {
        resolved: null,
        failure: {
          symbol,
          reason: "market missing"
        }
      };
    }

    const key = resolutionKey(asset, quote, minute);
    const pending = this.pendingMarketLookups.get(key);
    if (pending) {
      try {
        return {
          resolved: await pending
        };
      } catch (error) {
        return {
          resolved: null,
          failure: {
            symbol,
            reason:
              error instanceof Error
                ? error.message
                : "request failed"
          }
        };
      }
    }

    const lookup = this.fetchAndStore(asset, quote, symbol, minute);
    this.pendingMarketLookups.set(key, lookup);

    try {
      return {
        resolved: await lookup
      };
    } catch (error) {
      if (isMissingMarketError(error)) {
        this.missingMarkets.add(symbol);
        return {
          resolved: null,
          failure: {
            symbol,
            reason: "market missing"
          }
        };
      }

      return {
        resolved: null,
        failure: {
          symbol,
          reason:
            error instanceof Error
              ? error.message
              : "request failed"
        }
      };
    } finally {
      this.pendingMarketLookups.delete(key);
    }
  }

  private async fetchAndStore(
    asset: string,
    quote: string,
    symbol: string,
    minute: Date
  ): Promise<ResolvedMarketPrice> {
    const nearest = await this.client.fetchNearestKline(symbol, minute.getTime());
    const resolvedMinute = truncateToMinute(new Date(nearest.openTimeMs));
    const price = decimal(nearest.close);
    await upsertCachedPrice({
      asset,
      quote,
      minute: resolvedMinute,
      price: price.toFixed()
    });

    return {
      minute: resolvedMinute,
      price,
      source:
        resolvedMinute.getTime() === minute.getTime()
          ? "binance-exact"
          : "binance-fallback"
    };
  }

  private async persistResolvedPrice(
    asset: string,
    quote: string,
    minute: Date,
    resolved: ResolvedMarketPrice
  ) {
    if (resolved.minute.getTime() === minute.getTime()) {
      return;
    }

    await upsertCachedPrice({
      asset,
      quote,
      minute,
      price: resolved.price.toFixed()
    });
  }
}
