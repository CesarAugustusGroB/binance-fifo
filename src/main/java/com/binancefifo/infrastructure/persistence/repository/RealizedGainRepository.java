package com.binancefifo.infrastructure.persistence.repository;

import com.binancefifo.infrastructure.persistence.entity.RealizedGainEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RealizedGainRepository extends JpaRepository<RealizedGainEntity, Long> {
}
