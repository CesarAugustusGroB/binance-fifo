import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { readInternalAuthEnv } from "@binance-fifo/shared";

import { sessionHash } from "../../../../lib/server/session";

export async function POST(request: Request) {
  let expected: string;
  try {
    expected = readInternalAuthEnv().INTERNAL_API_TOKEN;
  } catch {
    return NextResponse.json({ error: "Server token not configured" }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as
    | { token?: string; remember?: boolean }
    | null;
  const token = body?.token ?? "";
  const remember = Boolean(body?.remember);

  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  const ok = a.length === b.length && timingSafeEqual(a, b);

  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("fifo_session", sessionHash(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: remember ? 60 * 60 * 24 * 7 : 60 * 60 * 8
  });
  return res;
}
