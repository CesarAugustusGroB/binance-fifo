import { recomputeRealizedGains } from "../lib/server/recompute";

async function main() {
  const result = await recomputeRealizedGains();
  console.log(JSON.stringify(result, null, 2));
}

void main();
