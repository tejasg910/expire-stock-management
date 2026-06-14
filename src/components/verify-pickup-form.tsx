"use client";

import { useActionState } from "react";
import { confirmPickup } from "@/app/actions/reservations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  reservationId: string;
}

export function VerifyPickupForm({ reservationId }: Props) {
  const [state, action, pending] = useActionState(confirmPickup, null);

  if (state?.success) {
    return <span className="text-green-600 font-medium text-sm">Picked up ✓</span>;
  }

  return (
    <form action={action} className="flex gap-2 items-center">
      <input type="hidden" name="reservationId" value={reservationId} />
      <Input name="code" placeholder="Code" maxLength={6} className="w-24 text-center" required />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "…" : "Verify"}
      </Button>
      {state?.error && <p className="text-xs text-red-500">{state.error}</p>}
    </form>
  );
}
