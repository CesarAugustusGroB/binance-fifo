package com.binancefifo.application;

import com.binancefifo.domain.fifo.FifoEngine;
import com.binancefifo.infrastructure.persistence.repository.MovementRepository;
import com.binancefifo.infrastructure.persistence.repository.RealizedGainRepository;
import com.binancefifo.infrastructure.persistence.repository.TradeRepository;
import com.binancefifo.infrastructure.price.PriceResolver;
import org.springframework.stereotype.Service;

/**
 * Reads all trades + movements, maps them to {@link com.binancefifo.domain.fifo.AssetEvent}s
 * priced in EUR (via {@link PriceResolver}), feeds them to the pure {@link FifoEngine}, and
 * persists the resulting {@link com.binancefifo.domain.fifo.RealizedGain}s.
 *
 * See DESIGN.md §6 for the trade → AssetEvent mapping rules, including BNB commissions.
 */
@Service
public class CalculateFifoUseCase {

    private final TradeRepository tradeRepository;
    private final MovementRepository movementRepository;
    private final RealizedGainRepository realizedGainRepository;
    private final PriceResolver priceResolver;

    public CalculateFifoUseCase(TradeRepository tradeRepository,
                                MovementRepository movementRepository,
                                RealizedGainRepository realizedGainRepository,
                                PriceResolver priceResolver) {
        this.tradeRepository = tradeRepository;
        this.movementRepository = movementRepository;
        this.realizedGainRepository = realizedGainRepository;
        this.priceResolver = priceResolver;
    }

    public void run() {
        // TODO:
        //  1. Truncate realized_gains (full recompute is cheap for personal scale)
        //  2. Load trades + movements
        //  3. Map via AssetEventMapper (to be written) → List<AssetEvent>
        //  4. engine.apply(events); persist engine.gains()
    }
}
