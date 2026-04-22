import { NextResponse } from "next/server";
import { z } from "zod";

import { assertInternalToken, isUnauthorizedError, readInternalAuthEnv } from "@binance-fifo/shared";

import { inngest } from "../../../lib/inngest/client";

const ingestRequestSchema = z.object({
  fromMs: z.number().int().optional(),
  toMs: z.number().int().optional(),
  rediscover: z.boolean().optional()
});

export async function POST(request: Request) {
  try {
    const { INTERNAL_API_TOKEN } = readInternalAuthEnv();
    assertInternalToken(request.headers.get("authorization"), INTERNAL_API_TOKEN);

    const body = ingestRequestSchema.parse(await request.json().catch(() => ({})));

    await inngest.send({
      name: "fifo/ingest.requested",
      data: body
    });

    return NextResponse.json({ accepted: true });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: "Failed to enqueue ingest" }, { status: 500 });
  }
}
