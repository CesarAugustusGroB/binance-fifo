package com.binancefifo.domain.movement;

import com.binancefifo.domain.trade.Asset;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Generic asset movement: deposits, withdrawals, rewards, airdrops, manual acquisitions.
 * Kept as one record (discriminated by {@link MovementType}) rather than a class hierarchy
 * so persistence stays flat and the FIFO mapper can pattern-match cleanly.
 */
public record Movement(
        String id,
        MovementType type,
        Asset asset,
        BigDecimal amount,
        BigDecimal fee,
        Instant occurredAt,
        String rawMetadataJson
) {}
