package com.binancefifo.infrastructure.cli;

import org.springframework.shell.standard.ShellComponent;
import org.springframework.shell.standard.ShellMethod;
import org.springframework.shell.standard.ShellOption;

/**
 * Spring Shell entry points. Commands here are thin — they delegate to application use cases
 * (see DESIGN.md §8 for the full command contract).
 */
@ShellComponent
public class FifoShellCommands {

    @ShellMethod(key = "ingest", value = "Download trades + movements from Binance into local H2")
    public String ingest(
            @ShellOption(defaultValue = "") String from,
            @ShellOption(defaultValue = "") String to) {
        // TODO: delegate to IngestTradesUseCase
        return "not-implemented";
    }

    @ShellMethod(key = "calculate-fifo", value = "Run the FIFO engine over ingested data")
    public String calculateFifo() {
        // TODO: delegate to CalculateFifoUseCase
        return "not-implemented";
    }

    @ShellMethod(key = "export", value = "Export realised gains for a fiscal year to CSV")
    public String export(
            @ShellOption int year,
            @ShellOption(defaultValue = "./report.csv") String out) {
        // TODO: delegate to ExportTaxReportUseCase
        return "not-implemented";
    }

    @ShellMethod(key = "status", value = "Show ingestion coverage and totals")
    public String status() {
        // TODO: counts of trades / movements / cursor positions
        return "not-implemented";
    }

    @ShellMethod(key = "manual-acquisition",
            value = "Inject a pre-API acquisition (e.g. a wallet transfer-in) to cover disposals")
    public String manualAcquisition(
            @ShellOption String asset,
            @ShellOption String qty,
            @ShellOption String costEur,
            @ShellOption String date) {
        // TODO: insert into movements as MANUAL_ACQUISITION
        return "not-implemented";
    }
}
