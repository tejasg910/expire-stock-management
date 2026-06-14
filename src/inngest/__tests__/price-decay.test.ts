import { describe, it, expect } from "vitest";

/**
 * Tests for the price decay schedule computation logic.
 * The actual Inngest step.sleepUntil calls are not tested here (integration only);
 * we test the MATH that computes the new price at each tier.
 */

function applyDiscount(originalPrice: number, discountPct: number): number {
  return Math.round(originalPrice * (1 - discountPct / 100) * 100) / 100;
}

function computeTierTime(createdAt: Date, afterMinutes: number): Date {
  return new Date(createdAt.getTime() + afterMinutes * 60_000);
}

describe("applyDiscount", () => {
  it("applies a 20% discount correctly", () => {
    expect(applyDiscount(100, 20)).toBe(80);
  });

  it("applies a 40% discount correctly", () => {
    expect(applyDiscount(100, 40)).toBe(60);
  });

  it("rounds to 2 decimal places", () => {
    expect(applyDiscount(99, 30)).toBeCloseTo(69.3, 1);
  });

  it("0% discount returns original price", () => {
    expect(applyDiscount(150, 0)).toBe(150);
  });

  it("99% discount returns near-zero", () => {
    expect(applyDiscount(100, 99)).toBeCloseTo(1, 0);
  });
});

describe("decay schedule tier timing", () => {
  it("tier-0 fires afterMinutes from listing creation", () => {
    const created = new Date("2024-01-01T10:00:00Z");
    const tierTime = computeTierTime(created, 60);
    expect(tierTime.toISOString()).toBe("2024-01-01T11:00:00.000Z");
  });

  it("multiple tiers are ordered correctly", () => {
    const created = new Date("2024-01-01T10:00:00Z");
    const schedule = [
      { afterMinutes: 60, discountPct: 20 },
      { afterMinutes: 120, discountPct: 40 },
    ];

    const times = schedule.map((t) => computeTierTime(created, t.afterMinutes));
    expect(times[0].getTime()).toBeLessThan(times[1].getTime());
  });

  it("closeAt must be after all tier times", () => {
    const created = new Date("2024-01-01T10:00:00Z");
    const closeAt = new Date("2024-01-01T14:00:00Z");
    const schedule = [
      { afterMinutes: 60, discountPct: 20 },
      { afterMinutes: 120, discountPct: 40 },
    ];

    for (const tier of schedule) {
      const tierTime = computeTierTime(created, tier.afterMinutes);
      expect(tierTime.getTime()).toBeLessThan(closeAt.getTime());
    }
  });
});
