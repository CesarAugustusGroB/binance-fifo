import { NextResponse } from "next/server";

import {
  assertInternalToken,
  isUnauthorizedError,
  readInternalAuthEnv
} from "@binance-fifo/shared";

import { readStatusSnapshot } from "../../../lib/server/status";

export async function GET(request: Request) {
  try {
    const { INTERNAL_API_TOKEN } = readInternalAuthEnv();
    assertInternalToken(request.headers.get("authorization"), INTERNAL_API_TOKEN);

    const snapshot = await readStatusSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: "Failed to load status" }, { status: 500 });
  }
}
