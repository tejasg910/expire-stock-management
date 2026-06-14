# Inngest Workflows — LastBite

> Place this at `docs/inngest-workflows.md`. It is the authoritative spec for every
> durable function. The whole point of the project lives here: the reservation lock,
> the auto-release, and the price decay. Treat these as contracts.

## Setup

- Client: `src/inngest/client.ts` → `export const inngest = new Inngest({ id: "lastbite" })`
- Serve route: `src/app/api/inngest/route.ts` → `serve({ client, functions: [...] })`
- Local dev: run `npx inngest-cli@latest dev` alongside `next dev`, and set
  `INNGEST_DEV=1` in `.env.local` so the app talks to the local Dev Server.

## Constants

```ts
// src/inngest/constants.ts
export const GLOBAL_MAX_PICKUP_MINUTES = 30; // hard cap, never exceeded
```

## Event catalogue

| Event | Emitted when | Consumed by |
|---|---|---|
| `listing/created` | a provider publishes a listing | `priceDecay`, `notifyNewDeal` |
| `reservation/created` | a customer claims a bag | `reservationHold` |
| `reservation/pickup-confirmed` | provider verifies the pickup code | `reservationHold` (via waitForEvent) |
| `reservation/cancelled` | customer cancels before the window ends | `reservationHold` (via waitForEvent) |

---

## 1. `reservationHold` — the lock (centerpiece)

**Trigger:** `reservation/created`
**Data:** `{ reservationId, listingId, userId, quantity, windowMinutes }`

What it guarantees:

1. The claim **atomically locks** stock — no overselling, even under concurrent claims.
2. The **cook is notified immediately** that the item got interest and will be picked up within the window.
3. The customer gets a pickup code and a live countdown.
4. If the window lapses **with no pickup confirmation, the lock auto-releases** and the stock returns to the pool. The window is the provider's setting, clamped to `GLOBAL_MAX_PICKUP_MINUTES`.

```ts
// src/inngest/functions/reservation-hold.ts
export const reservationHold = inngest.createFunction(
  { id: "reservation-hold", retries: 3 },
  { triggers: { event: "reservation/created" } },
  async ({ event, step }) => {
    const { reservationId, listingId, quantity, windowMinutes } = event.data;

    // 1) Lock stock atomically. The UPDATE ... WHERE quantity_available >= quantity
    //    guarantees we never oversell. Returns 0 rows if it couldn't lock.
    const locked = await step.run("lock-stock", async () => {
      const rows = await db
        .update(listings)
        .set({ quantityAvailable: sql`${listings.quantityAvailable} - ${quantity}` })
        .where(
          and(
            eq(listings.id, listingId),
            eq(listings.status, "active"),
            gte(listings.quantityAvailable, quantity)
          )
        )
        .returning({ id: listings.id });
      return rows.length > 0;
    });

    if (!locked) {
      await step.run("notify-soldout", () =>
        notifyCustomer(event.data.userId, "sold_out", { reservationId })
      );
      // expire the reservation row and stop
      await step.run("mark-expired", () =>
        db.update(reservations).set({ status: "expired" }).where(eq(reservations.id, reservationId))
      );
      return { outcome: "could_not_lock" };
    }

    // 2) Compute the clamped window + a pickup code, persist on the reservation.
    const minutes = Math.min(windowMinutes, GLOBAL_MAX_PICKUP_MINUTES);
    const pickupCode = await step.run("finalize-hold", async () => {
      const code = makePickupCode(); // e.g. 4-digit
      await db
        .update(reservations)
        .set({
          status: "held",
          pickupWindowMinutes: minutes,
          pickupCode: code,
          holdExpiresAt: new Date(Date.now() + minutes * 60_000),
        })
        .where(eq(reservations.id, reservationId));
      return code;
    });

    // 3) Notify the cook + the customer (each step retries independently).
    await step.run("notify-provider", () =>
      notifyProvider(listingId, "reservation_created", { reservationId, minutes, pickupCode })
    );
    await step.run("notify-customer", () =>
      notifyCustomer(event.data.userId, "reservation_created", { reservationId, minutes, pickupCode })
    );

    // 4) Wait for the pickup (or cancel) — or time out when the window lapses.
    const settled = await step.waitForEvent("await-pickup", {
      event: "reservation/pickup-confirmed",
      match: "data.reservationId",
      timeout: `${minutes}m`,
    });

    if (settled) {
      await step.run("complete", () =>
        db
          .update(reservations)
          .set({ status: "picked_up", completedAt: new Date() })
          .where(eq(reservations.id, reservationId))
      );
      return { outcome: "picked_up" };
    }

    // 5) Timed out → release the lock back to the pool, notify, re-offer.
    await step.run("release-stock", async () => {
      await db
        .update(listings)
        .set({ quantityAvailable: sql`${listings.quantityAvailable} + ${quantity}` })
        .where(eq(listings.id, listingId));
      await db
        .update(reservations)
        .set({ status: "expired" })
        .where(eq(reservations.id, reservationId));
    });
    await step.run("notify-expired", () =>
      notifyCustomer(event.data.userId, "hold_expired", { reservationId })
    );
    // Optional: tell followers the bag is available again
    await step.sendEvent("re-offer", {
      name: "listing/created",
      data: { listingId, reoffer: true },
    });

    return { outcome: "expired_released" };
  }
);
```

