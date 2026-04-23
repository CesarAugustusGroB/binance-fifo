import { NextResponse } from "next/server";

import {
  assertInternalToken,
  isUnauthorizedError,
  readInternalAuthEnv
} from "@binance-fifo/shared";

import { readUncovered } from "../../../../lib/server/desk";

export async function GET(request: Request) {
  try {
    const { INTERNAL_API_TOKEN } = readInternalAuthEnv();
    assertInternalToken(request.headers.get("authorization"), INTERNAL_API_TOKEN);

    const rows = await readUncovered();
    return NextResponse.json({ rows });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to load uncovered disposals" }, { status: 500 });
  }
}
