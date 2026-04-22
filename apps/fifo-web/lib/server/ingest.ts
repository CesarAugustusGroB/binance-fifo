import { and, eq } from "drizzle-orm";

import { BinanceClient } from "@binance-fifo/binance-client";
import { db, ingestionCursor, upsertKnownSymbols, trades } from "@binance-fifo/db";
import { readBinanceEnv } from "@binance-fifo/shared";

import { discoverTradedSymbols } from "./discover-symbols";
import { mapSpotTradeDto } from "./mappers";

export interface IngestRequest {
  fromMs?: number;
  toMs?: number;
  rediscover?: boolean;
}

export async function ingestSpotTrades(input: IngestRequest = {}) {
  const env = readBinanceEnv();
  const client = new BinanceClient({
    apiKey: env.BINANCE_API_KEY,
    secret: env.BINANCE_API_SECRET
  });

  const symbols = await discoverTradedSymbols(client);
  await upsertKnownSymbols(
    symbols.map((symbol) => ({
      symbol: symbol.symbol,
      baseAsset: symbol.baseAsset,
      quoteAsset: symbol.quoteAsset,
      firstSeenAt: new Date(),
      isActive: true
    }))
  );

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
