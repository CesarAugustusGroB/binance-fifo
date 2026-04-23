import { NextResponse } from "next/server";

import {
  assertInternalToken,
  isUnauthorizedError,
  readInternalAuthEnv
} from "@binance-fifo/shared";

import { readRecentLedger } from "../../../../lib/server/desk";

export async function GET(request: Request) {
  try {
    const { INTERNAL_API_TOKEN } = readInternalAuthEnv();
    assertInternalToken(request.headers.get("authorization"), INTERNAL_API_TOKEN);

    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 200) : 50;

    const entries = await readRecentLedger(limit);
    return NextResponse.json({ entries });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to load ledger" }, { status: 500 });
  }
}
