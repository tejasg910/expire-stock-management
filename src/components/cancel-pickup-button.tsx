"use client";

import { useActionState } from "react";
import { providerCancelReservation } from "@/app/actions/reservations";
import { Button } from "@/components/ui/button";

interface Props {
  reservationId: string;
}

export function CancelPickupButton({ reservationId }: Props) {
  const [state, action, pending] = useActionState(providerCancelReservation, null);

  if (state?.success) {
    return <span className="text-gray-400 text-sm">Cancelled</span>;
  }

  return (
    <form action={action}>
      <input type="hidden" name="reservationId" value={reservationId} />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
        disabled={pending}
        onClick={(e) => {
          if (!window.confirm("Cancel this pickup and release the stock?")) e.preventDefault();
        }}
      >
        {pending ? "…" : "Cancel"}
      </Button>
      {state?.error && <p className="text-xs text-red-500 mt-1">{state.error}</p>}
    </form>
  );
}
