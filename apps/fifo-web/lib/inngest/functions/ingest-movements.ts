import { inngest } from "../client";
import { ingestMovements } from "../../server/ingest-movements";

export const ingestMovementsFn = inngest.createFunction(
  { id: "ingest-movements", retries: 3 },
  { event: "fifo/movements.requested" },
  async ({ event, step }) => {
    const result = await step.run("ingest-movements", async () =>
      ingestMovements(event.data as { fromMs?: number } | undefined)
    );

    await step.sendEvent("trigger-recompute", {
      name: "fifo/recompute.requested",
      data: {}
    });

    return result;
  }
);
