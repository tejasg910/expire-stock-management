import { NearbyFeed } from "@/components/nearby-feed";
import { db } from "@/db";
import { listings, providers } from "@/db/schema";
import { and, eq, gt, sql } from "drizzle-orm";

export const revalidate = 60;

export default async function HomePage() {
  const activeListings = await db
    .select({
      id: listings.id,
      title: listings.title,
      description: listings.description,
      photoUrl: listings.photoUrl,
      currentPrice: listings.currentPrice,
      originalPrice: listings.originalPrice,
      quantityAvailable: listings.quantityAvailable,
      closeAt: listings.closeAt,
      providerName: providers.name,
      providerCategory: providers.category,
      providerLat: providers.latitude,
      providerLon: providers.longitude,
      providerAddress: providers.addressLine,
    })
    .from(listings)
    .innerJoin(providers, eq(listings.providerId, providers.id))
    .where(and(eq(listings.status, "active"), gt(listings.closeAt, sql`now()`)));

  return (
    <NearbyFeed
      initialListings={activeListings.map((l) => ({
        ...l,
        closeAt: l.closeAt.toISOString(),
      }))}
    />
  );
}
