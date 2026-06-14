"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export function ProviderLoginForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    if (mode === "login") {
      const { error } = await authClient.signIn.email({ email, password });
      if (error) { setError(error.message ?? "Login failed"); setPending(false); return; }
    } else {
      const { error } = await authClient.signUp.email({ email, password, name });
      if (error) { setError(error.message ?? "Registration failed"); setPending(false); return; }
    }
    router.push("/provider/dashboard");
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {mode === "register" && (
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ramesh Kumar"
            required
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@hotel.com"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <Button type="submit" className="w-full h-11" disabled={pending}>
        {pending ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
      </Button>

      <p className="text-center text-sm text-gray-500">
        {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
        <button
          type="button"
          className="text-orange-500 font-medium hover:underline"
          onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
        >
          {mode === "login" ? "Create one" : "Sign in"}
        </button>
      </p>
    </form>
  );
}
