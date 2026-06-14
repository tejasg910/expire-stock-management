import Link from "next/link";
import { Clock, Package } from "lucide-react";

interface Props {
  listing: {
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
    providerAddress: string | null;
  };
}

export function ListingCard({ listing }: Props) {
  const current = Number(listing.currentPrice);
  const original = Number(listing.originalPrice);
  const discountPct = original > current ? Math.round(((original - current) / original) * 100) : 0;
  const closeAt = new Date(listing.closeAt);
  const minutesLeft = Math.max(0, Math.round((closeAt.getTime() - Date.now()) / 60_000));
  const urgency = minutesLeft < 30;

  return (
    <Link href={`/listings/${listing.id}`} className="block group">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200 overflow-hidden">
        <div className="flex gap-0">
          {/* Image / placeholder */}
          <div className="relative flex-shrink-0 w-28 h-28 sm:w-32 sm:h-32 bg-orange-50 flex items-center justify-center text-4xl">
            {listing.photoUrl ? (
              <img src={listing.photoUrl} alt={listing.title} className="w-full h-full object-cover" />
            ) : (
              <span>🍱</span>
            )}
            {discountPct > 0 && (
              <span className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-md">
                -{discountPct}%
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 p-4 flex flex-col justify-between">
            <div>
              <p className="text-xs text-orange-500 font-medium uppercase tracking-wide mb-0.5">
                {listing.providerName}
                {listing.providerCategory ? ` · ${listing.providerCategory}` : ""}
              </p>
              <h3 className="font-semibold text-gray-900 leading-snug group-hover:text-orange-600 transition-colors line-clamp-1">
                {listing.title}
              </h3>
              {listing.description && (
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{listing.description}</p>
              )}
            </div>

            <div className="flex items-end justify-between mt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-gray-900">₹{current.toFixed(0)}</span>
                {discountPct > 0 && (
                  <span className="text-sm text-gray-400 line-through">₹{original.toFixed(0)}</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-gray-400">
                  <Package size={11} />
                  {listing.quantityAvailable} left
                </span>
                <span className={`flex items-center gap-1 font-medium ${urgency ? "text-red-500" : "text-gray-400"}`}>
                  <Clock size={11} />
                  {minutesLeft < 60 ? `${minutesLeft}m` : `${Math.round(minutesLeft / 60)}h`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
