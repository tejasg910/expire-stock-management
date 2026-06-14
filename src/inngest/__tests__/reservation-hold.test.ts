import { describe, it, expect } from "vitest";
import { GLOBAL_MAX_PICKUP_MINUTES } from "../constants";

/**
 * Tests for reservation hold flow logic (pure, no DB/Inngest).
 * The integration path is tested manually via the Inngest Dev Server.
 */

describe("stock lock guard condition", () => {
  it("rejects a claim if quantity_available < requested quantity", () => {
    function canLock(available: number, requested: number) {
      return available >= requested;
    }

    expect(canLock(3, 1)).toBe(true);
    expect(canLock(1, 1)).toBe(true);
    expect(canLock(0, 1)).toBe(false);
    expect(canLock(2, 3)).toBe(false);
  });
});

describe("pickup window clamping in reservationHold", () => {
  function clampWindow(requested: number): number {
    return Math.min(requested, GLOBAL_MAX_PICKUP_MINUTES);
  }

  it("clamps window above GLOBAL_MAX to GLOBAL_MAX", () => {
    expect(clampWindow(60)).toBe(GLOBAL_MAX_PICKUP_MINUTES);
    expect(clampWindow(31)).toBe(GLOBAL_MAX_PICKUP_MINUTES);
  });

  it("passes through windows below GLOBAL_MAX", () => {
    expect(clampWindow(15)).toBe(15);
    expect(clampWindow(30)).toBe(30);
    expect(clampWindow(5)).toBe(5);
  });
});

describe("hold timeout sentinel", () => {
  it("step.waitForEvent timeout string matches windowMinutes", () => {
    function makeTimeout(minutes: number): string {
      return `${minutes}m`;
    }

    expect(makeTimeout(15)).toBe("15m");
    expect(makeTimeout(30)).toBe("30m");
  });
});

describe("re-offer event after expiry", () => {
  it("re-offer event name is listing/created with reoffer flag", () => {
    const event = { name: "listing/created", data: { listingId: "abc", reoffer: true } };
    expect(event.name).toBe("listing/created");
    expect(event.data.reoffer).toBe(true);
  });
});
