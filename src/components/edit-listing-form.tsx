"use client";

import { useActionState, useState } from "react";
import { updateListing } from "@/app/actions/listings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimePicker } from "@/components/ui/time-picker";
import type { InferSelectModel } from "drizzle-orm";
import type { listings } from "@/db/schema";

type Listing = InferSelectModel<typeof listings>;

function toTimeString(d: Date | string) {
  const date = new Date(d);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function EditListingForm({ listing }: { listing: Listing }) {
  const [state, action, pending] = useActionState(updateListing, null);

  const [closeAtTime, setCloseAtTime] = useState(() => toTimeString(listing.closeAt));
  const [closeAtISO, setCloseAtISO] = useState(() => new Date(listing.closeAt).toISOString());

  const initDiscount = Math.round(
    (1 - Number(listing.currentPrice) / Number(listing.originalPrice)) * 100
  );
  const [originalPrice, setOriginalPrice] = useState(String(Number(listing.originalPrice)));
  const [discountPct, setDiscountPct] = useState(String(initDiscount || 30));

  function handleTimeChange(time: string) {
    if (!time) return;
    setCloseAtTime(time);
    const [hours, minutes] = time.split(":").map(Number);
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    setCloseAtISO(d.toISOString());
  }

  const discountedPrice = (() => {
    const p = parseFloat(originalPrice);
    const d = parseInt(discountPct);
    if (!p || isNaN(d)) return null;
    return Math.round(p * (1 - d / 100));
  })();

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="listingId" value={listing.id} />
      <input type="hidden" name="closeAt" value={closeAtISO} />

      <div className="space-y-1.5">
        <Label htmlFor="title">What are you selling?</Label>
        <Input id="title" name="title" defaultValue={listing.title} required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">
          Description{" "}
          <span className="text-gray-400 font-normal">(optional)</span>
        </Label>
        <Input
          id="description"
          name="description"
          defaultValue={listing.description ?? ""}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="originalPrice">Original price (₹)</Label>
          <Input
            id="originalPrice"
            name="originalPrice"
            type="number"
            min="1"
            step="0.01"
            value={originalPrice}
            onChange={(e) => setOriginalPrice(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="quantityTotal">Bags available</Label>
          <Input
            id="quantityTotal"
            name="quantityTotal"
            type="number"
            min="1"
            defaultValue={listing.quantityTotal}
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="discountPct">Discount</Label>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Input
              id="discountPct"
              name="discountPct"
              type="number"
              min="5"
              max="90"
              step="5"
              value={discountPct}
              onChange={(e) => setDiscountPct(e.target.value)}
              className="pr-8"
              required
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">%</span>
          </div>
          {discountedPrice !== null ? (
            <div className="flex items-baseline gap-1.5 shrink-0">
              <span className="text-lg font-bold text-orange-600">₹{discountedPrice}</span>
              <span className="text-xs text-gray-400">customer pays</span>
            </div>
          ) : (
            <span className="text-sm text-gray-300 shrink-0">₹— customer pays</span>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="closeAtTime">Available until</Label>
        <TimePicker
          id="closeAtTime"
          value={closeAtTime}
          onChange={handleTimeChange}
          required
        />
        <p className="text-xs text-gray-400">
          Customers can claim until this time today.
        </p>
      </div>

      {state?.error && (
        <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
          <p className="text-sm text-red-600">{state.error}</p>
        </div>
      )}

      <Button type="submit" className="w-full h-11" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
