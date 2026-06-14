import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { reservations, listings, providers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { MyPickupsList } from "@/components/my-pickups-list";

export default async function MyPickupsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const picks = await db
    .select({
      reservation: reservations,
      listing: listings,
      providerName: providers.name,
      providerAddress: providers.addressLine,
    })
    .from(reservations)
    .innerJoin(listings, eq(reservations.listingId, listings.id))
    .innerJoin(providers, eq(listings.providerId, providers.id))
    .where(eq(reservations.userId, session.user.id))
    .orderBy(reservations.createdAt);

  return <MyPickupsList pickups={picks} />;
}
