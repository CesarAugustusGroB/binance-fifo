package com.binancefifo.application;

import com.binancefifo.infrastructure.binance.BinanceClient;
import com.binancefifo.infrastructure.persistence.repository.IngestionCursorRepository;
import com.binancefifo.infrastructure.persistence.repository.MovementRepository;
import com.binancefifo.infrastructure.persistence.repository.TradeRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;

/**
 * Orchestrates ingestion of Spot trades, Convert, Dust, Deposits/Withdrawals and Earn rewards
 * into the local database. Each per-source step is idempotent and resumable via the
 * {@code ingestion_cursor} table.
 *
 * See DESIGN.md §4 for the full pipeline and cursor semantics.
 */
@Service
public class IngestTradesUseCase {

    private final BinanceClient binance;
    private final TradeRepository tradeRepository;
    private final MovementRepository movementRepository;
    private final IngestionCursorRepository cursorRepository;

    public IngestTradesUseCase(BinanceClient binance,
                               TradeRepository tradeRepository,
                               MovementRepository movementRepository,
                               IngestionCursorRepository cursorRepository) {
        this.binance = binance;
        this.tradeRepository = tradeRepository;
        this.movementRepository = movementRepository;
        this.cursorRepository = cursorRepository;
    }

    public void run(Instant from, Instant to) {
        // TODO:
        //  1. Discover symbols (see known_symbols table)
        //  2. For each symbol: paginate /myTrades from cursor → map → save
        //  3. Convert /sapi/v1/convert/tradeFlow → two synthetic trades each
        //  4. Dust /sapi/v1/asset/dribblet
        //  5. Deposits / withdrawals → movements
        //  6. Earn / staking rewards → movements as STAKING_REWARD
    }
}
