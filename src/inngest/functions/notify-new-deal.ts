import { inngest } from "@/inngest/client";
import { db } from "@/db";
import { follows, listings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notifyCustomer } from "@/lib/notify";

async function getFollowersForListing(listingId: string) {
  const listing = await db.query.listings.findFirst({ where: eq(listings.id, listingId) });
  if (!listing) return [];

  return db.query.follows.findMany({
    where: eq(follows.providerId, listing.providerId),
  });
}

export const notifyNewDeal = inngest.createFunction(
  { id: "notify-new-deal", retries: 2, triggers: [{ event: "listing/created" }] },
  async ({ event, step }) => {
    const { listingId, reoffer } = event.data as { listingId: string; reoffer?: boolean };

    const followers = await step.run("get-followers", () =>
      getFollowersForListing(listingId)
    );

    if (followers.length === 0) return { notified: 0 };

    await step.run("notify-all", () =>
      Promise.all(
        followers.map((f) =>
          notifyCustomer(f.userId, reoffer ? "deal_reoffer" : "new_deal", { listingId })
        )
      )
    );

    return { notified: followers.length };
  }
);
