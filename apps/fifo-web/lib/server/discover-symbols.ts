import type {
  AccountDto,
  ExchangeInfoDto,
  ExchangeSymbolDto
} from "@binance-fifo/binance-client";
import { decimal } from "@binance-fifo/shared";

const QUOTES = ["USDT", "BUSD", "EUR", "BTC", "ETH"] as const;

export interface KnownSymbolCandidate {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
}

export interface StoredKnownSymbol extends KnownSymbolCandidate {
  isActive: boolean;
}

export interface RediscoveryPlan {
  reusableSymbols: KnownSymbolCandidate[];
  probeSymbols: KnownSymbolCandidate[];
  inactiveSymbols: string[];
}

function toCandidate(symbol: Pick<ExchangeSymbolDto, "symbol" | "baseAsset" | "quoteAsset">) {
  return {
    symbol: symbol.symbol,
    baseAsset: symbol.baseAsset,
    quoteAsset: symbol.quoteAsset
  } satisfies KnownSymbolCandidate;
}

export function buildExchangeMetadataIndex(exchangeInfo: ExchangeInfoDto) {
  return new Map(
    exchangeInfo.symbols
      .filter((symbol) => symbol.isSpotTradingAllowed !== false)
      .map((symbol) => [symbol.symbol, toCandidate(symbol)])
  );
}

export function discoverBalanceSymbols(
  account: AccountDto,
  exchangeInfo: ExchangeInfoDto
): KnownSymbolCandidate[] {
  const validSymbols = buildExchangeMetadataIndex(exchangeInfo);
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
      const metadata = validSymbols.get(symbol);
      if (!metadata || seen.has(symbol)) {
        continue;
      }

      seen.add(symbol);
      results.push(metadata);
    }
  }

  return results;
}

export function reuseKnownSymbols(
  knownSymbols: StoredKnownSymbol[],
  exchangeInfo: ExchangeInfoDto
): KnownSymbolCandidate[] {
  const validSymbols = buildExchangeMetadataIndex(exchangeInfo);

  return knownSymbols
    .filter((symbol) => symbol.isActive)
    .map((symbol) => validSymbols.get(symbol.symbol))
    .filter((symbol): symbol is KnownSymbolCandidate => Boolean(symbol));
}

export function createRediscoveryPlan(
  knownSymbols: StoredKnownSymbol[],
  exchangeInfo: ExchangeInfoDto
): RediscoveryPlan {
  const validSymbols = buildExchangeMetadataIndex(exchangeInfo);
  const knownBySymbol = new Map(knownSymbols.map((symbol) => [symbol.symbol, symbol]));

  const reusableSymbols: KnownSymbolCandidate[] = [];
  const probeSymbols: KnownSymbolCandidate[] = [];

  for (const symbol of validSymbols.values()) {
    const existing = knownBySymbol.get(symbol.symbol);
    if (existing?.isActive) {
      reusableSymbols.push(symbol);
      continue;
    }

    probeSymbols.push(symbol);
  }

  const inactiveSymbols = knownSymbols
    .filter((symbol) => symbol.isActive && !validSymbols.has(symbol.symbol))
    .map((symbol) => symbol.symbol);

  return {
    reusableSymbols,
    probeSymbols,
    inactiveSymbols
  };
}
