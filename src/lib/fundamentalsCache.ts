import { prisma } from "./prisma";
import { fetchFundamentals, type FundamentalsInfo } from "./yahoo";

const FRESH_MS = 24 * 60 * 60 * 1000; // fundamentals move slowly — refresh daily

/** Cached valuation/quality fundamentals for a symbol (24h TTL). */
export async function getFundamentals(symbol: string, force = false): Promise<FundamentalsInfo> {
  const sym = symbol.toUpperCase();

  if (!force) {
    const existing = await prisma.fundamentalsCache.findUnique({ where: { symbol: sym } });
    if (existing && Date.now() - existing.fetchedAt.getTime() < FRESH_MS) {
      try {
        return JSON.parse(existing.data) as FundamentalsInfo;
      } catch {
        /* corrupt row — fall through and refetch */
      }
    }
  }

  const info = await fetchFundamentals(sym);
  await prisma.fundamentalsCache.upsert({
    where: { symbol: sym },
    create: { symbol: sym, data: JSON.stringify(info) },
    update: { data: JSON.stringify(info), fetchedAt: new Date() },
  });
  return info;
}
