package com.binancefifo.infrastructure.binance;

import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

import static java.nio.charset.StandardCharsets.UTF_8;

/**
 * Pure HMAC-SHA256 helper for Binance's signed endpoints. Keep this class dependency-free
 * so the unit test is trivial against Binance's published example vectors.
 */
@Component
public class HmacSigner {

    public String sign(String queryString, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(queryString.getBytes(UTF_8)));
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("HMAC-SHA256 unavailable", e);
        }
    }
}
