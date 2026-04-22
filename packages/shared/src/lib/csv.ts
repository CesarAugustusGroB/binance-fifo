import { Decimal } from "./decimal";
import { toMadridDateTime } from "./date";

export interface CsvGainRow {
  acquisitionDate: Date;
  disposalDate: Date;
  asset: string;
  qty: Decimal;
  acquisitionCostEur: Decimal;
  disposalValueEur: Decimal;
  pnlEur: Decimal;
  type: "corto_plazo" | "largo_plazo";
  exchange: string;
}

export function gainsToCsv(rows: CsvGainRow[]): string {
  const header = [
    "fecha_adquisicion",
    "fecha_transmision",
    "activo",
    "cantidad",
    "valor_adquisicion_eur",
    "valor_transmision_eur",
    "pnl_eur",
    "tipo",
    "exchange"
  ];

  const lines = rows.map((row) =>
    [
      toMadridDateTime(row.acquisitionDate),
      toMadridDateTime(row.disposalDate),
      row.asset,
      row.qty.toFixed(),
      row.acquisitionCostEur.toFixed(),
      row.disposalValueEur.toFixed(),
      row.pnlEur.toFixed(),
      row.type,
      row.exchange
    ].join(",")
  );

  return [header.join(","), ...lines].join("\n");
}
