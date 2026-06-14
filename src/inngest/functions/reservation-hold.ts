import { inngest } from "@/inngest/client";
import { GLOBAL_MAX_PICKUP_MINUTES } from "@/inngest/constants";
import { db } from "@/db";
import { listings, reservations } from "@/db/schema";
import { notifyCustomer, notifyProvider } from "@/lib/notify";
import { eq, sql } from "drizzle-orm";

export const reservationHold = inngest.createFunction(
  { id: "reservation-hold", retries: 3, triggers: [{ event: "reservation/created" }] },
  async ({ event, step }) => {
    const { reservationId, listingId, userId, quantity, windowMinutes } = event.data as {
      reservationId: string;
      listingId: string;
      userId: string;
      quantity: number;
      windowMinutes: number;
    };

    // Stock already decremented synchronously in claimListing action.
    // Inngest handles: notify, wait for pickup, release on timeout.

    const minutes = Math.min(windowMinutes, GLOBAL_MAX_PICKUP_MINUTES);

    const pickupCode = await step.run("finalize-hold", async () => {
      const res = await db.query.reservations.findFirst({
        where: eq(reservations.id, reservationId),
      });
      if (!res) throw new Error("Reservation not found");
      await db
        .update(reservations)
        .set({ pickupWindowMinutes: minutes, holdExpiresAt: new Date(Date.now() + minutes * 60_000) })
        .where(eq(reservations.id, reservationId));
      return res.pickupCode;
    });

    await step.run("notify-provider", () =>
      notifyProvider(listingId, "reservation_created", { reservationId, minutes, pickupCode })
    );
    await step.run("notify-customer", () =>
      notifyCustomer(userId, "reservation_created", { reservationId, minutes, pickupCode })
    );

    const settled = await step.waitForEvent("await-pickup", {
      event: "reservation/pickup-confirmed",
      match: "data.reservationId",
      timeout: `${minutes}m`,
    });

    if (settled) {
      return { outcome: "picked_up" };
    }

    // Timeout — release stock, mark expired, re-offer
    await step.run("release-stock", async () => {
      await db
        .update(listings)
        .set({ quantityAvailable: sql`${listings.quantityAvailable} + ${quantity}`, status: "active" })
        .where(eq(listings.id, listingId));
      await db
        .update(reservations)
        .set({ status: "expired" })
        .where(eq(reservations.id, reservationId));
    });

    await step.run("notify-expired", () =>
      notifyCustomer(userId, "hold_expired", { reservationId })
    );

    await step.sendEvent("re-offer", {
      name: "listing/created",
      data: { listingId, reoffer: true },
    });

    return { outcome: "expired_released" };
  }
);
