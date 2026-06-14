"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { listings, providers } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";

const NewListingSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  originalPrice: z.coerce.number().positive(),
  discountPct: z.coerce.number().int().min(5).max(90),
  quantityTotal: z.coerce.number().int().positive(),
  closeAt: z.string().min(1),
});

const UpdateListingSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  originalPrice: z.coerce.number().positive(),
  discountPct: z.coerce.number().int().min(5).max(90),
  quantityTotal: z.coerce.number().int().positive(),
  closeAt: z.string().min(1),
});

export async function updateListing(_prev: unknown, formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Not authenticated" };

  const orgId = session.session.activeOrganizationId;
  if (!orgId) return { error: "No organization" };

  const listingId = formData.get("listingId") as string;
  if (!listingId) return { error: "Missing listing id" };

  const provider = await db.query.providers.findFirst({ where: eq(providers.orgId, orgId) });
  if (!provider) return { error: "Provider not found" };

  const listing = await db.query.listings.findFirst({ where: eq(listings.id, listingId) });
  if (!listing || listing.providerId !== provider.id) return { error: "Listing not found" };

  const parsed = UpdateListingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { originalPrice, discountPct, quantityTotal, closeAt, ...rest } = parsed.data;
  const quantityDiff = quantityTotal - listing.quantityTotal;
  const currentPrice = (originalPrice * (1 - discountPct / 100)).toFixed(2);

  await db
    .update(listings)
    .set({
      ...rest,
      originalPrice: String(originalPrice),
      currentPrice,
      quantityTotal,
      quantityAvailable: Math.max(0, listing.quantityAvailable + quantityDiff),
      closeAt: new Date(closeAt),
      decaySchedule: [],
    })
    .where(eq(listings.id, listingId));

  revalidatePath("/provider/dashboard");
  redirect("/provider/dashboard");
}

async function requireProvider(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Not authenticated" as const };
  const orgId = session.session.activeOrganizationId;
  if (!orgId) return { error: "No organization" as const };
  const provider = await db.query.providers.findFirst({ where: eq(providers.orgId, orgId) });
  if (!provider) return { error: "Provider not found" as const };
  const listingId = formData.get("listingId") as string;
  if (!listingId) return { error: "Missing listing id" as const };
  const listing = await db.query.listings.findFirst({ where: eq(listings.id, listingId) });
  if (!listing || listing.providerId !== provider.id) return { error: "Listing not found" as const };
  return { listing, listingId };
}

export async function closeListing(formData: FormData) {
  const r = await requireProvider(formData);
  if ("error" in r) return;
  await db.update(listings).set({ status: "closed" }).where(eq(listings.id, r.listingId));
  revalidatePath("/provider/dashboard");
  revalidatePath("/");
}

export async function reopenListing(formData: FormData) {
  const r = await requireProvider(formData);
  if ("error" in r) return;
  await db.update(listings).set({ status: "active" }).where(eq(listings.id, r.listingId));
  revalidatePath("/provider/dashboard");
  revalidatePath("/");
}

export async function deleteListing(formData: FormData) {
  const r = await requireProvider(formData);
  if ("error" in r) return;
  await db.delete(listings).where(eq(listings.id, r.listingId));
  revalidatePath("/provider/dashboard");
  revalidatePath("/");
}

export async function createListing(_prev: unknown, formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Not authenticated" };

  const orgId = session.session.activeOrganizationId;
  if (!orgId) return { error: "No organization" };

  const provider = await db.query.providers.findFirst({
    where: eq(providers.orgId, orgId),
  });
  if (!provider) return { error: "Provider not found" };

  const parsed = NewListingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { originalPrice, discountPct, quantityTotal, closeAt, ...rest } = parsed.data;

  const closeAtDate = new Date(closeAt);
  if (isNaN(closeAtDate.getTime()) || closeAtDate <= new Date()) {
    return { error: "Close time must be in the future" };
  }

  const currentPrice = (originalPrice * (1 - discountPct / 100)).toFixed(2);

  const [listing] = await db
    .insert(listings)
    .values({
      providerId: provider.id,
      originalPrice: String(originalPrice),
      currentPrice,
      quantityTotal,
      quantityAvailable: quantityTotal,
      closeAt: closeAtDate,
      decaySchedule: [],
      ...rest,
    })
    .returning();

  try {
    await inngest.send({ name: "listing/created", data: { listingId: listing.id } });
  } catch (e) {
    console.error("[inngest] send failed — is the dev server running?", e);
  }

  revalidatePath("/");
  revalidatePath("/provider/dashboard");
  redirect("/provider/dashboard");
}
