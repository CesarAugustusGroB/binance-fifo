import { ingestSpotTrades } from "../lib/server/ingest";

async function main() {
  const result = await ingestSpotTrades();
  console.log(JSON.stringify(result, null, 2));
}

void main();
