package com.binancefifo.infrastructure.binance;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class HmacSignerTest {

    // Official example from Binance docs:
    //   secret   = NhqPtmdSJYdKjVHjA7PZj4Mge3R5YNiP1e3UZjInClVN65XAbvqqM6A7H5fATj0j
    //   query    = symbol=LTCBTC&side=BUY&type=LIMIT&timeInForce=GTC&quantity=1&price=0.1&recvWindow=5000&timestamp=1499827319559
    //   expected = c8db56825ae71d6d79447849e617115f4a920fa2acdcab2b053c4b2838bd6b71
    @Test
    void signs_binance_docs_example() {
        HmacSigner signer = new HmacSigner();

        String secret = "NhqPtmdSJYdKjVHjA7PZj4Mge3R5YNiP1e3UZjInClVN65XAbvqqM6A7H5fATj0j";
        String query = "symbol=LTCBTC&side=BUY&type=LIMIT&timeInForce=GTC"
                + "&quantity=1&price=0.1&recvWindow=5000&timestamp=1499827319559";

        assertThat(signer.sign(query, secret))
                .isEqualTo("c8db56825ae71d6d79447849e617115f4a920fa2acdcab2b053c4b2838bd6b71");
    }
}
