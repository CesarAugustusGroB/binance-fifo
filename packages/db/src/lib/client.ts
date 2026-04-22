import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { readServerEnv } from "@binance-fifo/shared";

import * as schema from "./schema";

const env = readServerEnv();

export const sql = postgres(env.DATABASE_URL, {
  prepare: false
});

export const db = drizzle(sql, { schema });
