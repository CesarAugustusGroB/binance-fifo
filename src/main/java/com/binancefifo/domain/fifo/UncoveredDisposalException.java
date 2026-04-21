package com.binancefifo.domain.fifo;

import java.math.BigDecimal;

/**
 * Thrown when a DISPOSAL can't be fully matched by prior ACQUISITIONs — i.e. you're selling
 * more than the history shows you own. Usually means a missing external transfer-in, airdrop,
 * or pre-API holding that the user needs to inject via a manual-acquisition command.
 */
public class UncoveredDisposalException extends RuntimeException {
    public UncoveredDisposalException(AssetEvent disposal, BigDecimal uncoveredQty) {
        super("Uncovered disposal of " + uncoveredQty + " " + disposal.asset().code()
                + " at " + disposal.timestamp() + " (sourceId=" + disposal.sourceId() + ")");
    }
}
