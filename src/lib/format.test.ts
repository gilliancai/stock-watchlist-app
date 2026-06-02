import { describe, it, expect } from "vitest";
import {
  formatMarketCap,
  formatPrice,
  formatSignedPrice,
  formatSignedPercent,
  netChangePercent,
} from "./format";

describe("formatMarketCap", () => {
  it("scales to T / B / M", () => {
    expect(formatMarketCap(4.58e12, "USD")).toBe("USD 4.58T");
    expect(formatMarketCap(5.11e9)).toBe("5.11B");
    expect(formatMarketCap(789e6)).toBe("789.00M");
  });
  it("returns a dash for null/undefined", () => {
    expect(formatMarketCap(null)).toBe("—");
    expect(formatMarketCap(undefined)).toBe("—");
  });
});

describe("formatPrice", () => {
  it("formats two decimals with currency", () => {
    expect(formatPrice(312.0599, "USD")).toBe("USD 312.06");
    expect(formatPrice(5341, "JPY")).toBe("JPY 5,341.00");
  });
  it("returns a dash for null", () => {
    expect(formatPrice(null)).toBe("—");
  });
});

describe("formatSignedPrice", () => {
  it("prefixes a plus for gains", () => {
    expect(formatSignedPrice(0.18, "USD")).toBe("+USD 0.18");
  });
  it("uses a minus sign and absolute value for losses", () => {
    expect(formatSignedPrice(-5, "USD")).toBe("−USD 5.00");
  });
});

describe("formatSignedPercent", () => {
  it("signs both directions", () => {
    expect(formatSignedPercent(1.4)).toBe("+1.40%");
    expect(formatSignedPercent(-0.3)).toBe("-0.30%");
    expect(formatSignedPercent(0)).toBe("+0.00%");
  });
});

describe("netChangePercent", () => {
  it("computes first→last change", () => {
    expect(netChangePercent([{ close: 100 }, { close: 150 }])).toBeCloseTo(50, 6);
    expect(netChangePercent([{ close: 200 }, { close: 150 }])).toBeCloseTo(-25, 6);
  });
  it("returns null with fewer than two points", () => {
    expect(netChangePercent([{ close: 100 }])).toBeNull();
    expect(netChangePercent([])).toBeNull();
  });
  it("returns null when the first close is zero", () => {
    expect(netChangePercent([{ close: 0 }, { close: 50 }])).toBeNull();
  });
});
