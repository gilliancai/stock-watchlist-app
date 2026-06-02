import { prisma } from "./prisma";
import { fetchMacro, hasFredKey, type MacroInfo } from "./fred";

const FRESH_MS = 6 * 60 * 60 * 1000; // macro series update at most daily — 6h is plenty
const ROW_ID = 1; // single-row cache

/** Cached macro snapshot (6h TTL). Returns null when FRED_API_KEY is absent. */
export async function getMacro(force = false): Promise<MacroInfo | null> {
  if (!hasFredKey()) return null;

  if (!force) {
    const existing = await prisma.macroCache.findUnique({ where: { id: ROW_ID } });
    if (existing && Date.now() - existing.fetchedAt.getTime() < FRESH_MS) {
      try {
        return JSON.parse(existing.data) as MacroInfo;
      } catch {
        /* corrupt row — fall through and refetch */
      }
    }
  }

  const info = await fetchMacro();
  if (info) {
    await prisma.macroCache.upsert({
      where: { id: ROW_ID },
      create: { id: ROW_ID, data: JSON.stringify(info) },
      update: { data: JSON.stringify(info), fetchedAt: new Date() },
    });
  }
  return info;
}
