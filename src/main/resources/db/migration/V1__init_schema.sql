-- =========================================================================
-- V1 — Initial schema. See DESIGN.md §4 for rationale behind each table.
-- Precision: DECIMAL(30,10) across the board to keep BigDecimal safe.
-- =========================================================================

CREATE TABLE trades (
    id               BIGINT          PRIMARY KEY,        -- Binance trade id
    symbol           VARCHAR(32)     NOT NULL,
    base_asset       VARCHAR(16)     NOT NULL,
    quote_asset      VARCHAR(16)     NOT NULL,
    side             VARCHAR(8)      NOT NULL,           -- BUY | SELL
    qty              DECIMAL(30,10)  NOT NULL,
    price            DECIMAL(30,10)  NOT NULL,
    quote_qty        DECIMAL(30,10)  NOT NULL,
    commission       DECIMAL(30,10)  NOT NULL,
    commission_asset VARCHAR(16)     NOT NULL,
    executed_at      TIMESTAMP       NOT NULL,           -- UTC
    order_id         BIGINT,
    source           VARCHAR(16)     NOT NULL            -- SPOT | CONVERT | DUST
);
CREATE INDEX idx_trades_symbol_time ON trades(symbol, executed_at);
CREATE INDEX idx_trades_base_time   ON trades(base_asset, executed_at);

CREATE TABLE movements (
    id           VARCHAR(64)    PRIMARY KEY,             -- Binance tx id / synthetic
    type         VARCHAR(32)    NOT NULL,                -- DEPOSIT | WITHDRAWAL | STAKING_REWARD | ...
    asset        VARCHAR(16)    NOT NULL,
    amount       DECIMAL(30,10) NOT NULL,
    fee          DECIMAL(30,10),
    occurred_at  TIMESTAMP      NOT NULL,                -- UTC
    metadata     CLOB                                    -- raw JSON payload for audit
);
CREATE INDEX idx_movements_asset_time ON movements(asset, occurred_at);
CREATE INDEX idx_movements_type_time  ON movements(type, occurred_at);

CREATE TABLE realized_gains (
    id                    BIGINT         AUTO_INCREMENT PRIMARY KEY,
    asset                 VARCHAR(16)    NOT NULL,
    qty                   DECIMAL(30,10) NOT NULL,
    acquisition_date      TIMESTAMP      NOT NULL,
    acquisition_cost_eur  DECIMAL(30,10) NOT NULL,
    disposal_date         TIMESTAMP      NOT NULL,
    disposal_value_eur    DECIMAL(30,10) NOT NULL,
    pnl_eur               DECIMAL(30,10) NOT NULL,
    source_buy_trade_id   BIGINT,
    source_sell_trade_id  BIGINT
);
CREATE INDEX idx_gains_disposal ON realized_gains(disposal_date);
CREATE INDEX idx_gains_asset    ON realized_gains(asset);

-- Cache for EUR conversion (PriceResolver). One row per (asset, quote, minute).
CREATE TABLE price_cache (
    asset         VARCHAR(16)    NOT NULL,
    quote         VARCHAR(16)    NOT NULL,
    minute_utc    TIMESTAMP      NOT NULL,
    price         DECIMAL(30,10) NOT NULL,
    PRIMARY KEY (asset, quote, minute_utc)
);

-- Tracks "where did we stop last time" per (source, symbol) for incremental sync.
CREATE TABLE ingestion_cursor (
    source        VARCHAR(32)  NOT NULL,                 -- SPOT | CONVERT | DUST | DEPOSIT | ...
    symbol        VARCHAR(32)  NOT NULL DEFAULT '',      -- blank for non-symbol sources
    last_id       BIGINT,
    last_sync_at  TIMESTAMP,
    PRIMARY KEY (source, symbol)
);

-- Symbols discovered by the symbol-discovery pass so we don't re-scan every run.
CREATE TABLE known_symbols (
    symbol        VARCHAR(32)  PRIMARY KEY,
    base_asset    VARCHAR(16)  NOT NULL,
    quote_asset   VARCHAR(16)  NOT NULL,
    first_seen_at TIMESTAMP    NOT NULL,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE
);
