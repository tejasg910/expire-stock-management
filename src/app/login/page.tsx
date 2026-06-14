import { EmailOtpForm } from "@/components/email-otp-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-3xl font-bold text-orange-500">LastBite</span>
          <p className="text-sm text-gray-400 mt-1">Great food. Less waste.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <EmailOtpForm />
        </div>
      </div>
    </div>
  );
}
