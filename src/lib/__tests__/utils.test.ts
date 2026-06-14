import { describe, it, expect } from "vitest";
import { clampPickupWindow, makePickupCode } from "../utils";

describe("clampPickupWindow", () => {
  it("uses the smallest of requested, provider max, and global max", () => {
    expect(clampPickupWindow(25, 30, 30)).toBe(25);
    expect(clampPickupWindow(40, 30, 30)).toBe(30); // clamped by global
    expect(clampPickupWindow(40, 20, 30)).toBe(20); // clamped by provider
    expect(clampPickupWindow(5, 30, 30)).toBe(5);   // requested is smallest
  });

  it("never exceeds GLOBAL_MAX_PICKUP_MINUTES (30)", () => {
    expect(clampPickupWindow(999, 999, 30)).toBe(30);
  });

  it("clamps to provider max even when global is larger", () => {
    expect(clampPickupWindow(50, 15, 30)).toBe(15);
  });
});

describe("makePickupCode", () => {
  it("returns a 4-digit string", () => {
    const code = makePickupCode();
    expect(code).toMatch(/^\d{4}$/);
  });

  it("returns values in [1000, 9999]", () => {
    for (let i = 0; i < 50; i++) {
      const n = Number(makePickupCode());
      expect(n).toBeGreaterThanOrEqual(1000);
      expect(n).toBeLessThanOrEqual(9999);
    }
  });
});
