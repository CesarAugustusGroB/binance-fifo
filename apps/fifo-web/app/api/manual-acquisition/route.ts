import { NextResponse } from "next/server";
import { db, movements } from "@binance-fifo/db";
import { z } from "zod";

import { assertInternalToken, isUnauthorizedError, readInternalAuthEnv } from "@binance-fifo/shared";

const schema = z.object({
  asset: z.string().min(1),
  qty: z.string().min(1),
  costEur: z.string().min(1),
  date: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const { INTERNAL_API_TOKEN } = readInternalAuthEnv();
    assertInternalToken(request.headers.get("authorization"), INTERNAL_API_TOKEN);

    const body = schema.parse(await request.json());
    const id = `MANUAL:${body.asset}:${body.date}:${body.qty}`;

    await db.insert(movements).values({
      id,
      type: "MANUAL_ACQUISITION",
      asset: body.asset,
      amount: body.qty,
      fee: null,
      occurredAt: new Date(body.date),
      metadata: {
        costEur: body.costEur
      }
    });

    return NextResponse.json({ stored: true, id });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: "Failed to store manual acquisition" }, { status: 500 });
  }
}
