// src/db/schema.ts
// Drizzle ORM schema for LastBite (working name) — a surplus-food rescue marketplace.
// Postgres (Neon). Better Auth manages the `user`, `session`, `account`, `organization`,
// and `member` tables via its Drizzle adapter — DO NOT hand-write those; generate them
// with the Better Auth CLI. The tables below are the APP domain that sits on top.

import {
  pgTable,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  uuid,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

// ---------- Enums ----------

export const listingStatus = pgEnum("listing_status", [
  "active", // live and claimable
  "sold_out", // quantity_available hit 0
  "expired", // passed close_at with stock left
  "closed", // provider manually closed
]);

export const reservationStatus = pgEnum("reservation_status", [
  "held", // locked, waiting for pickup within the window
  "picked_up", // completed
  "expired", // window lapsed without pickup -> stock released
  "cancelled", // customer cancelled before window end
]);

// ---------- Providers (the "cook" / hotel) ----------
// One row per business. `org_id` links to the Better Auth organization that owns it,
// so staff accounts (members of that org) all manage the same provider.

export const providers = pgTable(
  "providers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: text("org_id").notNull().unique(), // Better Auth organization id
    name: text("name").notNull(),
    description: text("description"),
    category: text("category"), // e.g. "bakery", "hotel", "cafe"
    photoUrl: text("photo_url"),
    addressLine: text("address_line"),
    latitude: numeric("latitude", { precision: 9, scale: 6 }).notNull(),
    longitude: numeric("longitude", { precision: 9, scale: 6 }).notNull(),
    // The provider's default pickup window in minutes, and their own cap.
    // The application clamps any window to GLOBAL_MAX_PICKUP_MINUTES (30).
    defaultPickupWindowMinutes: integer("default_pickup_window_minutes")
      .notNull()
      .default(15),
    maxPickupWindowMinutes: integer("max_pickup_window_minutes")
      .notNull()
      .default(30),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    geoIdx: index("providers_geo_idx").on(t.latitude, t.longitude),
  })
);

// ---------- Listings (a surprise bag / item batch) ----------

export const listings = pgTable(
  "listings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    photoUrl: text("photo_url"),
    originalPrice: numeric("original_price", { precision: 10, scale: 2 }).notNull(),
    currentPrice: numeric("current_price", { precision: 10, scale: 2 }).notNull(),
    quantityTotal: integer("quantity_total").notNull(),
    quantityAvailable: integer("quantity_available").notNull(),
    status: listingStatus("status").notNull().default("active"),
    // Decay schedule: an ordered list of price drops, evaluated by the Inngest
    // price-decay workflow. Times are minutes AFTER the listing was created, OR
    // an absolute ISO time — keep one convention; minutes-after is simplest.
    // e.g. [{ "afterMinutes": 60, "discountPct": 20 }, { "afterMinutes": 150, "discountPct": 40 }]
    decaySchedule: jsonb("decay_schedule")
      .$type<{ afterMinutes: number; discountPct: number }[]>()
      .notNull()
      .default([]),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    closeAt: timestamp("close_at").notNull(), // hard stop (e.g. closing time)
  },
  (t) => ({
    providerIdx: index("listings_provider_idx").on(t.providerId),
    statusIdx: index("listings_status_idx").on(t.status),
  })
);

// ---------- Reservations (the lock) ----------

export const reservations = pgTable(
  "reservations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(), // Better Auth user id (phone-verified customer)
    quantity: integer("quantity").notNull().default(1),
    status: reservationStatus("status").notNull().default("held"),
    pickupWindowMinutes: integer("pickup_window_minutes").notNull(),
    pickupCode: text("pickup_code").notNull(), // shown to customer, verified by provider
    holdExpiresAt: timestamp("hold_expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  (t) => ({
    listingIdx: index("reservations_listing_idx").on(t.listingId),
    userIdx: index("reservations_user_idx").on(t.userId),
    statusIdx: index("reservations_status_idx").on(t.status),
  })
);

// ---------- Follows (a customer "subscribes" to a provider for deal alerts) ----------

export const follows = pgTable(
  "follows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    uniqueFollow: index("follows_user_provider_idx").on(t.userId, t.providerId),
  })
);

// ---------- Notification log (optional but nice for the demo/audit) ----------

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id"), // recipient (customer or provider staff)
  channel: text("channel").notNull(), // "email" | "push" | "in_app"
  kind: text("kind").notNull(), // "reservation_created" | "hold_expiring" | "new_deal" ...
  payload: jsonb("payload"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});
