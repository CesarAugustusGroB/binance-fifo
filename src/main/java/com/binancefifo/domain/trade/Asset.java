package com.binancefifo.domain.trade;

/** Ticker for a tradable asset, e.g. BTC, ETH, USDT, EUR. */
public record Asset(String code) {
    public Asset {
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("Asset code must not be blank");
        }
    }

    public static Asset of(String code) {
        return new Asset(code.toUpperCase());
    }
}