Notes:
- `step.waitForEvent` with a `timeout` is the single most important call — it's the
  durable "wait up to N minutes for a thing to happen, otherwise act" primitive.
  Building this by hand means cron sweeps + flaky timers; here it's one line.
- Cancellation: either listen for `reservation/cancelled` with a second `waitForEvent`
  using `Promise.race`, or fold it into the same event with a `reason` field. Keep it
  simple first — ship the timeout path, add cancel later.

---

## 2. `priceDecay` — automatic price drop over time

**Trigger:** `listing/created`
**Data:** `{ listingId }`

Walks the listing's `decaySchedule`, sleeping until each tier, then dropping the price.
At `closeAt`, marks the listing expired if stock remains. One run per listing; the sleeps
consume **no compute** and the whole lifecycle counts as a single execution.

```ts
// src/inngest/functions/price-decay.ts
export const priceDecay = inngest.createFunction(
  { id: "price-decay", retries: 2 },
  { triggers: { event: "listing/created" } },
  async ({ event, step }) => {
    const listing = await step.run("load", () =>
      db.query.listings.findFirst({ where: eq(listings.id, event.data.listingId) })
    );
    if (!listing) return { skipped: true };

    const start = listing.createdAt.getTime();

    for (const [i, tier] of listing.decaySchedule.entries()) {
      await step.sleepUntil(`tier-${i}`, new Date(start + tier.afterMinutes * 60_000));

      const stillActive = await step.run(`apply-tier-${i}`, async () => {
        const rows = await db
          .update(listings)
          .set({
            currentPrice: sql`round(${listing.originalPrice} * (1 - ${tier.discountPct} / 100.0), 2)`,
          })
          .where(and(eq(listings.id, listing.id), eq(listings.status, "active")))
          .returning({ id: listings.id });
        return rows.length > 0;
      });

      if (!stillActive) return { outcome: "ended_early" }; // sold out / closed
    }

    await step.sleepUntil("close", listing.closeAt);
    await step.run("expire-if-leftover", () =>
      db
        .update(listings)
        .set({ status: "expired" })
        .where(and(eq(listings.id, listing.id), eq(listings.status, "active")))
    );
    return { outcome: "closed" };
  }
);
```

---

## 3. `notifyNewDeal` — fan-out to followers

**Trigger:** `listing/created`
**Data:** `{ listingId, reoffer? }`

Notifies customers who follow the provider (and/or are within radius). For portfolio
scale a single looping step is fine; if the follower list ever gets large, switch to
sending one `notification/send` event per user so Inngest fans them out.

```ts
// src/inngest/functions/notify-new-deal.ts
export const notifyNewDeal = inngest.createFunction(
  { id: "notify-new-deal", retries: 2 },
  { triggers: { event: "listing/created" } },
  async ({ event, step }) => {
    const followers = await step.run("get-followers", () =>
      getFollowersForListing(event.data.listingId)
    );
    await step.run("notify-all", () =>
      Promise.all(followers.map((u) => notifyCustomer(u.userId, "new_deal", event.data)))
    );
    return { notified: followers.length };
  }
);
```

---

## Edge cases to keep in mind

- **Concurrent claims on the last bag:** handled by the conditional `UPDATE` in step 1 —
  only one claim wins the lock; the other gets `could_not_lock`.
- **Retries are idempotent:** every `step.run` is memoized by Inngest, so a retry of the
  function re-uses completed steps instead of re-locking stock.
- **Window cap:** always clamp to `GLOBAL_MAX_PICKUP_MINUTES`; never trust the client value.
- **Provider closes a listing mid-hold:** the held reservation still resolves on its own
  timer; closing only stops *new* claims.
