import { readStatus } from "@binance-fifo/db";

export async function readStatusSnapshot() {
  const snapshot = await readStatus();
  return {
    tradeCount: snapshot.tradeCount,
    movementCount: snapshot.movementCount,
    gainCount: snapshot.gainCount,
    cursors: snapshot.cursorRows
  };
}
