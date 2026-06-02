// Finnhub analyst consensus. Optional — everything else works without
// FINNHUB_API_KEY. Get a free key at https://finnhub.io/register
// Note: the free tier centers on US tickers; many non-US symbols return no data.

const BASE = "https://finnhub.io/api/v1";

export type AnalystInfo = {
  strongBuy: number | null;
  buy: number | null;
  hold: number | null;
  sell: number | null;
  strongSell: number | null;
  period: string | null; // month the recommendation trend is from
  targetMean: number | null;
  targetHigh: number | null;
  targetLow: number | null;
};

export function hasFinnhubKey(): boolean {
  return Boolean(process.env.FINNHUB_API_KEY);
}

// Returns parsed JSON on 200, null on a definitive "no data" (403 premium gate
// or 404), and THROWS on transient failures (429 rate limit, 5xx, network) so
// the caller can avoid negative-caching a result it should retry later.
async function get<T>(path: string): Promise<T | null> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return null;
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE}${path}${sep}token=${key}`);
  if (res.status === 200) return (await res.json()) as T;
  if (res.status === 403 || res.status === 404) return null; // premium-gated / unknown symbol
  throw new Error(`Finnhub ${res.status}`); // 429 / 5xx — transient, let caller retry
}

type RecRow = {
  symbol: string;
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
};
type PriceTarget = { targetHigh?: number; targetLow?: number; targetMean?: number };

/**
 * Analyst consensus for a symbol.
 * - Returns AnalystInfo when Finnhub has coverage.
 * - Returns null when Finnhub responded cleanly but has no data (safe to cache).
 * - THROWS on a transient failure (rate limit / network) — do NOT cache; retry.
 */
export async function fetchAnalyst(symbol: string): Promise<AnalystInfo | null> {
  if (!hasFinnhubKey()) return null;

  const sym = symbol.toUpperCase();
  // Recommendation trend is the core (free-tier) signal — let its transient
  // errors propagate. Price target is premium-gated, so never block on it.
  const recs = await get<RecRow[]>(`/stock/recommendation?symbol=${encodeURIComponent(sym)}`);
  const target = await get<PriceTarget>(`/stock/price-target?symbol=${encodeURIComponent(sym)}`).catch(
    () => null
  );

  // Recommendation rows come newest-first; take the most recent.
  const latest = Array.isArray(recs) && recs.length ? recs[0] : null;
  const num = (v: number | undefined): number | null =>
    typeof v === "number" && Number.isFinite(v) && v !== 0 ? v : null;

  // Clean response but no coverage for this symbol — cacheable null.
  if (!latest && !target) return null;

  return {
    strongBuy: latest?.strongBuy ?? null,
    buy: latest?.buy ?? null,
    hold: latest?.hold ?? null,
    sell: latest?.sell ?? null,
    strongSell: latest?.strongSell ?? null,
    period: latest?.period ?? null,
    targetMean: num(target?.targetMean),
    targetHigh: num(target?.targetHigh),
    targetLow: num(target?.targetLow),
  };
}
