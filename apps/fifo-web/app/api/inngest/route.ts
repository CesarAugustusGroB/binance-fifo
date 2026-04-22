import { serve } from "inngest/next";

import { inngest } from "../../../lib/inngest/client";
import { backfillPrices } from "../../../lib/inngest/functions/backfill-prices";
import { ingestTrades } from "../../../lib/inngest/functions/ingest-trades";
import { recomputeFifo } from "../../../lib/inngest/functions/recompute-fifo";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [ingestTrades, backfillPrices, recomputeFifo]
});
