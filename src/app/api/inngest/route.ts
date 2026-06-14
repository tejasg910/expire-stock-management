import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { reservationHold } from "@/inngest/functions/reservation-hold";
import { priceDecay } from "@/inngest/functions/price-decay";
import { notifyNewDeal } from "@/inngest/functions/notify-new-deal";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [reservationHold, priceDecay, notifyNewDeal],
});
