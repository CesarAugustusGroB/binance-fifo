package com.binancefifo.infrastructure.binance;

import com.binancefifo.config.BinanceProperties;
import org.springframework.stereotype.Component;

/**
 * Stub for weight-aware rate limiting. Fill in with Bucket4j (weightPerMinute from props) or
 * a simple adaptive backoff driven by the X-MBX-USED-WEIGHT-1M response header.
 * See DESIGN.md §3.2.
 */
@Component
public class RateLimiter {

    private final BinanceProperties props;

    public RateLimiter(BinanceProperties props) {
        this.props = props;
    }

    public void acquire(int weight) {
        // TODO: Bucket4j bucket configured from props.rateLimit().weightPerMinute()
    }

    public void onResponseWeight(int usedWeightPerMinute) {
        // TODO: throttle proactively when nearing props.rateLimit().weightPerMinute()
    }
}
