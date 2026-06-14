import Link from "next/link";
import { Button } from "@/components/ui/button";
import { VerifyPickupForm } from "@/components/verify-pickup-form";
import { CancelPickupButton } from "@/components/cancel-pickup-button";
import { ListingActions } from "@/components/listing-actions";
import { LocalTime } from "@/components/local-time";
import { Package, Clock, TrendingUp, Plus } from "lucide-react";
import type { InferSelectModel } from "drizzle-orm";
import type { providers, listings, reservations } from "@/db/schema";

type Provider = InferSelectModel<typeof providers>;
type Listing = InferSelectModel<typeof listings>;
type Reservation = InferSelectModel<typeof reservations>;

interface HeldReservation {
  reservation: Reservation;
  listing: Listing;
  customerEmail: string | null;
  customerName: string | null;
}

interface Props {
  provider: Provider;
  listings: Listing[];
  reservations: HeldReservation[];
  completedReservations: { reservation: Reservation; listing: Listing }[];
  pickupsPagination?: React.ReactNode;
  listingsPagination?: React.ReactNode;
}

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  sold_out: "Sold out",
  expired: "Expired",
  closed: "Closed",
};

const STATUS_STYLE: Record<string, string> = {
  active: "bg-green-50 text-green-700 border border-green-200",
  sold_out: "bg-orange-50 text-orange-700 border border-orange-200",
  expired: "bg-gray-100 text-gray-500 border border-gray-200",
  closed: "bg-gray-100 text-gray-500 border border-gray-200",
};

export function ProviderDashboard({
  provider,
  listings,
  reservations,
  completedReservations,
  pickupsPagination,
  listingsPagination,
}: Props) {
  const activeListings = listings.filter((l) => l.status === "active");
  const heldReservations = reservations.filter((r) => r.reservation.status === "held");
  const completedCount = completedReservations.filter((r) => r.reservation.status === "picked_up").length;
  const totalSaved = completedReservations
    .filter((r) => r.reservation.status === "picked_up")
    .reduce((sum, { listing }) => sum + Number(listing.currentPrice), 0);

  return (
    <div className="space-y-8 py-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{provider.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {provider.category} · {provider.addressLine}
          </p>
        </div>
        <Link href="/provider/listings/new">
          <Button className="gap-2 shrink-0">
            <Plus size={15} />
            New listing
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <Package size={14} className="text-orange-400" />
            <span className="text-xs text-gray-500 font-medium">Active</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{activeListings.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">listings</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-blue-400" />
            <span className="text-xs text-gray-500 font-medium">Pending</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{heldReservations.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">pickups</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-green-400" />
            <span className="text-xs text-gray-500 font-medium">Earned</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">₹{totalSaved.toFixed(0)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{completedCount} pickups</p>
        </div>
      </div>

      {/* Incoming pickups */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Incoming pickups
        </h2>
        {heldReservations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-400">No pending pickups</p>
          </div>
        ) : (
          <div className="space-y-2">
            {heldReservations.map(({ reservation, listing, customerEmail, customerName }) => (
              <div
                key={reservation.id}
                className="bg-white rounded-2xl border border-orange-100 shadow-sm p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-semibold text-gray-900">{listing.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Qty {reservation.quantity}
                  </p>
                  {customerEmail && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {customerName ? `${customerName} · ` : ""}{customerEmail}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    Window expires <LocalTime date={reservation.holdExpiresAt} />
                  </p>
                </div>
                <div className="flex flex-col gap-2 items-end shrink-0">
                  <VerifyPickupForm reservationId={reservation.id} />
                  <CancelPickupButton reservationId={reservation.id} />
                </div>
              </div>
            ))}
          </div>
        )}
        {pickupsPagination}
      </section>

      {/* Listings */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Listings
        </h2>
        {listings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
            <div className="text-3xl mb-2">📦</div>
            <p className="font-medium text-gray-700">No listings yet</p>
            <p className="text-sm text-gray-400 mt-1">Create your first listing to start selling surplus food.</p>
            <Link href="/provider/listings/new" className="inline-block mt-4">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Plus size={13} />
                Create listing
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{listing.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    ₹{Number(listing.currentPrice).toFixed(0)} · {listing.quantityAvailable} of {listing.quantityTotal} left
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Closes <LocalTime date={listing.closeAt} />
                    {" · "}
                    <span className={`font-medium ${listing.status === "active" ? "text-green-600" : "text-gray-400"}`}>
                      {STATUS_LABEL[listing.status]}
                    </span>
                  </p>
                </div>
                <ListingActions listingId={listing.id} status={listing.status} />
              </div>
            ))}
          </div>
        )}
        {listingsPagination}
      </section>
    </div>
  );
}
