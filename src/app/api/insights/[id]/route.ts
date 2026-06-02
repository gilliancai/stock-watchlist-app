import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getQuote } from "@/lib/quoteCache";
import { fetchProfile } from "@/lib/yahoo";
import { generateInsight, hasApiKey } from "@/lib/anthropic";
import { todayKey } from "@/lib/format";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function getId(ctx: Ctx): Promise<number | null> {
  const { id } = await ctx.params;
  const n = Number(id);
  return Number.isInteger(n) ? n : null;
}

// GET /api/insights/[id] — return today's cached insight, if any.
export async function GET(_req: Request, ctx: Ctx) {
  const id = await getId(ctx);
  if (id === null) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const insight = await prisma.insight.findUnique({
    where: { companyId_date: { companyId: id, date: todayKey() } },
  });
  return NextResponse.json({ insight, hasApiKey: hasApiKey() });
}

// POST /api/insights/[id] — generate today's insight (cached per day).
// Pass ?force=1 to regenerate even if one already exists for today.
export async function POST(req: Request, ctx: Ctx) {
  const id = await getId(ctx);
  if (id === null) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  if (!hasApiKey()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set. Add it to .env to enable AI insights." },
      { status: 503 }
    );
  }

  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const date = todayKey();
  const force = new URL(req.url).searchParams.get("force") === "1";

  if (!force) {
    const cached = await prisma.insight.findUnique({
      where: { companyId_date: { companyId: id, date } },
    });
    if (cached) return NextResponse.json({ insight: cached, cached: true });
  }

  // Gather context (don't fail the whole insight if market data is briefly down).
  const [quote, profile] = await Promise.all([
    getQuote(company.symbol).catch(() => null),
    fetchProfile(company.symbol).catch(() => null),
  ]);

  let content: string;
  try {
    content = await generateInsight({ company, quote, profile });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate insight";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const insight = await prisma.insight.upsert({
    where: { companyId_date: { companyId: id, date } },
    create: { companyId: id, date, content },
    update: { content, createdAt: new Date() },
  });

  return NextResponse.json({ insight, cached: false });
}
