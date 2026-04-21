package com.binancefifo.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "trades")
public class TradeEntity {

    @Id
    private Long id;

    private String symbol;

    @Column(name = "base_asset")
    private String baseAsset;

    @Column(name = "quote_asset")
    private String quoteAsset;

    private String side;
    private BigDecimal qty;
    private BigDecimal price;

    @Column(name = "quote_qty")
    private BigDecimal quoteQty;

    private BigDecimal commission;

    @Column(name = "commission_asset")
    private String commissionAsset;

    @Column(name = "executed_at")
    private Instant executedAt;

    @Column(name = "order_id")
    private Long orderId;

    private String source;

    public TradeEntity() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getSymbol() { return symbol; }
    public void setSymbol(String symbol) { this.symbol = symbol; }
    public String getBaseAsset() { return baseAsset; }
    public void setBaseAsset(String baseAsset) { this.baseAsset = baseAsset; }
    public String getQuoteAsset() { return quoteAsset; }
    public void setQuoteAsset(String quoteAsset) { this.quoteAsset = quoteAsset; }
    public String getSide() { return side; }
    public void setSide(String side) { this.side = side; }
    public BigDecimal getQty() { return qty; }
    public void setQty(BigDecimal qty) { this.qty = qty; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public BigDecimal getQuoteQty() { return quoteQty; }
    public void setQuoteQty(BigDecimal quoteQty) { this.quoteQty = quoteQty; }
    public BigDecimal getCommission() { return commission; }
    public void setCommission(BigDecimal commission) { this.commission = commission; }
    public String getCommissionAsset() { return commissionAsset; }
    public void setCommissionAsset(String commissionAsset) { this.commissionAsset = commissionAsset; }
    public Instant getExecutedAt() { return executedAt; }
    public void setExecutedAt(Instant executedAt) { this.executedAt = executedAt; }
    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
}
