import { ProviderLoginForm } from "@/components/provider-login-form";

export default function ProviderLoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-3xl font-bold text-orange-500">LastBite</span>
          <p className="text-sm text-gray-400 mt-0.5 font-medium">Provider Portal</p>
          <h1 className="text-xl font-bold text-gray-900 mt-6">Welcome back</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to manage your listings</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <ProviderLoginForm />
        </div>
      </div>
    </div>
  );
}
