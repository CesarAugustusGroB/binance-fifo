import { countUncovered, readLastRecomputeAt, readStatus } from "@binance-fifo/db";

export async function readStatusSnapshot() {
  if (!process.env.DATABASE_URL) {
    return {
      tradeCount: 0,
      movementCount: 0,
      gainCount: 0,
      uncoveredCount: 0,
      lastRecomputeAt: null as Date | null,
      cursors: [],
      setupMissing: ["DATABASE_URL"]
    };
  }

  const [snapshot, uncoveredCount, lastRecomputeAt] = await Promise.all([
    readStatus(),
    countUncovered(),
    readLastRecomputeAt()
  ]);
  return {
    tradeCount: snapshot.tradeCount,
    movementCount: snapshot.movementCount,
    gainCount: snapshot.gainCount,
    uncoveredCount,
    lastRecomputeAt: lastRecomputeAt ? new Date(lastRecomputeAt) : null,
    cursors: snapshot.cursorRows,
    setupMissing: []
  };
}
