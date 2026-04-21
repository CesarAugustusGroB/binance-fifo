package com.binancefifo.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "binance")
public record BinanceProperties(
        String baseUrl,
        String apiKey,
        String apiSecret,
        int recvWindow,
        RateLimit rateLimit
) {
    public record RateLimit(int weightPerMinute) {}
}
