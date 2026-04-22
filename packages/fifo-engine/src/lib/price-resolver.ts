import type { Decimal } from "@binance-fifo/shared";

export interface PriceResolver {
  toEur(asset: string, at: Date): Promise<Decimal>;
}
