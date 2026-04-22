import { readStatusSnapshot } from "../lib/server/status";

async function main() {
  const result = await readStatusSnapshot();
  console.log(JSON.stringify(result, null, 2));
}

void main();
