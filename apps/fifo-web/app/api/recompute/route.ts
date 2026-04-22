import { NextResponse } from "next/server";

import { assertInternalToken, isUnauthorizedError, readInternalAuthEnv } from "@binance-fifo/shared";

import { inngest } from "../../../lib/inngest/client";

export async function POST(request: Request) {
  try {
    const { INTERNAL_API_TOKEN } = readInternalAuthEnv();
    assertInternalToken(request.headers.get("authorization"), INTERNAL_API_TOKEN);

    await inngest.send({
      name: "fifo/recompute.requested",
      data: {}
    });

    return NextResponse.json({ accepted: true });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: "Failed to enqueue recompute" }, { status: 500 });
  }
}
