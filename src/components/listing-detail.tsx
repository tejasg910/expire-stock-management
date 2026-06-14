"use client";

import { useQuery } from "@tanstack/react-query";
import { useActionState, useOptimistic, useState } from "react";
import { useRouter } from "next/navigation";
import { claimListing } from "@/app/actions/reservations";
import { followProvider } from "@/app/actions/follows";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Clock, Heart, Package, CheckCircle, Timer, Mail, ArrowLeft } from "lucide-react";
import { Countdown } from "@/components/countdown";
import type { InferSelectModel } from "drizzle-orm";
import type { listings, providers } from "@/db/schema";

type Listing = InferSelectModel<typeof listings>;
type Provider = InferSelectModel<typeof providers>;

interface Props {
  listing: Listing;
  provider: Provider;
  isFollowing?: boolean;
}

export function ListingDetail({ listing, provider, isFollowing = false }: Props) {
  const { data: live } = useQuery({
    queryKey: ["listing-status", listing.id],
    queryFn: async () => {
      const res = await fetch(`/api/listings/${listing.id}/status`);
      return res.json() as Promise<{ currentPrice: string; quantityAvailable: number; status: string }>;
    },
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
    initialData: {
      currentPrice: listing.currentPrice,
      quantityAvailable: listing.quantityAvailable,
      status: listing.status,
    },
  });

  const router = useRouter();
  const [optimisticFollowing, toggleFollowing] = useOptimistic(isFollowing, (_, next: boolean) => next);
  const [claimState, claimAction, claiming] = useActionState(claimListing, null);
  const [, followAction] = useActionState(followProvider, null);

  // Inline auth state
  const [authStep, setAuthStep] = useState<"idle" | "email" | "otp">("idle");
  const [authEmail, setAuthEmail] = useState("");
  const [authOtp, setAuthOtp] = useState("");
  const [authPending, setAuthPending] = useState(false);
  const [authError, setAuthError] = useState("");
  const [justAuthed, setJustAuthed] = useState(false);

  const needsAuth = claimState?.error === "auth_required" && !justAuthed;

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    setAuthPending(true);
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email: authEmail, type: "sign-in" });
    setAuthPending(false);
    if (error) { setAuthError(error.message ?? "Failed to send code"); return; }
    setAuthStep("otp");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    setAuthPending(true);
    const { error } = await authClient.signIn.emailOtp({ email: authEmail, otp: authOtp });
    setAuthPending(false);
    if (error) { setAuthError(error.message ?? "Invalid code"); return; }
    setJustAuthed(true);
    setAuthStep("idle");
    router.refresh();
  }

  const current = Number(live.currentPrice);
  const original = Number(listing.originalPrice);
  const discountPct = original > current ? Math.round(((original - current) / original) * 100) : 0;
  const closeAt = new Date(listing.closeAt);
  const minutesLeft = Math.max(0, Math.round((closeAt.getTime() - Date.now()) / 60_000));

  if (live.status !== "active") {
    return (
      <div className="py-20 text-center">
        <div className="text-5xl mb-4">{live.status === "sold_out" ? "😔" : "🌙"}</div>
        <p className="text-xl font-semibold text-gray-800">
          {live.status === "sold_out" ? "Sold out!" : "This listing has closed"}
        </p>
        <p className="text-gray-500 mt-1 text-sm">Check back for new deals soon.</p>
      </div>
    );
  }

  if (claimState?.success) {
    return (
      <div className="py-6 space-y-4">
        <div className="text-center py-6 space-y-3">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="text-green-600" size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">You&apos;re all set!</h2>
            <p className="text-gray-500 text-sm mt-1">Head to {provider.name} to pick up your order.</p>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6 text-center space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Your Pickup Code</p>
          <p className="text-5xl font-mono font-bold tracking-[0.25em] text-gray-900">
            {claimState.pickupCode}
          </p>
          <p className="text-sm text-gray-500">Show this to the provider on arrival</p>
        </div>

        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <Timer size={16} className="text-red-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-800">
              Pickup window: {claimState.windowMinutes} min
            </p>
            <Countdown target={claimState.holdExpiresAt!} className="text-xs font-semibold text-red-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-5">
      {listing.photoUrl ? (
        <img src={listing.photoUrl} alt={listing.title} className="w-full h-56 object-cover rounded-2xl" />
      ) : (
        <div className="w-full h-40 bg-orange-50 rounded-2xl flex items-center justify-center text-6xl">🍱</div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-1">
            {provider.name}
            {provider.category ? ` · ${provider.category}` : ""}
          </p>
          <h1 className="text-2xl font-bold text-gray-900 leading-snug">{listing.title}</h1>
        </div>
        <form action={async (fd) => { toggleFollowing(!optimisticFollowing); await followAction(fd); }}>
          <input type="hidden" name="providerId" value={provider.id} />
          <button
            type="submit"
            className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 hover:bg-red-50 flex items-center justify-center transition-colors"
            aria-label="Follow"
          >
            <Heart
              size={18}
              className={optimisticFollowing ? "fill-red-500 text-red-500" : "text-gray-400"}
            />
          </button>
        </form>
      </div>

      {listing.description && (
        <p className="text-gray-600 leading-relaxed">{listing.description}</p>
      )}

      {/* Price row */}
      <div className="flex items-center gap-3">
        <span className="text-3xl font-bold text-gray-900">₹{current.toFixed(0)}</span>
        {discountPct > 0 && (
          <>
            <span className="text-lg text-gray-400 line-through">₹{original.toFixed(0)}</span>
            <span className="bg-orange-100 text-orange-700 text-sm font-semibold px-2.5 py-0.5 rounded-full">
              {discountPct}% off
            </span>
          </>
        )}
      </div>

      {/* Info chips */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5 text-sm text-gray-600">
          <Package size={13} />
          {live.quantityAvailable} left
        </div>
        <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${minutesLeft < 30 ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-600"}`}>
          <Clock size={13} />
          Closes in {minutesLeft < 60 ? `${minutesLeft}m` : `${Math.round(minutesLeft / 60)}h`}
        </div>
        {provider.addressLine && (
          <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5 text-sm text-gray-600">
            <MapPin size={13} />
            {provider.addressLine}
          </div>
        )}
      </div>

      {/* Claim / inline auth */}
      <div className="pt-2">
        {needsAuth || authStep !== "idle" ? (
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-4">
            {authStep === "otp" ? (
              <form onSubmit={verifyOtp} className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <button type="button" onClick={() => { setAuthStep("email"); setAuthOtp(""); setAuthError(""); }}
                    className="text-gray-400 hover:text-gray-600">
                    <ArrowLeft size={15} />
                  </button>
                  <p className="text-sm font-medium text-gray-700">
                    Code sent to <span className="font-semibold">{authEmail}</span>
                  </p>
                </div>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  value={authOtp}
                  onChange={(e) => setAuthOtp(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-xl tracking-widest font-mono"
                  autoFocus
                  required
                />
                {authError && <p className="text-xs text-red-500">{authError}</p>}
                <Button type="submit" className="w-full h-11" disabled={authPending || authOtp.length < 6}>
                  {authPending ? "Verifying…" : "Verify & claim"}
                </Button>
              </form>
            ) : (
              <form onSubmit={sendOtp} className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Mail size={15} className="text-orange-500" />
                  <p className="text-sm font-medium text-gray-700">Enter your email to claim</p>
                </div>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  autoFocus
                  required
                />
                {authError && <p className="text-xs text-red-500">{authError}</p>}
                <Button type="submit" className="w-full h-11" disabled={authPending || !authEmail}
                  onClick={() => setAuthStep("email")}>
                  {authPending ? "Sending code…" : "Send code"}
                </Button>
              </form>
            )}
          </div>
        ) : (
          <>
            {claimState?.error && (
              <p className="text-sm text-red-500 mb-3 bg-red-50 px-3 py-2 rounded-lg">{claimState.error}</p>
            )}
            <form action={claimAction}>
              <input type="hidden" name="listingId" value={listing.id} />
              <input type="hidden" name="quantity" value="1" />
              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={claiming || live.quantityAvailable === 0}
              >
                {claiming
                  ? "Reserving…"
                  : live.quantityAvailable === 0
                  ? "Sold out"
                  : `Reserve for ₹${current.toFixed(0)}`}
              </Button>
            </form>
            <p className="text-xs text-center text-gray-400 mt-2">Reserve now · Pay at pickup · No card needed</p>
          </>
        )}
      </div>
    </div>
  );
}
