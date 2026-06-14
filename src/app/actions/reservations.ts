"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { listings, providers, reservations } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq, and, gte, sql } from "drizzle-orm";
import { GLOBAL_MAX_PICKUP_MINUTES } from "@/inngest/constants";
import { makePickupCode } from "@/lib/utils";

const ClaimSchema = z.object({
  listingId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(10),
});

export async function claimListing(_prev: unknown, formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "auth_required" };

  const parsed = ClaimSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { listingId, quantity } = parsed.data;

  const result = await db
    .select({ listing: listings, provider: providers })
    .from(listings)
    .innerJoin(providers, eq(listings.providerId, providers.id))
    .where(and(eq(listings.id, listingId), eq(listings.status, "active")))
    .limit(1);

  if (!result.length) return { error: "Listing not found or no longer active" };

  const provider = result[0].provider;
  const windowMinutes = Math.min(
    provider.defaultPickupWindowMinutes,
    provider.maxPickupWindowMinutes,
    GLOBAL_MAX_PICKUP_MINUTES
  );

  const pickupCode = makePickupCode();
  const holdExpiresAt = new Date(Date.now() + windowMinutes * 60_000);
  const userId = session.user.id;

  // Atomic: decrement stock + create reservation in one transaction.
  // The conditional WHERE prevents oversell — if stock is insufficient the
  // UPDATE returns 0 rows and we abort before inserting the reservation.
  let reservation: typeof reservations.$inferSelect;
  try {
    reservation = await db.transaction(async (tx) => {
      const locked = await tx
        .update(listings)
        .set({ quantityAvailable: sql`${listings.quantityAvailable} - ${quantity}` })
        .where(
          and(
            eq(listings.id, listingId),
            eq(listings.status, "active"),
            gte(listings.quantityAvailable, quantity)
          )
        )
        .returning({ id: listings.id });

      if (!locked.length) throw new Error("sold_out");

      // Mark sold_out if this was the last bag
      const remaining = Number(result[0].listing.quantityAvailable) - quantity;
      if (remaining === 0) {
        await tx.update(listings).set({ status: "sold_out" }).where(eq(listings.id, listingId));
      }

      const [res] = await tx
        .insert(reservations)
        .values({ listingId, userId, quantity, pickupCode, pickupWindowMinutes: windowMinutes, holdExpiresAt, status: "held" })
        .returning();
      return res;
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    return { error: msg === "sold_out" ? "Not enough bags available" : "Could not claim, try again" };
  }

  try {
    await inngest.send({
      name: "reservation/created",
      data: { reservationId: reservation.id, listingId, userId, quantity, windowMinutes },
    });
  } catch (e) {
    console.error("[inngest] send failed", e);
  }

  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/");
  revalidatePath("/my-pickups");

  return {
    success: true,
    reservationId: reservation.id,
    pickupCode,
    holdExpiresAt: holdExpiresAt.toISOString(),
    windowMinutes,
  };
}

export async function confirmPickup(_prev: unknown, formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Not authenticated" };

  const reservationId = formData.get("reservationId") as string;
  const code = formData.get("code") as string;

  const reservation = await db.query.reservations.findFirst({
    where: and(eq(reservations.id, reservationId), eq(reservations.status, "held")),
  });

  if (!reservation) return { error: "Reservation not found or already settled" };
  if (reservation.pickupCode !== code) return { error: "Invalid pickup code" };
  if (new Date() > reservation.holdExpiresAt) return { error: "Pickup window has expired" };

  // Update DB immediately so the dashboard reflects truth right away.
  await db
    .update(reservations)
    .set({ status: "picked_up", completedAt: new Date() })
    .where(eq(reservations.id, reservationId));

  // Signal Inngest so the waitForEvent step completes cleanly.
  try {
    await inngest.send({
      name: "reservation/pickup-confirmed",
      data: { reservationId },
    });
  } catch (e) {
    console.error("[inngest] send failed", e);
  }

  revalidatePath("/provider/dashboard");
  return { success: true };
}

export async function cancelReservation(_prev: unknown, formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Not authenticated" };

  const reservationId = formData.get("reservationId") as string;

  const reservation = await db.query.reservations.findFirst({
    where: and(
      eq(reservations.id, reservationId),
      eq(reservations.userId, session.user.id),
      eq(reservations.status, "held")
    ),
  });

  if (!reservation) return { error: "Reservation not found" };

  // Update DB directly — release stock + mark cancelled atomically.
  await db.transaction(async (tx) => {
    await tx
      .update(reservations)
      .set({ status: "cancelled" })
      .where(eq(reservations.id, reservationId));
    await tx
      .update(listings)
      .set({
        quantityAvailable: sql`${listings.quantityAvailable} + ${reservation.quantity}`,
        status: "active",
      })
      .where(eq(listings.id, reservation.listingId));
  });

  try {
    await inngest.send({ name: "reservation/cancelled", data: { reservationId } });
  } catch (e) {
    console.error("[inngest] send failed", e);
  }

  revalidatePath("/my-pickups");
  revalidatePath("/");
  return { success: true };
}

export async function providerCancelReservation(_prev: unknown, formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Not authenticated" };

  const orgId = session.session.activeOrganizationId;
  if (!orgId) return { error: "No organization" };

  const reservationId = formData.get("reservationId") as string;
  if (!reservationId) return { error: "Missing reservation id" };

  const provider = await db.query.providers.findFirst({
    where: eq(providers.orgId, orgId),
  });
  if (!provider) return { error: "Provider not found" };

  // Join to verify this reservation belongs to a listing owned by this provider.
  const row = await db
    .select({ reservation: reservations, listing: listings })
    .from(reservations)
    .innerJoin(listings, eq(reservations.listingId, listings.id))
    .where(
      and(
        eq(reservations.id, reservationId),
        eq(listings.providerId, provider.id),
        eq(reservations.status, "held")
      )
    )
    .limit(1);

  if (!row.length) return { error: "Reservation not found" };

  const { reservation, listing } = row[0];

  await db.transaction(async (tx) => {
    await tx
      .update(reservations)
      .set({ status: "cancelled" })
      .where(eq(reservations.id, reservationId));
    await tx
      .update(listings)
      .set({
        quantityAvailable: sql`${listings.quantityAvailable} + ${reservation.quantity}`,
        status: "active",
      })
      .where(eq(listings.id, listing.id));
  });

  try {
    await inngest.send({ name: "reservation/cancelled", data: { reservationId } });
  } catch (e) {
    console.error("[inngest] send failed", e);
  }

  revalidatePath("/provider/dashboard");
  return { success: true };
}
