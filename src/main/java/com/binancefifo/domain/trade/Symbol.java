package com.binancefifo.domain.trade;

/**
 * A Binance trading pair: base/quote (e.g. BTCUSDT → base=BTC, quote=USDT).
 * Binance concatenates symbols without a separator; the split comes from /api/v3/exchangeInfo.
 */
public record Symbol(String raw, Asset base, Asset quote) {
    public Symbol {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Symbol must not be blank");
        }
    }
}
