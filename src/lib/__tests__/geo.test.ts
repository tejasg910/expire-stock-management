import { describe, it, expect } from "vitest";
import { haversineKm, isWithinRadius } from "../geo";

describe("haversineKm", () => {
  it("returns 0 for identical coordinates", () => {
    expect(haversineKm(12.9716, 77.5946, 12.9716, 77.5946)).toBe(0);
  });

  it("calculates known distance — Bangalore to Chennai ~290km", () => {
    const dist = haversineKm(12.9716, 77.5946, 13.0827, 80.2707);
    expect(dist).toBeGreaterThan(280);
    expect(dist).toBeLessThan(300);
  });

  it("is symmetric", () => {
    const a = haversineKm(12.9716, 77.5946, 13.0827, 80.2707);
    const b = haversineKm(13.0827, 80.2707, 12.9716, 77.5946);
    expect(Math.abs(a - b)).toBeLessThan(0.0001);
  });
});

describe("isWithinRadius", () => {
  it("returns true when provider is inside radius", () => {
    // Two points in Bengaluru ~2km apart
    expect(isWithinRadius(12.9716, 77.5946, 12.9852, 77.6049, 5)).toBe(true);
  });

  it("returns false when provider is outside radius", () => {
    // Bangalore to Chennai: ~290km
    expect(isWithinRadius(12.9716, 77.5946, 13.0827, 80.2707, 10)).toBe(false);
  });

  it("accepts a point exactly on the boundary edge", () => {
    // distance 0 <= any radiusKm
    expect(isWithinRadius(12.9716, 77.5946, 12.9716, 77.5946, 0)).toBe(true);
  });
});
