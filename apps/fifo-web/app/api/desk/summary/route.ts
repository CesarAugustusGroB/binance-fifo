import { NextResponse } from "next/server";

import {
  assertInternalToken,
  isUnauthorizedError,
  readInternalAuthEnv
} from "@binance-fifo/shared";

import { readDeskSummary } from "../../../../lib/server/desk";

export async function GET(request: Request) {
  try {
    const { INTERNAL_API_TOKEN } = readInternalAuthEnv();
    assertInternalToken(request.headers.get("authorization"), INTERNAL_API_TOKEN);

    const url = new URL(request.url);
    const yearParam = url.searchParams.get("year");
    const year = yearParam ? parseInt(yearParam, 10) : undefined;

    const summary = await readDeskSummary(year);
    return NextResponse.json(summary);
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to load summary" }, { status: 500 });
  }
}
