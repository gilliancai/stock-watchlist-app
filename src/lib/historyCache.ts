import { prisma } from "./prisma";
import { fetchHistory, type HistoryPoint } from "./yahoo";

const FRESH_MS = 12 * 60 * 60 * 1000; // serve cached history for 12 hours

/**
 * Return ~12 months of daily closes for a symbol, refreshing from Yahoo only
 * when the cached row is older than FRESH_MS (or `force`). History moves at most
 * once per trading day, so caching it makes large watchlists load fast.
 */
export async function getHistory(symbol: string, force = false): Promise<HistoryPoint[]> {
  const sym = symbol.toUpperCase();

  if (!force) {
    const existing = await prisma.historyCache.findUnique({ where: { symbol: sym } });
    if (existing && Date.now() - existing.fetchedAt.getTime() < FRESH_MS) {
      try {
        return JSON.parse(existing.points) as HistoryPoint[];
      } catch {
        /* corrupt cache row — fall through and refetch */
      }
    }
  }

  const points = await fetchHistory(sym);
  // Don't cache transient empty results (e.g. a brief upstream hiccup).
  if (points.length > 0) {
    const json = JSON.stringify(points);
    await prisma.historyCache.upsert({
      where: { symbol: sym },
      create: { symbol: sym, points: json },
      update: { points: json, fetchedAt: new Date() },
    });
  }
  return points;
}
