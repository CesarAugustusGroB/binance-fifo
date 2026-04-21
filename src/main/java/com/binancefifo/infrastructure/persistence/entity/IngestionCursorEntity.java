package com.binancefifo.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;

@Entity
@Table(name = "ingestion_cursor")
public class IngestionCursorEntity {

    @EmbeddedId
    private Key key;

    @Column(name = "last_id")
    private Long lastId;

    @Column(name = "last_sync_at")
    private Instant lastSyncAt;

    public IngestionCursorEntity() {}

    public Key getKey() { return key; }
    public void setKey(Key key) { this.key = key; }
    public Long getLastId() { return lastId; }
    public void setLastId(Long lastId) { this.lastId = lastId; }
    public Instant getLastSyncAt() { return lastSyncAt; }
    public void setLastSyncAt(Instant lastSyncAt) { this.lastSyncAt = lastSyncAt; }

    @Embeddable
    public static class Key implements Serializable {
        private String source;
        private String symbol;

        public Key() {}
        public Key(String source, String symbol) {
            this.source = source;
            this.symbol = symbol;
        }

        public String getSource() { return source; }
        public void setSource(String source) { this.source = source; }
        public String getSymbol() { return symbol; }
        public void setSymbol(String symbol) { this.symbol = symbol; }

        @Override public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof Key k)) return false;
            return Objects.equals(source, k.source) && Objects.equals(symbol, k.symbol);
        }
        @Override public int hashCode() { return Objects.hash(source, symbol); }
    }
}
