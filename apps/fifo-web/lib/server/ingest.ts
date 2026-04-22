import { and, eq } from "drizzle-orm";

import { BinanceClient } from "@binance-fifo/binance-client";
import {
  db,
  deactivateKnownSymbols,
  ingestionCursor,
  listKnownSymbols,
  upsertKnownSymbols,
  trades
} from "@binance-fifo/db";
import { readBinanceEnv } from "@binance-fifo/shared";

import {
  createRediscoveryPlan,
  discoverBalanceSymbols,
  reuseKnownSymbols,
  type KnownSymbolCandidate
} from "./discover-symbols";
import { mapSpotTradeDto } from "./mappers";

export interface IngestRequest {
  fromMs?: number;
  toMs?: number;
  rediscover?: boolean;
}

async function symbolHasTradeHistory(
  client: Pick<BinanceClient, "myTrades">,
  symbol: string
) {
  const iterator = client.myTrades(symbol);
  const firstPage = await iterator.next();
  return !firstPage.done && firstPage.value.length > 0;
}

async function resolveSymbolsForIngest(
  client: Pick<BinanceClient, "account" | "exchangeInfo" | "myTrades">,
  rediscover = false
) {
  const knownSymbols = await listKnownSymbols({ activeOnly: false });
  const exchangeInfo = await client.exchangeInfo();

  if (!rediscover) {
    const reusableSymbols = reuseKnownSymbols(knownSymbols, exchangeInfo);
    if (reusableSymbols.length > 0) {
      return {
        symbols: reusableSymbols,
        inactiveSymbols: [] as string[]
      };
    }

    const account = await client.account();
    return {
      symbols: discoverBalanceSymbols(account, exchangeInfo),
      inactiveSymbols: [] as string[]
    };
  }

  const plan = createRediscoveryPlan(knownSymbols, exchangeInfo);
  const discoveredSymbols: KnownSymbolCandidate[] = [];

  for (const symbol of plan.probeSymbols) {
    if (await symbolHasTradeHistory(client, symbol.symbol)) {
      discoveredSymbols.push(symbol);
    }
  }

  return {
    symbols: [...plan.reusableSymbols, ...discoveredSymbols],
    inactiveSymbols: plan.inactiveSymbols
  };
}

export async function ingestSpotTrades(input: IngestRequest = {}) {
  const env = readBinanceEnv();
  const client = new BinanceClient({
    apiKey: env.BINANCE_API_KEY,
    secret: env.BINANCE_API_SECRET
  });

  const { symbols, inactiveSymbols } = await resolveSymbolsForIngest(
    client,
    input.rediscover ?? false
  );
  await upsertKnownSymbols(
    symbols.map((symbol) => ({
      symbol: symbol.symbol,
      baseAsset: symbol.baseAsset,
      quoteAsset: symbol.quoteAsset,
      firstSeenAt: new Date(),
      isActive: true
    }))
  );
  await deactivateKnownSymbols(inactiveSymbols);

  for (const symbol of symbols) {
    const existingCursor = await db.query.ingestionCursor.findFirst({
      where: and(eq(ingestionCursor.source, "SPOT"), eq(ingestionCursor.symbol, symbol.symbol))
    });
    const toMs = input.toMs;

    for await (const page of client.myTrades(symbol.symbol, input.fromMs)) {
      const filteredPage = toMs
        ? page.filter((trade) => trade.time <= toMs)
        : page;

      if (filteredPage.length === 0) {
        continue;
      }

      await db
        .insert(trades)
        .values(filteredPage.map((trade) => mapSpotTradeDto(symbol, trade)))
        .onConflictDoNothing();

      const latestId = Math.max(...filteredPage.map((trade) => trade.id));
      await db
        .insert(ingestionCursor)
        .values({
          source: "SPOT",
          symbol: symbol.symbol,
          lastId: latestId,
          lastSyncAt: new Date()
        })
        .onConflictDoUpdate({
          target: [ingestionCursor.source, ingestionCursor.symbol],
          set: {
            lastId: latestId,
            lastSyncAt: new Date()
          }
        });
    }

    if (!existingCursor) {
      await db
        .insert(ingestionCursor)
        .values({
          source: "SPOT",
          symbol: symbol.symbol,
          lastId: null,
          lastSyncAt: new Date()
        })
        .onConflictDoNothing();
    }
  }

  return { symbols: symbols.length };
}
