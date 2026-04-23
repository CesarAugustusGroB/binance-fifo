import { and, eq } from "drizzle-orm";

import { BinanceClient } from "@binance-fifo/binance-client";
import { db, ingestionCursor, movements } from "@binance-fifo/db";
import { readBinanceEnv } from "@binance-fifo/shared";

import { mapDepositDto, mapWithdrawalDto } from "./mappers";

export interface IngestMovementsRequest {
  fromMs?: number;
}

export async function ingestMovements(input: IngestMovementsRequest = {}) {
  const env = readBinanceEnv();
  const client = new BinanceClient({
    apiKey: env.BINANCE_API_KEY,
    secret: env.BINANCE_API_SECRET
  });

  const [deposits, withdrawals] = await Promise.all([
    client.deposits(input.fromMs),
    client.withdrawals(input.fromMs)
  ]);

  if (deposits.length > 0) {
    await db
      .insert(movements)
      .values(deposits.map(mapDepositDto))
      .onConflictDoNothing();
  }

  if (withdrawals.length > 0) {
    await db
      .insert(movements)
      .values(withdrawals.map(mapWithdrawalDto))
      .onConflictDoNothing();
  }

  const now = new Date();
  await Promise.all(
    (["DEPOSIT", "WITHDRAWAL"] as const).map(async (source) => {
      const existing = await db.query.ingestionCursor.findFirst({
        where: and(eq(ingestionCursor.source, source), eq(ingestionCursor.symbol, ""))
      });
      if (existing) {
        await db
          .update(ingestionCursor)
          .set({ lastSyncAt: now })
          .where(
            and(eq(ingestionCursor.source, source), eq(ingestionCursor.symbol, ""))
          );
      } else {
        await db
          .insert(ingestionCursor)
          .values({ source, symbol: "", lastId: null, lastSyncAt: now })
          .onConflictDoNothing();
      }
    })
  );

  return { deposits: deposits.length, withdrawals: withdrawals.length };
}
