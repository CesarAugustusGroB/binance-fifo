import { listRealizedGainsForYear } from "@binance-fifo/db";
import { Decimal, gainsToCsv, madridYear } from "@binance-fifo/shared";

export async function buildGainExport(year: number): Promise<string> {
  if (!Number.isInteger(year) || year < 2009) {
    throw new Error("Invalid year");
  }

  const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
  const gains = await listRealizedGainsForYear(start, end);

  return gainsToCsv(
    gains
      .filter((gain) => madridYear(new Date(gain.disposalDate)) === year)
      .map((gain) => ({
        acquisitionDate: new Date(gain.acquisitionDate),
        disposalDate: new Date(gain.disposalDate),
        asset: gain.asset,
        qty: new Decimal(gain.qty),
        acquisitionCostEur: new Decimal(gain.acquisitionCostEur),
        disposalValueEur: new Decimal(gain.disposalValueEur),
        pnlEur: new Decimal(gain.pnlEur),
        type:
          new Date(gain.disposalDate).getTime() -
            new Date(gain.acquisitionDate).getTime() >
          365 * 24 * 60 * 60 * 1000
            ? "largo_plazo"
            : "corto_plazo",
        exchange: "Binance"
      }))
  );
}
