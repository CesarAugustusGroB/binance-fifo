package com.binancefifo.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "realized_gains")
public class RealizedGainEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String asset;
    private BigDecimal qty;

    @Column(name = "acquisition_date")
    private Instant acquisitionDate;

    @Column(name = "acquisition_cost_eur")
    private BigDecimal acquisitionCostEur;

    @Column(name = "disposal_date")
    private Instant disposalDate;

    @Column(name = "disposal_value_eur")
    private BigDecimal disposalValueEur;

    @Column(name = "pnl_eur")
    private BigDecimal pnlEur;

    @Column(name = "source_buy_trade_id")
    private Long sourceBuyTradeId;

    @Column(name = "source_sell_trade_id")
    private Long sourceSellTradeId;

    public RealizedGainEntity() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getAsset() { return asset; }
    public void setAsset(String asset) { this.asset = asset; }
    public BigDecimal getQty() { return qty; }
    public void setQty(BigDecimal qty) { this.qty = qty; }
    public Instant getAcquisitionDate() { return acquisitionDate; }
    public void setAcquisitionDate(Instant acquisitionDate) { this.acquisitionDate = acquisitionDate; }
    public BigDecimal getAcquisitionCostEur() { return acquisitionCostEur; }
    public void setAcquisitionCostEur(BigDecimal acquisitionCostEur) { this.acquisitionCostEur = acquisitionCostEur; }
    public Instant getDisposalDate() { return disposalDate; }
    public void setDisposalDate(Instant disposalDate) { this.disposalDate = disposalDate; }
    public BigDecimal getDisposalValueEur() { return disposalValueEur; }
    public void setDisposalValueEur(BigDecimal disposalValueEur) { this.disposalValueEur = disposalValueEur; }
    public BigDecimal getPnlEur() { return pnlEur; }
    public void setPnlEur(BigDecimal pnlEur) { this.pnlEur = pnlEur; }
    public Long getSourceBuyTradeId() { return sourceBuyTradeId; }
    public void setSourceBuyTradeId(Long sourceBuyTradeId) { this.sourceBuyTradeId = sourceBuyTradeId; }
    public Long getSourceSellTradeId() { return sourceSellTradeId; }
    public void setSourceSellTradeId(Long sourceSellTradeId) { this.sourceSellTradeId = sourceSellTradeId; }
}
