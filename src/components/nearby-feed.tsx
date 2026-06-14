"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ListingCard } from "@/components/listing-card";
import { MapPin, Sparkles } from "lucide-react";

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

interface Props {
  initialListings: Listing[];
}

export function NearbyFeed({ initialListings }: Props) {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
    });
  }, []);

  const { data: listings = initialListings } = useQuery<Listing[]>({
    queryKey: ["listings", "nearby", coords],
    queryFn: async () => {
      const params = coords ? `?lat=${coords.lat}&lon=${coords.lon}&radius=5` : "";
      const res = await fetch(`/api/listings/nearby${params}`);
      return res.json();
    },
    refetchInterval: 25_000,
    refetchOnWindowFocus: true,
    initialData: initialListings,
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
        {coords && (
          <span className="inline-flex items-center gap-1 mt-2 text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
            <MapPin size={10} />
            Showing deals near you
          </span>
        )}
      </div>

      {/* Listings */}
      {listings.length === 0 ? (
        <div className="py-20 text-center">
          <div className="text-4xl mb-3">🌙</div>
          <p className="font-medium text-gray-700">No deals right now</p>
          <p className="text-sm text-gray-400 mt-1">Check back closer to closing time</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-orange-400" />
            <span className="text-sm font-semibold text-gray-700">
              {listings.length} deal{listings.length !== 1 ? "s" : ""} available
            </span>
          </div>
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
