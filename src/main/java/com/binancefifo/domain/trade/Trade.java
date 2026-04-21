package com.binancefifo.domain.trade;

import java.math.BigDecimal;
import java.time.Instant;

/** Domain representation of a single executed trade, independent of any DTO shape. */
public record Trade(
        long id,
        Symbol symbol,
        TradeSide side,
        BigDecimal qty,
        BigDecimal price,
        BigDecimal quoteQty,
        BigDecimal commission,
        Asset commissionAsset,
        Instant executedAt,
        Long orderId,
        TradeSource source
) {}
