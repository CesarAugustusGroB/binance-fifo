import { createHash } from "node:crypto";

export function sessionHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
