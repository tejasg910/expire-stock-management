import { inngest } from "@/inngest/client";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export const priceDecay = inngest.createFunction(
  { id: "price-decay", retries: 2, triggers: [{ event: "listing/created" }] },
  async ({ event, step }) => {
    const { listingId, reoffer } = event.data as { listingId: string; reoffer?: boolean };

    const listing = await step.run("load-listing", () =>
      db.query.listings.findFirst({ where: eq(listings.id, listingId) })
    );

    if (!listing) return { skipped: true, reason: "not_found" };
    if (listing.status !== "active") return { skipped: true, reason: listing.status };
    // Don't re-start price decay on a re-offer if it was already decaying
    if (reoffer) return { skipped: true, reason: "reoffer_no_decay_restart" };

    const start = new Date(listing.createdAt).getTime();

    for (const [i, tier] of listing.decaySchedule.entries()) {
      await step.sleepUntil(`tier-${i}`, new Date(start + tier.afterMinutes * 60_000));

      const stillActive = await step.run(`apply-tier-${i}`, async () => {
        const rows = await db
          .update(listings)
          .set({
            currentPrice: sql`round(${listing.originalPrice}::numeric * (1 - ${tier.discountPct} / 100.0), 2)`,
          })
          .where(and(eq(listings.id, listing.id), eq(listings.status, "active")))
          .returning({ id: listings.id });
        return rows.length > 0;
      });

      if (!stillActive) return { outcome: "ended_early", tier: i };
    }

    await step.sleepUntil("close", new Date(listing.closeAt));

    await step.run("expire-if-leftover", () =>
      db
        .update(listings)
        .set({ status: "expired" })
        .where(and(eq(listings.id, listing.id), eq(listings.status, "active")))
    );

    return { outcome: "closed" };
  }
);
