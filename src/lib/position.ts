import type { PositionDTO } from "./types";

// Aggregate buy lots into a single position and value it against the latest
// price. Pure function — shared between API responses and client components.
export function computePosition(
  lots: { shares: number; pricePerShare: number }[],
  currentPrice: number | null,
  currency: string | null
): PositionDTO {
  const shares = lots.reduce((s, l) => s + l.shares, 0);
  const costBasis = lots.reduce((s, l) => s + l.shares * l.pricePerShare, 0);
  const avgPrice = shares > 0 ? costBasis / shares : 0;
  const marketValue = currentPrice != null ? shares * currentPrice : null;
  const gain = marketValue != null ? marketValue - costBasis : null;
  const gainPercent = gain != null && costBasis > 0 ? (gain / costBasis) * 100 : null;
  return { shares, costBasis, avgPrice, currentPrice, marketValue, gain, gainPercent, currency };
}
