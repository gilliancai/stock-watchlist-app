import { describe, it, expect } from "vitest";
import { CATEGORIES, getCategory, isValidCategory, categoryOrder } from "./categories";

describe("categories", () => {
  it("defines the 15 value-chain layers with unique ids", () => {
    expect(CATEGORIES.length).toBe(15);
    expect(new Set(CATEGORIES.map((c) => c.id)).size).toBe(15);
  });

  it("looks up a category by id", () => {
    expect(getCategory("chip-designers")?.short).toBe("Chip designers");
    expect(getCategory("nope")).toBeUndefined();
    expect(getCategory(null)).toBeUndefined();
  });

  it("validates ids", () => {
    expect(isValidCategory("raw-materials")).toBe(true);
    expect(isValidCategory("xyz")).toBe(false);
  });

  it("orders layers top→bottom and sinks unknown/uncategorized to the end", () => {
    expect(categoryOrder("raw-materials")).toBe(0);
    expect(categoryOrder("raw-materials")).toBeLessThan(categoryOrder("energy"));
    expect(categoryOrder(null)).toBe(CATEGORIES.length);
    expect(categoryOrder("unknown")).toBe(CATEGORIES.length);
  });
});
