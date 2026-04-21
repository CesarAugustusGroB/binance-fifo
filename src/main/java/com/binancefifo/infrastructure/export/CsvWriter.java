package com.binancefifo.infrastructure.export;

import com.binancefifo.domain.fifo.RealizedGain;
import org.springframework.stereotype.Component;

import java.nio.file.Path;
import java.util.List;

/**
 * Writes realised gains to a CSV with columns expected by the Spanish tax workflow
 * (see DESIGN.md §7 for the column contract).
 */
@Component
public class CsvWriter {

    public void writeRealizedGains(List<RealizedGain> gains, Path out) {
        // TODO: header + rows, UTF-8, "," separator (Excel-ES expects ";" — parameterise later)
    }
}
