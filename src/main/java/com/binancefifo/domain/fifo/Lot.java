package com.binancefifo.domain.fifo;

import java.math.BigDecimal;
import java.math.MathContext;
import java.time.Instant;

/** A still-open acquisition lot. Mutable qty as it gets consumed by disposals. */
public class Lot {
    private static final MathContext MC = MathContext.DECIMAL64;

    private BigDecimal qty;
    private final BigDecimal costPerUnit;
    private final Instant acquisitionDate;
    private final String sourceId;

    public Lot(BigDecimal qty, BigDecimal costEur, Instant acquisitionDate, String sourceId) {
        this.qty = qty;
        this.costPerUnit = qty.signum() == 0 ? BigDecimal.ZERO : costEur.divide(qty, MC);
        this.acquisitionDate = acquisitionDate;
        this.sourceId = sourceId;
    }

    public BigDecimal qty() { return qty; }
    public BigDecimal costPerUnit() { return costPerUnit; }
    public Instant acquisitionDate() { return acquisitionDate; }
    public String sourceId() { return sourceId; }

    public void reduce(BigDecimal amount) {
        this.qty = this.qty.subtract(amount);
    }
}
