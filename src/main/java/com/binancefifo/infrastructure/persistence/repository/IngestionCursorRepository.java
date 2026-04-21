package com.binancefifo.infrastructure.persistence.repository;

import com.binancefifo.infrastructure.persistence.entity.IngestionCursorEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IngestionCursorRepository
        extends JpaRepository<IngestionCursorEntity, IngestionCursorEntity.Key> {
}
