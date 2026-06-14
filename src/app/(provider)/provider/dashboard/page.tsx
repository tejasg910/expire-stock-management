import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { listings, providers, reservations } from "@/db/schema";
import { member } from "@/db/auth-schema";
import { eq, desc, count } from "drizzle-orm";
import { ProviderDashboard } from "@/components/provider-dashboard";
import { ProviderNav } from "@/components/provider-nav";
import { Pagination } from "@/components/ui/pagination";

const PAGE_SIZE = 10;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
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

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [providerListings, [{ total }], activeReservations] = await Promise.all([
    db.query.listings.findMany({
      where: eq(listings.providerId, provider.id),
      orderBy: [desc(listings.createdAt)],
      limit: PAGE_SIZE,
      offset,
    }),

    db
      .select({ total: count() })
      .from(listings)
      .where(eq(listings.providerId, provider.id)),

    db
      .select({ reservation: reservations, listing: listings })
      .from(reservations)
      .innerJoin(listings, eq(reservations.listingId, listings.id))
      .where(eq(listings.providerId, provider.id))
      .orderBy(desc(reservations.createdAt)),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-50">
      <ProviderNav />
      <main className="max-w-5xl mx-auto px-6 pb-10">
        <ProviderDashboard
          provider={provider}
          listings={providerListings}
          reservations={activeReservations}
        />
        <Pagination page={page} totalPages={totalPages} baseUrl="/provider/dashboard" />
      </main>
    </div>
  );
}
