import { describe, it, expect } from "vitest";
import { GLOBAL_MAX_PICKUP_MINUTES } from "../constants";

describe("GLOBAL_MAX_PICKUP_MINUTES", () => {
  it("is exactly 30", () => {
    expect(GLOBAL_MAX_PICKUP_MINUTES).toBe(30);
  });
});
