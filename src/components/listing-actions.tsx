"use client";

import { useTransition } from "react";
import { closeListing, reopenListing, deleteListing } from "@/app/actions/listings";
import { Button } from "@/components/ui/button";
import { Pencil, PowerOff, Power, Trash2 } from "lucide-react";
import Link from "next/link";

interface Props {
  listingId: string;
  status: string;
}

export function ListingActions({ listingId, status }: Props) {
  const [pending, startTransition] = useTransition();

  function action(fn: (fd: FormData) => Promise<void>) {
    const fd = new FormData();
    fd.set("listingId", listingId);
    startTransition(() => fn(fd));
  }

  function handleDelete() {
    if (!confirm("Delete this listing? This cannot be undone.")) return;
    action(deleteListing);
  }

  const isActive = status === "active";

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <Link href={`/provider/listings/${listingId}/edit`}>
        <Button size="sm" variant="outline" className="gap-1.5 h-8 px-2.5 text-xs">
          <Pencil size={11} />
          Edit
        </Button>
      </Link>

      {isActive ? (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 h-8 px-2.5 text-xs text-amber-600 border-amber-200 hover:bg-amber-50"
          disabled={pending}
          onClick={() => action(closeListing)}
        >
          <PowerOff size={11} />
          Close
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 h-8 px-2.5 text-xs text-green-600 border-green-200 hover:bg-green-50"
          disabled={pending}
          onClick={() => action(reopenListing)}
        >
          <Power size={11} />
          Reopen
        </Button>
      )}

      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 h-8 px-2.5 text-xs text-red-500 border-red-100 hover:bg-red-50"
        disabled={pending}
        onClick={handleDelete}
      >
        <Trash2 size={11} />
      </Button>
    </div>
  );
}
