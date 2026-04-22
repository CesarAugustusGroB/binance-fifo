import { setTimeout as sleep } from "node:timers/promises";

import type { ZodType } from "zod";

import { BinanceError } from "./errors";
import {
  accountDtoSchema,
  depositDtoSchema,
  klineSchema,
  tradeDtoSchema,
  withdrawalDtoSchema,
  type AccountDto,
  type DepositDto,
  type TradeDto,
  type WithdrawalDto
} from "./schemas";
import { sign } from "./signer";

interface ClientConfig {
  apiKey: string;
  secret: string;
  baseUrl?: string;
}

interface SignedRequestOptions<T> {
  path: string;
  params?: Record<string, string | number | undefined>;
  schema: ZodType<T>;
}

export class BinanceClient {
  private readonly baseUrl: string;

  constructor(private readonly cfg: ClientConfig) {
    this.baseUrl = cfg.baseUrl ?? "https://api.binance.com";
  }

  async account(): Promise<AccountDto> {
    return this.signedRequest({
      path: "/api/v3/account",
      schema: accountDtoSchema
    });
  }

  async *myTrades(
    symbol: string,
    fromMs?: number
  ): AsyncGenerator<TradeDto[], void, void> {
    let fromId: number | undefined;
    while (true) {
      const page = await this.signedRequest({
        path: "/api/v3/myTrades",
        params: {
          symbol,
          limit: 1000,
          startTime: fromMs,
          fromId
        },
        schema: tradeDtoSchema.array()
      });

      if (page.length === 0) {
        return;
      }

      yield page;

      if (page.length < 1000) {
        return;
      }

      fromId = Math.max(...page.map((trade) => trade.id)) + 1;
    }
  }

  async deposits(startTime?: number): Promise<DepositDto[]> {
    const payload = await this.signedRequest({
      path: "/sapi/v1/capital/deposit/hisrec",
      params: { startTime },
      schema: depositDtoSchema.array()
    });
    return payload;
  }

  async withdrawals(startTime?: number): Promise<WithdrawalDto[]> {
    const payload = await this.signedRequest({
      path: "/sapi/v1/capital/withdraw/history",
      params: { startTime },
      schema: withdrawalDtoSchema.array()
    });
    return payload;
  }

  async fetchKline(symbol: string, openTimeMs: number): Promise<string> {
    const result = await this.publicRequest({
      path: "/api/v3/klines",
      params: {
        symbol,
        interval: "1m",
        limit: 1,
        startTime: openTimeMs,
        endTime: openTimeMs + 60_000
      },
      schema: klineSchema.array()
    });

    if (!result[0]) {
      throw new Error(`No kline found for ${symbol} at ${openTimeMs}`);
    }

    return result[0][4];
  }

  private async signedRequest<T>({
    path,
    params = {},
    schema
  }: SignedRequestOptions<T>): Promise<T> {
    const query = new URLSearchParams({
      ...Object.fromEntries(
        Object.entries(params).flatMap(([key, value]) =>
          value === undefined ? [] : [[key, String(value)]]
        )
      ),
      timestamp: Date.now().toString(),
      recvWindow: "5000"
    }).toString();

    const signature = sign(query, this.cfg.secret);
    const url = `${this.baseUrl}${path}?${query}&signature=${signature}`;

    const response = await fetch(url, {
      headers: {
        "X-MBX-APIKEY": this.cfg.apiKey
      },
      cache: "no-store"
    });

    return this.handleResponse<T>(response, schema);
  }

  private async publicRequest<T>({
    path,
    params = {},
    schema
  }: SignedRequestOptions<T>): Promise<T> {
    const query = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).flatMap(([key, value]) =>
          value === undefined ? [] : [[key, String(value)]]
        )
      )
    ).toString();
    const url = `${this.baseUrl}${path}?${query}`;
    const response = await fetch(url, { cache: "no-store" });
    return this.handleResponse<T>(response, schema);
  }

  private async handleResponse<T>(response: Response, schema: ZodType<T>): Promise<T> {
    const payload = await response.json();

    if (!response.ok) {
      throw new BinanceError(payload, response.status);
    }

    const usedWeight = Number(response.headers.get("x-mbx-used-weight-1m") ?? 0);
    if (usedWeight > 1000) {
      await sleep(3000);
    }

    return schema.parse(payload);
  }
}
