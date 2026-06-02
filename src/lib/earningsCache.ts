import { prisma } from "./prisma";
import { fetchEarnings, type EarningsInfo } from "./yahoo";

const FRESH_MS = 24 * 60 * 60 * 1000; // earnings dates move rarely — refresh daily

/** Next earnings date for a symbol, cached for 24h to avoid per-load refetches. */
export async function getEarnings(symbol: string, force = false): Promise<EarningsInfo> {
  const sym = symbol.toUpperCase();

  if (!force) {
    const existing = await prisma.earningsCache.findUnique({ where: { symbol: sym } });
    if (existing && Date.now() - existing.fetchedAt.getTime() < FRESH_MS) {
      return { date: existing.date, estimate: existing.estimate };
    }
  }

  const info = await fetchEarnings(sym);
  await prisma.earningsCache.upsert({
    where: { symbol: sym },
    create: { symbol: sym, date: info.date, estimate: info.estimate },
    update: { date: info.date, estimate: info.estimate, fetchedAt: new Date() },
  });
  return info;
}
