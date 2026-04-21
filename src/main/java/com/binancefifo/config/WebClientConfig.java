package com.binancefifo.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
@EnableConfigurationProperties(BinanceProperties.class)
public class WebClientConfig {

    @Bean
    public WebClient binanceWebClient(BinanceProperties props) {
        return WebClient.builder()
                .baseUrl(props.baseUrl())
                .defaultHeader("X-MBX-APIKEY", props.apiKey() == null ? "" : props.apiKey())
                .build();
    }
}
