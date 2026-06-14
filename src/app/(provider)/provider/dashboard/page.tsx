import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { listings, providers, reservations } from "@/db/schema";
import { member } from "@/db/auth-schema";
import { eq, desc } from "drizzle-orm";
import { ProviderDashboard } from "@/components/provider-dashboard";
import { ProviderNav } from "@/components/provider-nav";

function ProviderNavServer() {
  return <ProviderNav />;
}

export default async function DashboardPage() {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  if (!session) redirect("/provider/login");

  let activeOrgId = session.session.activeOrganizationId;

  // Fresh login: activeOrganizationId is null. Auto-set from membership.
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

  const providerListings = await db.query.listings.findMany({
    where: eq(listings.providerId, provider.id),
    orderBy: [desc(listings.createdAt)],
  });

  const activeReservations = await db
    .select({ reservation: reservations, listing: listings })
    .from(reservations)
    .innerJoin(listings, eq(reservations.listingId, listings.id))
    .where(eq(listings.providerId, provider.id))
    .orderBy(desc(reservations.createdAt));

  return (
    <div className="min-h-screen bg-gray-50">
      <ProviderNavServer />
      <main className="max-w-5xl mx-auto px-6">
        <ProviderDashboard
          provider={provider}
          listings={providerListings}
          reservations={activeReservations}
        />
      </main>
    </div>
  );
}
