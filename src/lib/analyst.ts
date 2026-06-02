import type { AnalystDTO } from "./types";

export type Consensus = {
  total: number; // number of analysts
  score: number; // -2 (strong sell) … +2 (strong buy)
  label: "Strong Buy" | "Buy" | "Hold" | "Sell" | "Strong Sell";
  tone: "up" | "muted" | "down";
  buyShare: number; // fraction rated buy/strong-buy
};

/** Collapse an analyst recommendation trend into a single consensus rating. */
export function consensus(a: AnalystDTO | null | undefined): Consensus | null {
  if (!a) return null;
  const sb = a.strongBuy ?? 0;
  const b = a.buy ?? 0;
  const h = a.hold ?? 0;
  const s = a.sell ?? 0;
  const ss = a.strongSell ?? 0;
  const total = sb + b + h + s + ss;
  if (total === 0) return null;

  const score = (sb * 2 + b * 1 + s * -1 + ss * -2) / total;
  const label =
    score >= 1 ? "Strong Buy" : score >= 0.3 ? "Buy" : score > -0.3 ? "Hold" : score > -1 ? "Sell" : "Strong Sell";
  const tone = score >= 0.3 ? "up" : score > -0.3 ? "muted" : "down";
  return { total, score, label, tone, buyShare: (sb + b) / total };
}
