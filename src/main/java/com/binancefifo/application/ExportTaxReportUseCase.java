package com.binancefifo.application;

import com.binancefifo.infrastructure.export.CsvWriter;
import com.binancefifo.infrastructure.persistence.repository.RealizedGainRepository;
import org.springframework.stereotype.Service;

import java.nio.file.Path;

/**
 * Filters {@link com.binancefifo.domain.fifo.RealizedGain}s to a fiscal year (Europe/Madrid)
 * and writes a CSV compatible with Spanish tax aggregators. See DESIGN.md §7 for the contract.
 */
@Service
public class ExportTaxReportUseCase {

    private final RealizedGainRepository repo;
    private final CsvWriter csv;

    public ExportTaxReportUseCase(RealizedGainRepository repo, CsvWriter csv) {
        this.repo = repo;
        this.csv = csv;
    }

    public void run(int year, Path out) {
        // TODO: filter by disposalDate within the year in Europe/Madrid, then csv.writeRealizedGains(...)
    }
}
