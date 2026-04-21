package com.binancefifo.domain.fifo;

import com.binancefifo.domain.trade.Asset;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Normalised event consumed by the FIFO engine. A Trade or Movement is mapped to one or more
 * AssetEvents by AssetEventMapper. Everything is in EUR already — the engine does no pricing.
 *
 * @param type       ACQUISITION adds a lot; DISPOSAL matches lots in FIFO order.
 * @param costEur    For ACQUISITION: total EUR cost basis (quoteQty × EUR/quote + allocated fees).
 * @param valueEur   For DISPOSAL: total EUR proceeds (quoteQty × EUR/quote − allocated fees).
 * @param sequence   Tiebreaker when two events share a timestamp (e.g. order of trade ids).
 */
public record AssetEvent(
        EventType type,
        Asset asset,
        BigDecimal qty,
        BigDecimal costEur,
        BigDecimal valueEur,
        Instant timestamp,
        long sequence,
        String sourceId
) {
    public enum EventType { ACQUISITION, DISPOSAL }
}
