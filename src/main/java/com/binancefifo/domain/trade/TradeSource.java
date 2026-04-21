package com.binancefifo.domain.trade;

/** Where a trade came from. SPOT = /myTrades, CONVERT = /convert/tradeFlow, DUST = /asset/dribblet. */
public enum TradeSource {
    SPOT,
    CONVERT,
    DUST
}
