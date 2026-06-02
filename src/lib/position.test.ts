import { describe, it, expect } from "vitest";
import { computePosition } from "./position";

describe("computePosition", () => {
  it("aggregates a single lot and values it against the current price", () => {
    const p = computePosition([{ shares: 2, pricePerShare: 64.61 }], 64.7, "USD");
    expect(p.shares).toBe(2);
    expect(p.costBasis).toBeCloseTo(129.22, 6);
    expect(p.avgPrice).toBeCloseTo(64.61, 6);
    expect(p.marketValue).toBeCloseTo(129.4, 6);
    expect(p.gain).toBeCloseTo(0.18, 6);
    expect(p.gainPercent).toBeCloseTo(0.13929, 4);
    expect(p.currency).toBe("USD");
  });

  it("computes a share-weighted average cost across multiple lots", () => {
    const p = computePosition(
      [
        { shares: 3, pricePerShare: 120.5 },
        { shares: 2, pricePerShare: 135 },
      ],
      200,
      "USD"
    );
    expect(p.shares).toBe(5);
    expect(p.costBasis).toBeCloseTo(631.5, 6); // 3*120.5 + 2*135
    expect(p.avgPrice).toBeCloseTo(126.3, 6); // 631.5 / 5
    expect(p.marketValue).toBeCloseTo(1000, 6);
    expect(p.gain).toBeCloseTo(368.5, 6);
  });

  it("represents a loss with negative gain and percent", () => {
    const p = computePosition([{ shares: 10, pricePerShare: 100 }], 90, "USD");
    expect(p.gain).toBe(-100);
    expect(p.gainPercent).toBe(-10);
  });

  it("leaves market value / gain null when no live price is available", () => {
    const p = computePosition([{ shares: 1, pricePerShare: 50 }], null, null);
    expect(p.costBasis).toBe(50);
    expect(p.marketValue).toBeNull();
    expect(p.gain).toBeNull();
    expect(p.gainPercent).toBeNull();
  });

  it("handles an empty position without dividing by zero", () => {
    const p = computePosition([], 100, "USD");
    expect(p.shares).toBe(0);
    expect(p.costBasis).toBe(0);
    expect(p.avgPrice).toBe(0);
    expect(p.gainPercent).toBeNull(); // cost basis 0 → percent undefined → null
  });

  it("supports fractional shares", () => {
    const p = computePosition([{ shares: 0.5, pricePerShare: 100 }], 120, "USD");
    expect(p.costBasis).toBeCloseTo(50, 6);
    expect(p.marketValue).toBeCloseTo(60, 6);
    expect(p.gain).toBeCloseTo(10, 6);
    expect(p.gainPercent).toBeCloseTo(20, 6);
  });
});
