import { inngest } from "../client";
import { warmPriceCache } from "../../server/recompute";

export const backfillPrices = inngest.createFunction(
  { id: "backfill-prices", retries: 2 },
  { event: "fifo/prices.requested" },
  async ({ step }) => {
    await step.run("warm-price-cache", async () => {
      await warmPriceCache();
      return true;
    });
  }
);
