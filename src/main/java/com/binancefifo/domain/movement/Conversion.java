package com.binancefifo.domain.movement;

import com.binancefifo.domain.trade.Asset;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Binance Convert (/sapi/v1/convert/tradeFlow) — a swap, not a pair trade. Mapped to two
 * synthetic Trades at ingest time (DISPOSAL of {@code fromAsset}, ACQUISITION of {@code toAsset}).
 * Commission is absent in the API response; the spread is absorbed into the ratio.
 */
public record Conversion(
        String quoteId,
        Asset fromAsset,
        BigDecimal fromAmount,
        Asset toAsset,
        BigDecimal toAmount,
        Instant createdAt
) {}
