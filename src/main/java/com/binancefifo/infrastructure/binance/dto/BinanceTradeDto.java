package com.binancefifo.infrastructure.binance.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;

/**
 * Shape of a row from GET /api/v3/myTrades. Tolerant of unknown fields — Binance adds
 * keys to /sapi and occasionally /api responses without notice (see DESIGN.md §3.4).
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record BinanceTradeDto(
        long id,
        long orderId,
        String symbol,
        BigDecimal price,
        BigDecimal qty,
        BigDecimal quoteQty,
        BigDecimal commission,
        String commissionAsset,
        long time,
        boolean isBuyer,
        boolean isMaker
) {}
