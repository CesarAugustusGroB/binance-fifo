import { inngest } from "../client";
import { recomputeRealizedGains } from "../../server/recompute";

export const recomputeFifo = inngest.createFunction(
  { id: "recompute-fifo", retries: 2 },
  { event: "fifo/recompute.requested" },
  async ({ step }) => {
    return step.run("recompute-realized-gains", async () => recomputeRealizedGains());
  }
);
