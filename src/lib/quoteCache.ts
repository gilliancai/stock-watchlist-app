import { prisma } from "./prisma";
import { fetchQuote, type NormalizedQuote } from "./yahoo";

const FRESH_MS = 2 * 60 * 1000; // serve cached quotes for 2 minutes

export type CachedQuote = NormalizedQuote & { fetchedAt: string; cached: boolean };

/**
 * Return a quote for a symbol, refreshing from Yahoo if the cached row is older
 * than FRESH_MS (or `force`). Upserts the snapshot into the Quote table.
 */
export async function getQuote(symbol: string, force = false): Promise<CachedQuote> {
  const sym = symbol.toUpperCase();
  const existing = await prisma.quote.findUnique({ where: { symbol: sym } });

  if (!force && existing && Date.now() - existing.fetchedAt.getTime() < FRESH_MS) {
    return {
      symbol: existing.symbol,
      name: null,
      price: existing.price,
      change: existing.change,
      changePercent: existing.changePercent,
      dayHigh: existing.dayHigh,
      dayLow: existing.dayLow,
      week52High: existing.week52High,
      week52Low: existing.week52Low,
      marketCap: existing.marketCap,
      currency: existing.currency,
      exchange: null,
      fetchedAt: existing.fetchedAt.toISOString(),
      cached: true,
    };
  }

  const fresh = await fetchQuote(sym);
  const saved = await prisma.quote.upsert({
    where: { symbol: sym },
    create: {
      symbol: sym,
      price: fresh.price,
      change: fresh.change,
      changePercent: fresh.changePercent,
      dayHigh: fresh.dayHigh,
      dayLow: fresh.dayLow,
      week52High: fresh.week52High,
      week52Low: fresh.week52Low,
      marketCap: fresh.marketCap,
      currency: fresh.currency,
    },
    update: {
      price: fresh.price,
      change: fresh.change,
      changePercent: fresh.changePercent,
      dayHigh: fresh.dayHigh,
      dayLow: fresh.dayLow,
      week52High: fresh.week52High,
      week52Low: fresh.week52Low,
      marketCap: fresh.marketCap,
      currency: fresh.currency,
      fetchedAt: new Date(),
    },
  });

  return { ...fresh, fetchedAt: saved.fetchedAt.toISOString(), cached: false };
}
