import { prisma } from "./prisma";
import { fetchAnalyst, hasFinnhubKey, type AnalystInfo } from "./finnhub";

const FRESH_MS = 12 * 60 * 60 * 1000; // analyst trends update slowly — 12h TTL

/** Cached analyst consensus for a symbol. Returns null when no key is set. */
export async function getAnalyst(symbol: string, force = false): Promise<AnalystInfo | null> {
  if (!hasFinnhubKey()) return null;
  const sym = symbol.toUpperCase();

  if (!force) {
    const existing = await prisma.analystCache.findUnique({ where: { symbol: sym } });
    if (existing && Date.now() - existing.fetchedAt.getTime() < FRESH_MS) {
      try {
        // Stored "null" = a cached "no coverage" verdict; return it without refetching.
        return JSON.parse(existing.data) as AnalystInfo | null;
      } catch {
        /* corrupt row — fall through and refetch */
      }
    }
  }

  // fetchAnalyst throws only on transient failures (rate limit / network); in that
  // case don't cache — leave any prior row so we retry next time.
  let info: AnalystInfo | null;
  try {
    info = await fetchAnalyst(sym);
  } catch {
    const existing = await prisma.analystCache.findUnique({ where: { symbol: sym } });
    return existing ? (JSON.parse(existing.data) as AnalystInfo | null) : null;
  }

  // Cache both hits and definitive "no coverage" (null) so unsupported symbols
  // aren't re-fetched on every dashboard load.
  await prisma.analystCache.upsert({
    where: { symbol: sym },
    create: { symbol: sym, data: JSON.stringify(info) },
    update: { data: JSON.stringify(info), fetchedAt: new Date() },
  });
  return info;
}
