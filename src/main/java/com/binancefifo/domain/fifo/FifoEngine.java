package com.binancefifo.domain.fifo;

import com.binancefifo.domain.trade.Asset;

import java.math.BigDecimal;
import java.math.MathContext;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Pure-domain FIFO matcher. No Spring, no I/O, no DB. Hand it a list of AssetEvents
 * (already priced in EUR by the mapper) and it produces RealizedGains.
 *
 * Not thread-safe. Intended to be built fresh per calculation run.
 */
public class FifoEngine {
    private static final MathContext MC = MathContext.DECIMAL64;

    private final Map<Asset, Deque<Lot>> queues = new HashMap<>();
    private final List<RealizedGain> gains = new ArrayList<>();

    public void apply(List<AssetEvent> events) {
        events.stream()
                .sorted(Comparator.comparing(AssetEvent::timestamp)
                        .thenComparingLong(AssetEvent::sequence))
                .forEach(this::process);
    }

    public List<RealizedGain> gains() {
        return List.copyOf(gains);
    }

    public Map<Asset, Deque<Lot>> openLots() {
        return queues;
    }

    private void process(AssetEvent e) {
        switch (e.type()) {
            case ACQUISITION -> queues
                    .computeIfAbsent(e.asset(), k -> new ArrayDeque<>())
                    .addLast(new Lot(e.qty(), e.costEur(), e.timestamp(), e.sourceId()));
            case DISPOSAL -> matchFifo(e);
        }
    }

    private void matchFifo(AssetEvent sell) {
        BigDecimal remaining = sell.qty();
        BigDecimal proceedsPerUnit = sell.valueEur().divide(sell.qty(), MC);
        Deque<Lot> queue = queues.getOrDefault(sell.asset(), new ArrayDeque<>());

        while (remaining.signum() > 0 && !queue.isEmpty()) {
            Lot lot = queue.peekFirst();
            BigDecimal matched = remaining.min(lot.qty());
            BigDecimal cost = matched.multiply(lot.costPerUnit());
            BigDecimal proceeds = matched.multiply(proceedsPerUnit);

            gains.add(new RealizedGain(
                    sell.asset(), matched,
                    lot.acquisitionDate(), cost,
                    sell.timestamp(), proceeds,
                    proceeds.subtract(cost),
                    lot.sourceId(), sell.sourceId()
            ));

            lot.reduce(matched);
            if (lot.qty().signum() == 0) queue.pollFirst();
            remaining = remaining.subtract(matched);
        }

        if (remaining.signum() > 0) {
            throw new UncoveredDisposalException(sell, remaining);
        }
    }
}
