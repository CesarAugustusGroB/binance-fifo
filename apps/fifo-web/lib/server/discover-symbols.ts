import type { BinanceClient } from "@binance-fifo/binance-client";
import { decimal } from "@binance-fifo/shared";

const QUOTES = ["USDT", "BUSD", "EUR", "BTC", "ETH"] as const;

export interface KnownSymbolCandidate {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
}

export async function discoverTradedSymbols(
  client: Pick<BinanceClient, "account">
): Promise<KnownSymbolCandidate[]> {
  const account = await client.account();
  const seen = new Set<string>();
  const results: KnownSymbolCandidate[] = [];

  for (const balance of account.balances) {
    const total = decimal(balance.free).plus(decimal(balance.locked));
    if (total.eq(0)) {
      continue;
    }

    for (const quote of QUOTES) {
      if (balance.asset === quote) {
        continue;
      }

      const symbol = `${balance.asset}${quote}`;
      if (seen.has(symbol)) {
        continue;
      }

      seen.add(symbol);
      results.push({
        symbol,
        baseAsset: balance.asset,
        quoteAsset: quote
      });
    }
  }

  return results;
}
