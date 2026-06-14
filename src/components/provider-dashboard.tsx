import Link from "next/link";
import { Button } from "@/components/ui/button";
import { VerifyPickupForm } from "@/components/verify-pickup-form";
import { Package, Clock, TrendingUp, Plus } from "lucide-react";
import { ListingActions } from "@/components/listing-actions";
import type { InferSelectModel } from "drizzle-orm";
import type { providers, listings, reservations } from "@/db/schema";

type Provider = InferSelectModel<typeof providers>;
type Listing = InferSelectModel<typeof listings>;
type Reservation = InferSelectModel<typeof reservations>;

interface Props {
  provider: Provider;
  listings: Listing[];
  reservations: { reservation: Reservation; listing: Listing }[];
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

export function ProviderDashboard({ provider, listings, reservations }: Props) {
  const activeListings = listings.filter((l) => l.status === "active");
  const heldReservations = reservations.filter((r) => r.reservation.status === "held");
  const completedCount = reservations.filter((r) => r.reservation.status === "picked_up").length;
  const totalSaved = reservations
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

      {/* Pending pickups */}
      {heldReservations.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-3">
            Incoming pickups
          </h2>
          <div className="space-y-2">
            {heldReservations.map(({ reservation, listing }) => (
              <div
                key={reservation.id}
                className="bg-white rounded-2xl border border-orange-100 shadow-sm p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-semibold text-gray-900">{listing.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Qty {reservation.quantity}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Window expires {new Date(reservation.holdExpiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <VerifyPickupForm reservationId={reservation.id} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active listings */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Active listings
        </h2>
        {activeListings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
            <div className="text-3xl mb-2">📦</div>
            <p className="font-medium text-gray-700">No active listings</p>
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
            {activeListings.map((listing) => (
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
                    Closes {new Date(listing.closeAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[listing.status]}`}>
                    {STATUS_LABEL[listing.status]}
                  </span>
                  <ListingActions listingId={listing.id} status={listing.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Past listings */}
      {listings.filter((l) => l.status !== "active").length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-3">Past listings</h2>
          <div className="space-y-2">
            {listings.filter((l) => l.status !== "active").map((listing) => (
              <div
                key={listing.id}
                className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-medium text-gray-700">{listing.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {listing.quantityTotal - listing.quantityAvailable} of {listing.quantityTotal} sold ·{" "}
                    <span className={`font-semibold ${STATUS_STYLE[listing.status].includes("gray") ? "text-gray-500" : ""}`}>
                      {STATUS_LABEL[listing.status]}
                    </span>
                  </p>
                </div>
                <ListingActions listingId={listing.id} status={listing.status} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
