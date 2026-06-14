import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { listings, providers, reservations } from "@/db/schema";
import { user } from "@/db/auth-schema";
import { member } from "@/db/auth-schema";
import { eq, desc, count } from "drizzle-orm";
import { ProviderDashboard } from "@/components/provider-dashboard";
import { ProviderNav } from "@/components/provider-nav";
import { Pagination } from "@/components/ui/pagination";

const LISTINGS_PAGE_SIZE = 10;
const PICKUPS_PAGE_SIZE = 5;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pickupsPage?: string }>;
}) {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  if (!session) redirect("/provider/login");

  let activeOrgId = session.session.activeOrganizationId;

  if (!activeOrgId) {
    const membership = await db.query.member.findFirst({
      where: eq(member.userId, session.user.id),
    });
    if (membership) {
      await auth.api.setActiveOrganization({
        headers: hdrs,
        body: { organizationId: membership.organizationId },
      });
      activeOrgId = membership.organizationId;
    }
  }

  if (!activeOrgId) redirect("/provider/onboard");

  const provider = await db.query.providers.findFirst({
    where: eq(providers.orgId, activeOrgId),
  });

  if (!provider) redirect("/provider/onboard");

  const { page: pageParam, pickupsPage: pickupsPageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1") || 1);
  const pickupsPage = Math.max(1, parseInt(pickupsPageParam ?? "1") || 1);

  // Run in two batches to avoid exhausting Neon free-tier connection pool.
  const [providerListings, [{ totalListings }]] = await Promise.all([
    db.query.listings.findMany({
      where: eq(listings.providerId, provider.id),
      orderBy: [desc(listings.createdAt)],
      limit: LISTINGS_PAGE_SIZE,
      offset: (page - 1) * LISTINGS_PAGE_SIZE,
    }),
    db.select({ totalListings: count() })
      .from(listings)
      .where(eq(listings.providerId, provider.id)),
  ]);

  const [heldReservations, [{ totalPickups }], completedReservations] = await Promise.all([
    db
      .select({
        reservation: reservations,
        listing: listings,
        customerEmail: user.email,
        customerName: user.name,
      })
      .from(reservations)
      .innerJoin(listings, eq(reservations.listingId, listings.id))
      .innerJoin(user, eq(reservations.userId, user.id))
      .where(eq(listings.providerId, provider.id))
      .orderBy(desc(reservations.createdAt))
      .limit(PICKUPS_PAGE_SIZE)
      .offset((pickupsPage - 1) * PICKUPS_PAGE_SIZE),

    db
      .select({ totalPickups: count() })
      .from(reservations)
      .innerJoin(listings, eq(reservations.listingId, listings.id))
      .where(eq(listings.providerId, provider.id)),

    db
      .select({ reservation: reservations, listing: listings })
      .from(reservations)
      .innerJoin(listings, eq(reservations.listingId, listings.id))
      .where(eq(listings.providerId, provider.id)),
  ]);

  const listingsTotalPages = Math.ceil(totalListings / LISTINGS_PAGE_SIZE);
  const pickupsTotalPages = Math.ceil(totalPickups / PICKUPS_PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-50">
      <ProviderNav />
      <main className="max-w-5xl mx-auto px-6 pb-10">
        <ProviderDashboard
          provider={provider}
          listings={providerListings}
          reservations={heldReservations}
          completedReservations={completedReservations}
          pickupsPagination={
            <Pagination
              page={pickupsPage}
              totalPages={pickupsTotalPages}
              baseUrl="/provider/dashboard"
              paramName="pickupsPage"
            />
          }
          listingsPagination={
            <Pagination
              page={page}
              totalPages={listingsTotalPages}
              baseUrl="/provider/dashboard"
              paramName="page"
            />
          }
        />
      </main>
    </div>
  );
}
