import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ProviderOnboardForm } from "@/components/provider-onboard-form";

export default async function OnboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/provider/login");

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8">
          <span className="text-sm font-semibold uppercase tracking-widest text-orange-500">Setup</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Tell us about your business</h1>
          <p className="text-sm text-gray-500 mt-1">This helps customers find you and pick up on time.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <ProviderOnboardForm />
        </div>
      </div>
    </div>
  );
}
