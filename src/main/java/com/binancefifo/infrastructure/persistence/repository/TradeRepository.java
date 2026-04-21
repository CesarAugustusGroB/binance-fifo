package com.binancefifo.infrastructure.persistence.repository;

import com.binancefifo.infrastructure.persistence.entity.TradeEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TradeRepository extends JpaRepository<TradeEntity, Long> {
}
