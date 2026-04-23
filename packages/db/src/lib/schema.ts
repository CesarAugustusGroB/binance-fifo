import {
  bigint,
  boolean,
  index,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp
} from "drizzle-orm/pg-core";

export const trades = pgTable(
  "trades",
  {
    id: text("id").primaryKey(),
    source: text("source").notNull(),
    symbol: text("symbol").notNull(),
    baseAsset: text("base_asset").notNull(),
    quoteAsset: text("quote_asset").notNull(),
    side: text("side").notNull(),
    qty: numeric("qty", { precision: 30, scale: 10 }).notNull(),
    price: numeric("price", { precision: 30, scale: 10 }).notNull(),
    quoteQty: numeric("quote_qty", { precision: 30, scale: 10 }).notNull(),
    commission: numeric("commission", { precision: 30, scale: 10 }),
    commissionAsset: text("commission_asset"),
    executedAt: timestamp("executed_at", { withTimezone: true }).notNull(),
    raw: jsonb("raw").notNull()
  },
  (table) => ({
    symbolTimeIdx: index("idx_trades_symbol_time").on(table.symbol, table.executedAt),
    baseTimeIdx: index("idx_trades_base_time").on(table.baseAsset, table.executedAt)
  })
);

export const movements = pgTable(
  "movements",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    asset: text("asset").notNull(),
    amount: numeric("amount", { precision: 30, scale: 10 }).notNull(),
    fee: numeric("fee", { precision: 30, scale: 10 }),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    raw: jsonb("raw"),
    metadata: jsonb("metadata")
  },
  (table) => ({
    assetTimeIdx: index("idx_movements_asset_time").on(table.asset, table.occurredAt),
    typeTimeIdx: index("idx_movements_type_time").on(table.type, table.occurredAt)
  })
);

export const realizedGains = pgTable(
  "realized_gains",
  {
    id: bigint("id", { mode: "number" }).generatedByDefaultAsIdentity().primaryKey(),
    asset: text("asset").notNull(),
    qty: numeric("qty", { precision: 30, scale: 10 }).notNull(),
    acquisitionDate: timestamp("acquisition_date", { withTimezone: true }).notNull(),
    acquisitionCostEur: numeric("acquisition_cost_eur", {
      precision: 30,
      scale: 10
    }).notNull(),
    disposalDate: timestamp("disposal_date", { withTimezone: true }).notNull(),
    disposalValueEur: numeric("disposal_value_eur", {
      precision: 30,
      scale: 10
    }).notNull(),
    pnlEur: numeric("pnl_eur", { precision: 30, scale: 10 }).notNull(),
    buySourceId: text("buy_source_id"),
    sellSourceId: text("sell_source_id")
  },
  (table) => ({
    disposalIdx: index("idx_gains_disposal").on(table.disposalDate),
    assetIdx: index("idx_gains_asset").on(table.asset)
  })
);

export const priceCache = pgTable(
  "price_cache",
  {
    asset: text("asset").notNull(),
    quote: text("quote").notNull(),
    minute: timestamp("minute", { withTimezone: true }).notNull(),
    price: numeric("price", { precision: 30, scale: 10 }).notNull()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.asset, table.quote, table.minute] })
  })
);

export const ingestionCursor = pgTable(
  "ingestion_cursor",
  {
    source: text("source").notNull(),
    symbol: text("symbol").notNull().default(""),
    lastId: bigint("last_id", { mode: "number" }),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true })
  },
  (table) => ({
    pk: primaryKey({ columns: [table.source, table.symbol] })
  })
);

export const openLots = pgTable(
  "open_lots",
  {
    asset: text("asset").notNull(),
    sourceId: text("source_id").notNull(),
    qty: numeric("qty", { precision: 30, scale: 10 }).notNull(),
    costPerUnitEur: numeric("cost_per_unit_eur", { precision: 30, scale: 10 }).notNull(),
    acquiredAt: timestamp("acquired_at", { withTimezone: true }).notNull(),
    snapshotAt: timestamp("snapshot_at", { withTimezone: true }).notNull()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.asset, table.sourceId] }),
    assetIdx: index("idx_open_lots_asset").on(table.asset)
  })
);

export const uncoveredDisposals = pgTable(
  "uncovered_disposals",
  {
    id: bigint("id", { mode: "number" }).generatedByDefaultAsIdentity().primaryKey(),
    asset: text("asset").notNull(),
    qty: numeric("qty", { precision: 30, scale: 10 }).notNull(),
    valueEur: numeric("value_eur", { precision: 30, scale: 10 }),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    sourceId: text("source_id").notNull(),
    reason: text("reason"),
    snapshotAt: timestamp("snapshot_at", { withTimezone: true }).notNull()
  },
  (table) => ({
    assetIdx: index("idx_uncovered_asset").on(table.asset),
    occurredIdx: index("idx_uncovered_occurred").on(table.occurredAt)
  })
);

export const knownSymbols = pgTable("known_symbols", {
  symbol: text("symbol").primaryKey(),
  baseAsset: text("base_asset").notNull(),
  quoteAsset: text("quote_asset").notNull(),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull(),
  isActive: boolean("is_active").notNull().default(true)
});
