import { NextResponse } from "next/server";

import {
  assertInternalToken,
  isUnauthorizedError,
  readInternalAuthEnv
} from "@binance-fifo/shared";

import { readOpenLots } from "../../../../lib/server/desk";

export async function GET(request: Request) {
  try {
    const { INTERNAL_API_TOKEN } = readInternalAuthEnv();
    assertInternalToken(request.headers.get("authorization"), INTERNAL_API_TOKEN);

    const assets = await readOpenLots();
    return NextResponse.json({ assets });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to load open lots" }, { status: 500 });
  }
}
