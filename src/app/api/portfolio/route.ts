import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getQuote } from "@/lib/quoteCache";
import { computePosition } from "@/lib/position";
import type { PortfolioHoldingDTO, PortfolioTotalDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/portfolio — every company with purchases, valued against the latest
// (cached) quote, plus totals grouped by currency.
export async function GET() {
  const companies = await prisma.company.findMany({
    where: { purchases: { some: {} } },
    include: { purchases: true },
    orderBy: { createdAt: "desc" },
  });

  const holdings: PortfolioHoldingDTO[] = await Promise.all(
    companies.map(async (c) => {
      const quote = await getQuote(c.symbol).catch(() => null);
      const pos = computePosition(c.purchases, quote?.price ?? null, quote?.currency ?? null);
      const dates = c.purchases.map((p) => p.date).sort();
      return {
        companyId: c.id,
        name: c.name,
        symbol: c.symbol,
        exchange: c.exchange,
        ...pos,
        lotCount: c.purchases.length,
        firstBuyDate: dates[0] ?? null,
        lastBuyDate: dates[dates.length - 1] ?? null,
      };
    })
  );

  // Group totals by currency — summing across FX would be meaningless.
  const byCurrency = new Map<string, PortfolioTotalDTO>();
  for (const h of holdings) {
    if (h.marketValue == null || h.gain == null) continue;
    const cur = h.currency ?? "—";
    const t = byCurrency.get(cur) ?? { currency: cur, costBasis: 0, marketValue: 0, gain: 0, gainPercent: null };
    t.costBasis += h.costBasis;
    t.marketValue += h.marketValue;
    t.gain += h.gain;
    byCurrency.set(cur, t);
  }
  const totals = [...byCurrency.values()].map((t) => ({
    ...t,
    gainPercent: t.costBasis > 0 ? (t.gain / t.costBasis) * 100 : null,
  }));

  return NextResponse.json({ holdings, totals });
}
