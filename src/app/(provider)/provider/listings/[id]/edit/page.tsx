import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { listings, providers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { EditListingForm } from "@/components/edit-listing-form";
import { ProviderNav } from "@/components/provider-nav";

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/provider/login");

  const orgId = session.session.activeOrganizationId;
  if (!orgId) redirect("/provider/onboard");

  const { id } = await params;

  const provider = await db.query.providers.findFirst({ where: eq(providers.orgId, orgId) });
  if (!provider) redirect("/provider/onboard");

  const listing = await db.query.listings.findFirst({ where: eq(listings.id, id) });
  if (!listing || listing.providerId !== provider.id) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <ProviderNav />
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="mb-8">
          <span className="text-sm font-semibold uppercase tracking-widest text-orange-500">Edit listing</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{listing.title}</h1>
          <p className="text-sm text-gray-500 mt-1">Changes take effect immediately.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <EditListingForm listing={listing} />
        </div>
      </div>
    </div>
  );
}
