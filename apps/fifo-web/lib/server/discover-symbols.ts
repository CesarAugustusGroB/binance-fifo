import type {
  AccountDto,
  ExchangeInfoDto,
  ExchangeSymbolDto
} from "@binance-fifo/binance-client";
import { decimal } from "@binance-fifo/shared";

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
  probeKnownSymbols: string[];
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

export function collectNonZeroAssets(account: AccountDto) {
  const assets = new Set<string>();

  for (const balance of account.balances) {
    const total = decimal(balance.free).plus(decimal(balance.locked));
    if (total.eq(0)) {
      continue;
    }

    assets.add(balance.asset);
  }

  return assets;
}

export function collectRelevantAssets(
  account: AccountDto,
  knownSymbols: StoredKnownSymbol[]
) {
  const assets = collectNonZeroAssets(account);

  for (const symbol of knownSymbols) {
    assets.add(symbol.baseAsset);
    assets.add(symbol.quoteAsset);
  }

  return assets;
}

export function buildMetadataCandidates(
  exchangeInfo: ExchangeInfoDto,
  relevantAssets: Iterable<string>
): KnownSymbolCandidate[] {
  const assetSet = new Set(relevantAssets);
  const validSymbols = buildExchangeMetadataIndex(exchangeInfo);

  if (assetSet.size === 0) {
    return [];
  }

  return [...validSymbols.values()].filter(
    (symbol) => assetSet.has(symbol.baseAsset) || assetSet.has(symbol.quoteAsset)
  );
}

export function discoverBalanceSymbols(
  account: AccountDto,
  exchangeInfo: ExchangeInfoDto
): KnownSymbolCandidate[] {
  return buildMetadataCandidates(exchangeInfo, collectNonZeroAssets(account));
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
  exchangeInfo: ExchangeInfoDto,
  relevantAssets: Iterable<string>,
  confirmedSymbols: Iterable<string>
): RediscoveryPlan {
  const validSymbols = buildExchangeMetadataIndex(exchangeInfo);
  const metadataCandidates = buildMetadataCandidates(exchangeInfo, relevantAssets);
  const knownBySymbol = new Map(knownSymbols.map((symbol) => [symbol.symbol, symbol]));
  const confirmedSymbolSet = new Set(confirmedSymbols);

  const reusableSymbols: KnownSymbolCandidate[] = [];
  const probeSymbols: KnownSymbolCandidate[] = [];
  const probeKnownSymbols: string[] = [];

  for (const symbol of metadataCandidates) {
    const existing = knownBySymbol.get(symbol.symbol);
    if (existing?.isActive && confirmedSymbolSet.has(symbol.symbol)) {
      reusableSymbols.push(symbol);
      continue;
    }

    probeSymbols.push(symbol);
    if (existing) {
      probeKnownSymbols.push(symbol.symbol);
    }
  }

  const inactiveSymbols = knownSymbols
    .filter((symbol) => symbol.isActive && !validSymbols.has(symbol.symbol))
    .map((symbol) => symbol.symbol);

  return {
    reusableSymbols,
    probeSymbols,
    probeKnownSymbols,
    inactiveSymbols
  };
}
