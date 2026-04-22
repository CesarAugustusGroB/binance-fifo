import { and, count, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";

import { db } from "./client";
import {
  ingestionCursor,
  knownSymbols,
  movements,
  priceCache,
  realizedGains,
  trades
} from "./schema";

export async function loadTradesAndMovements() {
  const [tradeRows, movementRows] = await Promise.all([
    db.select().from(trades).orderBy(trades.executedAt),
    db.select().from(movements).orderBy(movements.occurredAt)
  ]);

  return { tradeRows, movementRows };
}

export async function replaceRealizedGains(values: typeof realizedGains.$inferInsert[]) {
  await db.delete(realizedGains);
  if (values.length > 0) {
    await db.insert(realizedGains).values(values);
  }
}

export async function listRealizedGainsForYear(yearStart: Date, yearEnd: Date) {
  return db
    .select()
    .from(realizedGains)
    .where(and(gte(realizedGains.disposalDate, yearStart), lte(realizedGains.disposalDate, yearEnd)))
    .orderBy(realizedGains.disposalDate);
}

export async function readStatus() {
  const [tradeCount, movementCount, gainCount, cursorRows] = await Promise.all([
    db.select({ value: count() }).from(trades),
    db.select({ value: count() }).from(movements),
    db.select({ value: count() }).from(realizedGains),
    db.select().from(ingestionCursor).orderBy(desc(ingestionCursor.lastSyncAt))
  ]);

  return {
    tradeCount: tradeCount[0]?.value ?? 0,
    movementCount: movementCount[0]?.value ?? 0,
    gainCount: gainCount[0]?.value ?? 0,
    cursorRows
  };
}

export async function listKnownSymbols(options?: { activeOnly?: boolean }) {
  const activeOnly = options?.activeOnly ?? true;

  const query = db.select().from(knownSymbols);
  if (!activeOnly) {
    return query;
  }

  return query.where(eq(knownSymbols.isActive, true));
}

export async function listTradedSymbols() {
  const rows = await db.selectDistinct({ symbol: trades.symbol }).from(trades);
  return rows.map((row) => row.symbol);
}

export async function upsertKnownSymbols(values: typeof knownSymbols.$inferInsert[]) {
  if (values.length === 0) {
    return;
  }

  await db
    .insert(knownSymbols)
    .values(values)
    .onConflictDoUpdate({
      target: knownSymbols.symbol,
      set: {
        baseAsset: sql`excluded.base_asset`,
        quoteAsset: sql`excluded.quote_asset`,
        isActive: sql`excluded.is_active`
      }
    });
}

export async function deactivateKnownSymbols(symbols: string[]) {
  if (symbols.length === 0) {
    return;
  }

  await db
    .update(knownSymbols)
    .set({ isActive: false })
    .where(inArray(knownSymbols.symbol, symbols));
}

export async function getCachedPrice(asset: string, quote: string, minute: Date) {
  return db.query.priceCache.findFirst({
    where: and(
      eq(priceCache.asset, asset),
      eq(priceCache.quote, quote),
      eq(priceCache.minute, minute)
    )
  });
}

export async function upsertCachedPrice(value: typeof priceCache.$inferInsert) {
  await db.insert(priceCache).values(value).onConflictDoUpdate({
    target: [priceCache.asset, priceCache.quote, priceCache.minute],
    set: {
      price: value.price
    }
  });
}
