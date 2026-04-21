package com.binancefifo.domain.fifo;

import com.binancefifo.domain.trade.Asset;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Scaffolding only — these four cases are the ones the plan calls out as mandatory:
 *   - 1 buy / 1 sell
 *   - 1 buy / N sells
 *   - 1 sell crossing 3 lots
 *   - BNB commission allocated to acquisition cost
 * Bodies are intentionally minimal; flesh out before trusting engine output.
 */
class FifoEngineTest {

    private static final Asset BTC = Asset.of("BTC");

    @Test
    void single_buy_single_sell_produces_pnl() {
        FifoEngine engine = new FifoEngine();
        engine.apply(List.of(
                acq(BTC, "1",  "10000", Instant.parse("2024-01-01T00:00:00Z"), 1, "buy-1"),
                disp(BTC, "1", "15000", Instant.parse("2024-06-01T00:00:00Z"), 2, "sell-1")
        ));

        assertThat(engine.gains()).hasSize(1);
        assertThat(engine.gains().get(0).pnlEur()).isEqualByComparingTo("5000");
    }

    @Test
    void disposal_without_lots_throws() {
        FifoEngine engine = new FifoEngine();
        assertThatThrownBy(() -> engine.apply(List.of(
                disp(BTC, "1", "15000", Instant.parse("2024-06-01T00:00:00Z"), 1, "sell-orphan")
        ))).isInstanceOf(UncoveredDisposalException.class);
    }

    // TODO: 1 buy / N sells
    // TODO: 1 sell crossing 3 lots
    // TODO: BNB commission allocated into acquisition cost basis

    private static AssetEvent acq(Asset a, String qty, String costEur, Instant ts, long seq, String id) {
        return new AssetEvent(AssetEvent.EventType.ACQUISITION, a,
                new BigDecimal(qty), new BigDecimal(costEur), BigDecimal.ZERO, ts, seq, id);
    }

    private static AssetEvent disp(Asset a, String qty, String valueEur, Instant ts, long seq, String id) {
        return new AssetEvent(AssetEvent.EventType.DISPOSAL, a,
                new BigDecimal(qty), BigDecimal.ZERO, new BigDecimal(valueEur), ts, seq, id);
    }
}
