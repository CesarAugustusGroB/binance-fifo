package com.binancefifo.infrastructure.binance;

import com.binancefifo.config.BinanceProperties;
import com.binancefifo.infrastructure.binance.dto.BinanceTradeDto;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;

import java.time.Instant;

/**
 * Thin Binance REST client. Responsibilities:
 *  - Sign SIGNED endpoints (timestamp + recvWindow + ordered query + HMAC) via HmacSigner.
 *  - Page /api/v3/myTrades, /sapi/v1/convert/tradeFlow, dust, deposits, withdrawals, earn.
 *  - Respect RateLimiter acquire() before each call and feed X-MBX-USED-WEIGHT-1M back in.
 *
 * Implementation is deliberately empty in the scaffold — see DESIGN.md §3.
 */
@Component
public class BinanceClient {

    private final WebClient webClient;
    private final BinanceProperties props;
    private final HmacSigner signer;
    private final RateLimiter rateLimiter;

    public BinanceClient(WebClient binanceWebClient,
                         BinanceProperties props,
                         HmacSigner signer,
                         RateLimiter rateLimiter) {
        this.webClient = binanceWebClient;
        this.props = props;
        this.signer = signer;
        this.rateLimiter = rateLimiter;
    }

    public Flux<BinanceTradeDto> myTrades(String symbol, Instant from, Instant to) {
        // TODO: paginate via fromId + limit=1000 (see DESIGN.md §3.3)
        return Flux.empty();
    }
}
