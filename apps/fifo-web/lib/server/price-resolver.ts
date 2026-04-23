import type { BinanceClient } from "@binance-fifo/binance-client";
import { getCachedPrice, upsertCachedPrice } from "@binance-fifo/db";
import { Decimal, decimal, truncateToMinute } from "@binance-fifo/shared";
import type { PriceResolver } from "@binance-fifo/fifo-engine";

export class PriceResolutionError extends Error {
  constructor(
    readonly asset: string,
    readonly at: Date,
    readonly attempts: string[]
  ) {
    super(`Could not resolve EUR price for ${asset} at ${at.toISOString()} (tried: ${attempts.join(", ")})`);
    this.name = "PriceResolutionError";
  }
}

export function isPriceResolutionError(err: unknown): err is PriceResolutionError {
  return err instanceof PriceResolutionError;
}

export class BinancePriceResolver implements PriceResolver {
  constructor(private readonly client: Pick<BinanceClient, "fetchKline">) {}

  async toEur(asset: string, at: Date): Promise<Decimal> {
    if (asset === "EUR") {
      return decimal(1);
    }

    const minute = truncateToMinute(at);
    const direct = await getCachedPrice(asset, "EUR", minute);
    if (direct) {
      return decimal(direct.price);
    }

    const attempts: string[] = [];
    const directPrice = await this.tryFetchAndStore(asset, "EUR", `${asset}EUR`, minute);
    attempts.push(`${asset}EUR`);
    if (directPrice) {
      return directPrice;
    }

    const assetUsdt =
      asset === "USDT"
        ? decimal(1)
        : await this.tryFetchAndStore(asset, "USDT", `${asset}USDT`, minute);
    attempts.push(`${asset}USDT`);

    const eurUsdt = await this.tryFetchAndStore("EUR", "USDT", "EURUSDT", minute);
    attempts.push("EURUSDT");

    if (!assetUsdt || !eurUsdt || eurUsdt.eq(0)) {
      throw new PriceResolutionError(asset, at, attempts);
    }

    const price = assetUsdt.div(eurUsdt);
    await upsertCachedPrice({
      asset,
      quote: "EUR",
      minute,
      price: price.toFixed()
    });
    return price;
  }

  private async tryFetchAndStore(
    asset: string,
    quote: string,
    symbol: string,
    minute: Date
  ): Promise<Decimal | null> {
    try {
      return await this.fetchAndStore(asset, quote, symbol, minute);
    } catch {
      return null;
    }
  }

  private async fetchAndStore(
    asset: string,
    quote: string,
    symbol: string,
    minute: Date
  ): Promise<Decimal> {
    const cached = await getCachedPrice(asset, quote, minute);
    if (cached) {
      return decimal(cached.price);
    }

    const price = decimal(await this.client.fetchKline(symbol, minute.getTime()));
    await upsertCachedPrice({
      asset,
      quote,
      minute,
      price: price.toFixed()
    });
    return price;
  }
}
