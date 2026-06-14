"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { Mail, ArrowLeft } from "lucide-react";

export function EmailOtpForm() {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
    setPending(false);
    if (error) { setError(error.message ?? "Failed to send code"); return; }
    setStep("otp");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    const { error } = await authClient.signIn.emailOtp({ email, otp });
    setPending(false);
    if (error) { setError(error.message ?? "Invalid code"); return; }
    router.push("/home");
  }

  if (step === "otp") {
    return (
      <form onSubmit={verifyOtp} className="space-y-4">
        <div className="text-center space-y-1 pb-2">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Mail size={20} className="text-orange-500" />
          </div>
          <p className="font-semibold text-gray-900">Check your email</p>
          <p className="text-sm text-gray-500">
            We sent a 6-digit code to <span className="font-medium text-gray-700">{email}</span>
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="otp">One-time code</Label>
          <Input
            id="otp"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            className="text-center text-xl tracking-widest font-mono"
            autoFocus
            required
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <Button type="submit" className="w-full h-11" disabled={pending || otp.length < 6}>
          {pending ? "Verifying…" : "Continue"}
        </Button>

        <button
          type="button"
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mx-auto transition-colors"
          onClick={() => { setStep("email"); setOtp(""); setError(""); }}
        >
          <ArrowLeft size={14} />
          Use a different email
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={sendOtp} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
          required
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <Button type="submit" className="w-full h-11" disabled={pending || !email}>
        {pending ? "Sending code…" : "Send code"}
      </Button>

      <p className="text-xs text-center text-gray-400">
        We&apos;ll email you a one-time code. No password needed.
      </p>
    </form>
  );
}
