import { inngest } from "../client";
import { ingestSpotTrades } from "../../server/ingest";

export const ingestTrades = inngest.createFunction(
  { id: "ingest-trades", retries: 3 },
  { event: "fifo/ingest.requested" },
  async ({ event, step }) => {
    const result = await step.run("ingest-spot-trades", async () =>
      ingestSpotTrades(event.data)
    );

    await step.sendEvent("trigger-movements", {
      name: "fifo/movements.requested",
      data: event.data ?? {}
    });

    return result;
  }
);
