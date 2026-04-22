import { z } from "zod";

const numericString = z.string().regex(/^-?\d+(\.\d+)?$/);

export const tradeDtoSchema = z.object({
  symbol: z.string(),
  id: z.number(),
  orderId: z.number().optional(),
  price: numericString,
  qty: numericString,
  quoteQty: numericString,
  commission: numericString,
  commissionAsset: z.string(),
  time: z.number(),
  isBuyer: z.boolean(),
  isMaker: z.boolean().optional()
});

export const accountAssetSchema = z.object({
  asset: z.string(),
  free: numericString,
  locked: numericString
});

export const accountDtoSchema = z.object({
  makerCommission: z.number().optional(),
  takerCommission: z.number().optional(),
  buyerCommission: z.number().optional(),
  sellerCommission: z.number().optional(),
  balances: z.array(accountAssetSchema)
});

export const exchangeSymbolSchema = z
  .object({
    symbol: z.string(),
    status: z.string(),
    baseAsset: z.string(),
    quoteAsset: z.string(),
    isSpotTradingAllowed: z.boolean().optional()
  })
  .passthrough();

export const exchangeInfoSchema = z.object({
  symbols: z.array(exchangeSymbolSchema)
});

export const depositDtoSchema = z
  .object({
    id: z.string(),
    amount: numericString,
    coin: z.string(),
    insertTime: z.number()
  })
  .passthrough();

export const withdrawalDtoSchema = z
  .object({
    id: z.string(),
    amount: numericString,
    coin: z.string(),
    applyTime: z.string()
  })
  .passthrough();

export const klineSchema = z.tuple([
  z.number(),
  numericString,
  numericString,
  numericString,
  numericString,
  numericString,
  z.number(),
  numericString,
  z.number(),
  numericString,
  numericString,
  numericString
]);

export type TradeDto = z.infer<typeof tradeDtoSchema>;
export type AccountDto = z.infer<typeof accountDtoSchema>;
export type ExchangeSymbolDto = z.infer<typeof exchangeSymbolSchema>;
export type ExchangeInfoDto = z.infer<typeof exchangeInfoSchema>;
export type DepositDto = z.infer<typeof depositDtoSchema>;
export type WithdrawalDto = z.infer<typeof withdrawalDtoSchema>;
