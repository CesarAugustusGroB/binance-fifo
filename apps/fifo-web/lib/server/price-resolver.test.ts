import { describe, expect, it, vi, beforeEach } from "vitest";

import { BinanceError } from "@binance-fifo/binance-client";
import {
  getCachedPrice,
  getCachedPriceAtOrBefore,
  upsertCachedPrice
} from "@binance-fifo/db";

import {
  BinancePriceResolver
} from "./price-resolver";

vi.mock("@binance-fifo/db", () => ({
  getCachedPrice: vi.fn(),
  getCachedPriceAtOrBefore: vi.fn(),
  upsertCachedPrice: vi.fn()
}));

const mockedGetCachedPrice = vi.mocked(getCachedPrice);
const mockedGetCachedPriceAtOrBefore = vi.mocked(getCachedPriceAtOrBefore);
const mockedUpsertCachedPrice = vi.mocked(upsertCachedPrice);

describe("price-resolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetCachedPrice.mockResolvedValue(undefined);
    mockedGetCachedPriceAtOrBefore.mockResolvedValue(undefined);
    mockedUpsertCachedPrice.mockResolvedValue(undefined);
  });

  it("returns an exact cache hit without calling Binance", async () => {
    const minute = new Date("2024-01-01T12:34:56.000Z");
    const client = {
      fetchNearestKline: vi.fn()
    };
    mockedGetCachedPrice.mockResolvedValueOnce({
      asset: "BTC",
      quote: "EUR",
      minute: new Date("2024-01-01T12:34:00.000Z"),
      price: "42000.1234000000"
    });

    const resolver = new BinancePriceResolver(client);
    const price = await resolver.toEur("BTC", minute);

    expect(price.toFixed()).toBe("42000.1234");
    expect(client.fetchNearestKline).not.toHaveBeenCalled();
    expect(mockedUpsertCachedPrice).not.toHaveBeenCalled();
  });

  it("fetches and caches a direct EUR market", async () => {
    const minute = new Date("2024-01-01T12:34:56.000Z");
    const truncated = new Date("2024-01-01T12:34:00.000Z");
    const client = {
      fetchNearestKline: vi.fn().mockResolvedValue({
        openTimeMs: truncated.getTime(),
        close: "42000"
      })
    };

    const resolver = new BinancePriceResolver(client);
    const price = await resolver.toEur("BTC", minute);

    expect(price.toFixed()).toBe("42000");
    expect(client.fetchNearestKline).toHaveBeenCalledWith("BTCEUR", truncated.getTime());
    expect(mockedUpsertCachedPrice).toHaveBeenCalledWith({
      asset: "BTC",
      quote: "EUR",
      minute: truncated,
      price: "42000"
    });
  });

  it("falls back to a cached earlier direct price and stores the resolved minute", async () => {
    const minute = new Date("2024-01-01T12:34:56.000Z");
    const truncated = new Date("2024-01-01T12:34:00.000Z");
    const earlier = new Date("2024-01-01T12:33:00.000Z");
    const client = {
      fetchNearestKline: vi.fn()
    };

    mockedGetCachedPriceAtOrBefore.mockResolvedValueOnce({
      asset: "BTC",
      quote: "EUR",
      minute: earlier,
      price: "41950"
    });

    const resolver = new BinancePriceResolver(client);
    const price = await resolver.toEur("BTC", minute);

    expect(price.toFixed()).toBe("41950");
    expect(client.fetchNearestKline).not.toHaveBeenCalled();
    expect(mockedUpsertCachedPrice).toHaveBeenCalledWith({
      asset: "BTC",
      quote: "EUR",
      minute: truncated,
      price: "41950"
    });
  });

  it("falls back through USDT hop pricing when the direct market is missing", async () => {
    const minute = new Date("2024-01-01T12:34:56.000Z");
    const truncated = new Date("2024-01-01T12:34:00.000Z");
    const client = {
      fetchNearestKline: vi
        .fn()
        .mockRejectedValueOnce(new BinanceError({ code: -1121, msg: "Invalid symbol." }, 400))
        .mockResolvedValueOnce({
          openTimeMs: truncated.getTime(),
          close: "43000"
        })
        .mockResolvedValueOnce({
          openTimeMs: truncated.getTime(),
          close: "1.08"
        })
    };

    const resolver = new BinancePriceResolver(client);
    const price = await resolver.toEur("BTC", minute);

    expect(price.toDecimalPlaces(10).toFixed()).toBe("39814.8148148148");
    expect(client.fetchNearestKline).toHaveBeenNthCalledWith(1, "BTCEUR", truncated.getTime());
    expect(client.fetchNearestKline).toHaveBeenNthCalledWith(2, "BTCUSDT", truncated.getTime());
    expect(client.fetchNearestKline).toHaveBeenNthCalledWith(3, "EURUSDT", truncated.getTime());
    expect(mockedUpsertCachedPrice).toHaveBeenNthCalledWith(3, {
      asset: "BTC",
      quote: "EUR",
      minute: truncated,
      price: "39814.8148148148148148148148148"
    });
  });

  it("deduplicates concurrent lookups for the same asset and minute", async () => {
    const minute = new Date("2024-01-01T12:34:56.000Z");
    const truncated = new Date("2024-01-01T12:34:00.000Z");
    const directMissing = Promise.reject(
      new BinanceError({ code: -1121, msg: "Invalid symbol." }, 400)
    );
    directMissing.catch(() => undefined);

    const client = {
      fetchNearestKline: vi
        .fn()
        .mockImplementationOnce(() => directMissing)
        .mockResolvedValueOnce({
          openTimeMs: truncated.getTime(),
          close: "43000"
        })
        .mockResolvedValueOnce({
          openTimeMs: truncated.getTime(),
          close: "1.08"
        })
    };

    const resolver = new BinancePriceResolver(client);
    const [first, second] = await Promise.all([
      resolver.toEur("BTC", minute),
      resolver.toEur("BTC", minute)
    ]);

    expect(first.equals(second)).toBe(true);
    expect(client.fetchNearestKline).toHaveBeenCalledTimes(3);
  });

  it("throws actionable diagnostics when no supported market path exists", async () => {
    const minute = new Date("2024-01-01T12:34:56.000Z");
    const truncated = new Date("2024-01-01T12:34:00.000Z");
    const client = {
      fetchNearestKline: vi
        .fn()
        .mockRejectedValueOnce(new BinanceError({ code: -1121, msg: "Invalid symbol." }, 400))
        .mockRejectedValueOnce(new BinanceError({ code: -1121, msg: "Invalid symbol." }, 400))
        .mockResolvedValueOnce({
          openTimeMs: truncated.getTime(),
          close: "1.08"
        })
    };

    const resolver = new BinancePriceResolver(client);

    await expect(resolver.toEur("UNKNOWN", minute)).rejects.toThrowError(
      /Unable to resolve EUR price for UNKNOWN .*UNKNOWNEUR \(market missing\).*UNKNOWNUSDT \(market missing\)/
    );
  });
});
