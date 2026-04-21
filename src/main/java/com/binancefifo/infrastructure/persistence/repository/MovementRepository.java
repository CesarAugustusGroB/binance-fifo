package com.binancefifo.infrastructure.persistence.repository;

import com.binancefifo.infrastructure.persistence.entity.MovementEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MovementRepository extends JpaRepository<MovementEntity, String> {
}
