import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { reservations, listings, providers } from "@/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { MyPickupsList } from "@/components/my-pickups-list";
import { Pagination } from "@/components/ui/pagination";

const PAGE_SIZE = 10;

export default async function MyPickupsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [picks, [{ total }]] = await Promise.all([
    db
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
      .orderBy(desc(reservations.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),

    db
      .select({ total: count() })
      .from(reservations)
      .where(eq(reservations.userId, session.user.id)),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <MyPickupsList pickups={picks} />
      <Pagination page={page} totalPages={totalPages} baseUrl="/my-pickups" />
    </div>
  );
}
