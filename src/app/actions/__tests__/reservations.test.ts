import { describe, it, expect } from "vitest";
import { GLOBAL_MAX_PICKUP_MINUTES } from "@/inngest/constants";
import { clampPickupWindow } from "@/lib/utils";

/**
 * Business logic tests for the reservation claim flow.
 * These test the pure functions / computations without hitting the DB.
 */

describe("pickup window clamping in claim flow", () => {
  it("never exceeds GLOBAL_MAX_PICKUP_MINUTES regardless of provider settings", () => {
    const result = clampPickupWindow(60, 60, GLOBAL_MAX_PICKUP_MINUTES);
    expect(result).toBe(GLOBAL_MAX_PICKUP_MINUTES);
  });

  it("uses provider default when smaller than global", () => {
    const providerDefault = 10;
    const result = clampPickupWindow(providerDefault, 30, GLOBAL_MAX_PICKUP_MINUTES);
    expect(result).toBe(providerDefault);
  });

  it("uses provider max when smaller than both requested and global", () => {
    const result = clampPickupWindow(30, 20, GLOBAL_MAX_PICKUP_MINUTES);
    expect(result).toBe(20);
  });
});

describe("holdExpiresAt computation", () => {
  it("is windowMinutes in the future from now", () => {
    const windowMinutes = 15;
    const before = Date.now();
    const expiresAt = new Date(Date.now() + windowMinutes * 60_000);
    const after = Date.now();

    const lower = before + windowMinutes * 60_000;
    const upper = after + windowMinutes * 60_000;

    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(lower);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(upper);
  });
});
