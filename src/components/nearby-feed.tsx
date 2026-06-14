"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ListingCard } from "@/components/listing-card";
import { MapPin, Sparkles, LocateFixed, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Listing {
  id: string;
  title: string;
  description: string | null;
  photoUrl: string | null;
  currentPrice: string;
  originalPrice: string;
  quantityAvailable: number;
  closeAt: string;
  providerName: string;
  providerCategory: string | null;
  providerLat: string;
  providerLon: string;
  providerAddress: string | null;
}

type GeoState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "granted"; lat: number; lon: number }
  | { status: "denied"; reason: string };

const RADIUS_KM = 10;

export function NearbyFeed() {
  const [geo, setGeo] = useState<GeoState>({ status: "idle" });

  function requestLocation() {
    setGeo({ status: "requesting" });
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeo({ status: "granted", lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => {
        const reason =
          err.code === 1
            ? "Location permission denied. Enable it in your browser settings and refresh."
            : err.code === 2
            ? "Location unavailable. Check your device settings."
            : "Location request timed out. Try again.";
        setGeo({ status: "denied", reason });
      },
      { timeout: 10_000, maximumAge: 60_000 }
    );
  }

  // Auto-request on mount
  useEffect(() => { requestLocation(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const coords = geo.status === "granted" ? { lat: geo.lat, lon: geo.lon } : null;

  const { data: listings = [], isFetching } = useQuery<Listing[]>({
    queryKey: ["listings", "nearby", coords],
    queryFn: async () => {
      if (!coords) return [];
      const res = await fetch(
        `/api/listings/nearby?lat=${coords.lat}&lon=${coords.lon}&radius=${RADIUS_KM}`
      );
      return res.json();
    },
    enabled: geo.status === "granted",
    refetchInterval: 25_000,
    refetchOnWindowFocus: true,
  });

  return (
    <div className="py-6 space-y-6">
      {/* Hero */}
      <div className="py-4">
        <h1 className="text-2xl font-bold text-gray-900">
          Great food,{" "}
          <span className="text-orange-500">less waste.</span>
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Claim surplus food from local restaurants before it&apos;s thrown away.
        </p>
        {geo.status === "granted" && (
          <span className="inline-flex items-center gap-1 mt-2 text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
            <MapPin size={10} />
            Deals within {RADIUS_KM} km of you
          </span>
        )}
      </div>

      {/* Location gate */}
      {(geo.status === "idle" || geo.status === "requesting") && (
        <div className="py-16 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 bg-orange-50 rounded-full flex items-center justify-center">
            <LocateFixed size={24} className="text-orange-500 animate-pulse" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">Finding deals near you…</p>
            <p className="text-sm text-gray-400 mt-1">Allow location access when prompted.</p>
          </div>
        </div>
      )}

      {geo.status === "denied" && (
        <div className="py-12 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center">
            <AlertCircle size={24} className="text-red-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">Location required</p>
            <p className="text-sm text-gray-500 mt-1 max-w-xs">{geo.reason}</p>
          </div>
          <Button variant="outline" size="sm" onClick={requestLocation} className="gap-2">
            <LocateFixed size={14} />
            Try again
          </Button>
        </div>
      )}

      {/* Listings */}
      {geo.status === "granted" && (
        isFetching && listings.length === 0 ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 h-28 animate-pulse" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-4xl mb-3">🌙</div>
            <p className="font-medium text-gray-700">No deals within {RADIUS_KM} km</p>
            <p className="text-sm text-gray-400 mt-1">Check back closer to closing time.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-orange-400" />
              <span className="text-sm font-semibold text-gray-700">
                {listings.length} deal{listings.length !== 1 ? "s" : ""} nearby
              </span>
            </div>
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
