export class BinanceError extends Error {
  constructor(
    readonly details: unknown,
    readonly status: number
  ) {
    super(`Binance request failed with status ${status}`);
  }
}
