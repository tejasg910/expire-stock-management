import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NewListingForm } from "@/components/new-listing-form";
import { ProviderNav } from "@/components/provider-nav";

export default async function NewListingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/provider/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <ProviderNav />
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="mb-8">
          <span className="text-sm font-semibold uppercase tracking-widest text-orange-500">New listing</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">What&apos;s available today?</h1>
          <p className="text-sm text-gray-500 mt-1">Fill in the details and customers nearby will see it instantly.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <NewListingForm />
        </div>
      </div>
    </div>
  );
}
