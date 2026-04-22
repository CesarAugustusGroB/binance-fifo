import { NextResponse } from "next/server";

import { assertInternalToken, isUnauthorizedError, readInternalAuthEnv } from "@binance-fifo/shared";

import { buildGainExport } from "../../../lib/server/export";

export async function GET(request: Request) {
  try {
    const { INTERNAL_API_TOKEN } = readInternalAuthEnv();
    assertInternalToken(request.headers.get("authorization"), INTERNAL_API_TOKEN);

    const url = new URL(request.url);
    const year = Number(url.searchParams.get("year") ?? 0);
    const csv = await buildGainExport(year);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="fifo-${year}.csv"`
      }
    });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: "Failed to export CSV" }, { status: 500 });
  }
}
