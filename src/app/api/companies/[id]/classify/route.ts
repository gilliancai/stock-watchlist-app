import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchProfile } from "@/lib/yahoo";
import { classifyCompany, hasApiKey } from "@/lib/anthropic";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/companies/[id]/classify — (re)classify a company into a value-chain
// layer using AI, and persist the result.
export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const n = Number(id);
  if (!Number.isInteger(n)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  if (!hasApiKey()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set. Add it to .env to enable AI categorization." },
      { status: 503 }
    );
  }

  const company = await prisma.company.findUnique({ where: { id: n } });
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const profile = await fetchProfile(company.symbol).catch(() => null);
  const category = await classifyCompany({
    name: company.name,
    symbol: company.symbol,
    exchange: company.exchange,
    sector: company.sector,
    profile,
  });

  const updated = await prisma.company.update({ where: { id: n }, data: { category } });
  return NextResponse.json(updated);
}
