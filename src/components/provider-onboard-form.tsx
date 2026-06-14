"use client";

import { useActionState, useState } from "react";
import { onboardProvider } from "@/app/actions/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Locate } from "lucide-react";

export function ProviderOnboardForm() {
  const [state, action, pending] = useActionState(onboardProvider, null);
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");

  function detectLocation() {
    setLocError("");
    if (!navigator.geolocation) { setLocError("Geolocation not supported"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLon(pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      (err) => {
        const msg =
          err.code === 1 ? "Permission denied — allow location in browser settings." :
          err.code === 2 ? "Location unavailable — check OS location services." :
          "Timed out. Try again or enter manually.";
        setLocError(msg);
        setLocating(false);
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }

  return (
    <form action={action} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="name">Business name</Label>
          <Input id="name" name="name" placeholder="Sharma Sweets & Bakery" required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="category">Category</Label>
          <Input id="category" name="category" placeholder="bakery / restaurant / hotel" required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="defaultPickupWindowMinutes">Pickup window (min)</Label>
          <Input
            id="defaultPickupWindowMinutes"
            name="defaultPickupWindowMinutes"
            type="number"
            min="5"
            max="30"
            defaultValue="15"
            required
          />
        </div>

        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="description">About (optional)</Label>
          <Input id="description" name="description" placeholder="South Indian home-style food since 1998" />
        </div>

        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="addressLine">Full address</Label>
          <Input id="addressLine" name="addressLine" placeholder="12 MG Road, Koramangala, Bangalore" required />
        </div>
      </div>

      {/* Location */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Coordinates</Label>
          <button
            type="button"
            onClick={detectLocation}
            disabled={locating}
            className="flex items-center gap-1.5 text-xs font-medium text-orange-500 hover:text-orange-600 disabled:opacity-50 transition-colors"
          >
            <Locate size={12} className={locating ? "animate-spin" : ""} />
            {locating ? "Detecting…" : "Auto-detect location"}
          </button>
        </div>

        {lat && lon && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2 text-xs text-green-700">
            <MapPin size={12} />
            <span className="font-mono">{lat}, {lon}</span>
          </div>
        )}
        {locError && (
          <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{locError}</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            name="latitude"
            type="number"
            step="any"
            placeholder="Latitude (e.g. 12.9716)"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            required
          />
          <Input
            name="longitude"
            type="number"
            step="any"
            placeholder="Longitude (e.g. 77.5946)"
            value={lon}
            onChange={(e) => setLon(e.target.value)}
            required
          />
        </div>
      </div>

      {state?.error && (
        <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
          <p className="text-sm text-red-600">{state.error}</p>
        </div>
      )}

      <Button type="submit" className="w-full h-11" disabled={pending}>
        {pending ? "Saving…" : "Set up my business"}
      </Button>
    </form>
  );
}
