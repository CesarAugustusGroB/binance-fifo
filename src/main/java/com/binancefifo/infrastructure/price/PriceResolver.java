package com.binancefifo.infrastructure.price;

import com.binancefifo.domain.trade.Asset;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Resolves the EUR value of {@code amount} of {@code asset} at {@code at}.
 *
 * Implementation plan (DESIGN.md §5):
 *  1. Use Binance 1-minute klines (e.g. EURUSDT) and cache in price_cache.
 *  2. If no direct asset/EUR pair exists, hop through a liquid intermediate (USDT).
 *  3. Fall back to the nearest available minute when the exact minute is missing.
 */
public interface PriceResolver {

    BigDecimal toEur(Asset asset, BigDecimal amount, Instant at);
}
