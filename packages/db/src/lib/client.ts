import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://invalid:invalid@127.0.0.1:1/binance_fifo";

export const sql = postgres(connectionString, {
  prepare: false,
  connect_timeout: 1
});

export const db = drizzle(sql, { schema });
