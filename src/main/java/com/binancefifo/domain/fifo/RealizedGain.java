package com.binancefifo.domain.fifo;

import com.binancefifo.domain.trade.Asset;

import java.math.BigDecimal;
import java.time.Instant;

public record RealizedGain(
        Asset asset,
        BigDecimal qty,
        Instant acquisitionDate,
        BigDecimal acquisitionCostEur,
        Instant disposalDate,
        BigDecimal disposalValueEur,
        BigDecimal pnlEur,
        String sourceBuyId,
        String sourceSellId
) {}
