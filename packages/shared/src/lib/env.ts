import { z } from "zod";

const sharedSchema = {
  BINANCE_API_KEY: z.string().min(1),
  BINANCE_API_SECRET: z.string().min(1),
  DATABASE_URL: z.string().url(),
  INNGEST_EVENT_KEY: z.string().min(1),
  INNGEST_SIGNING_KEY: z.string().min(1),
  INTERNAL_API_TOKEN: z.string().min(1)
};

const envSchema = z.object(sharedSchema);
const databaseSchema = z.object({ DATABASE_URL: sharedSchema.DATABASE_URL });
const internalAuthSchema = z.object({
  INTERNAL_API_TOKEN: sharedSchema.INTERNAL_API_TOKEN
});
const binanceSchema = z.object({
  BINANCE_API_KEY: sharedSchema.BINANCE_API_KEY,
  BINANCE_API_SECRET: sharedSchema.BINANCE_API_SECRET
});
const inngestSchema = z.object({
  INNGEST_EVENT_KEY: sharedSchema.INNGEST_EVENT_KEY,
  INNGEST_SIGNING_KEY: sharedSchema.INNGEST_SIGNING_KEY
});

export type AppEnv = z.infer<typeof envSchema>;

export function readServerEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  return envSchema.parse(source);
}

export function readDatabaseEnv(source: NodeJS.ProcessEnv = process.env) {
  return databaseSchema.parse(source);
}

export function readInternalAuthEnv(source: NodeJS.ProcessEnv = process.env) {
  return internalAuthSchema.parse(source);
}

export function readBinanceEnv(source: NodeJS.ProcessEnv = process.env) {
  return binanceSchema.parse(source);
}

export function readInngestEnv(source: NodeJS.ProcessEnv = process.env) {
  return inngestSchema.parse(source);
}
