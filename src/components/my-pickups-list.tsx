"use client";

import { useActionState } from "react";
import { cancelReservation } from "@/app/actions/reservations";
import { Button } from "@/components/ui/button";
import { Countdown } from "@/components/countdown";
import { MapPin, CheckCircle, Clock, XCircle } from "lucide-react";
import type { InferSelectModel } from "drizzle-orm";
import type { reservations, listings } from "@/db/schema";

type Reservation = InferSelectModel<typeof reservations>;
type Listing = InferSelectModel<typeof listings>;

interface PickupItem {
  reservation: Reservation;
  listing: Listing;
  providerName: string;
  providerAddress: string | null;
}

export function MyPickupsList({ pickups }: { pickups: PickupItem[] }) {
  if (pickups.length === 0) {
    return (
      <div className="py-20 text-center">
        <div className="text-4xl mb-3">🛍️</div>
        <p className="font-medium text-gray-700">No pickups yet</p>
        <p className="text-sm text-gray-400 mt-1">Browse deals and claim one to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 py-6">
      <h1 className="text-xl font-bold text-gray-900">My Pickups</h1>
      {pickups.map(({ reservation, listing, providerName, providerAddress }) => (
        <PickupCard
          key={reservation.id}
          reservation={reservation}
          listing={listing}
          providerName={providerName}
          providerAddress={providerAddress}
        />
      ))}
    </div>
  );
}

const STATUS_META: Record<string, { icon: React.ReactNode; label: string; style: string }> = {
  held: {
    icon: <Clock size={12} />,
    label: "Awaiting pickup",
    style: "bg-orange-50 text-orange-700 border border-orange-200",
  },
  picked_up: {
    icon: <CheckCircle size={12} />,
    label: "Picked up",
    style: "bg-green-50 text-green-700 border border-green-200",
  },
  expired: {
    icon: <XCircle size={12} />,
    label: "Expired",
    style: "bg-gray-100 text-gray-500 border border-gray-200",
  },
  cancelled: {
    icon: <XCircle size={12} />,
    label: "Cancelled",
    style: "bg-gray-100 text-gray-500 border border-gray-200",
  },
};

function PickupCard({ reservation, listing, providerName, providerAddress }: {
  reservation: Reservation;
  listing: Listing;
  providerName: string;
  providerAddress: string | null;
}) {
  const [state, action, pending] = useActionState(cancelReservation, null);
  const meta = STATUS_META[reservation.status] ?? STATUS_META.expired;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{listing.title}</p>
          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
            {providerName}
          </p>
          {providerAddress && (
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <MapPin size={10} />
              {providerAddress}
            </p>
          )}
        </div>
        <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${meta.style}`}>
          {meta.icon}
          {meta.label}
        </span>
      </div>

      {reservation.status === "held" && (
        <div className="border-t border-gray-100">
          <div className="bg-orange-50 px-4 py-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-1">Pickup code</p>
            <p className="text-4xl font-mono font-bold tracking-[0.2em] text-gray-900">
              {reservation.pickupCode}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Window closes in{" "}
              <Countdown target={reservation.holdExpiresAt} className="font-semibold text-red-500" />
            </p>
          </div>
          <div className="px-4 py-3">
            <form action={action}>
              <input type="hidden" name="reservationId" value={reservation.id} />
              {state?.error && <p className="text-xs text-red-500 mb-2">{state.error}</p>}
              <Button type="submit" variant="outline" size="sm" disabled={pending} className="text-gray-500">
                {pending ? "Cancelling…" : "Cancel reservation"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
