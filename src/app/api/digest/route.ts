import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateDigest, hasApiKey, type DigestInput } from "@/lib/anthropic";
import { consensus } from "@/lib/analyst";
import { todayKey } from "@/lib/format";
import type { AnalystDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/digest — today's cached briefing, if any.
export async function GET() {
  const digest = await prisma.digest.findUnique({ where: { date: todayKey() } });
  return NextResponse.json({ digest, hasApiKey: hasApiKey() });
}

// Build the aggregate snapshot the model summarizes, from cached DB rows.
async function buildSnapshot(date: string): Promise<DigestInput> {
  const [companies, quotes, earnings, analysts] = await Promise.all([
    prisma.company.findMany(),
    prisma.quote.findMany(),
    prisma.earningsCache.findMany(),
    prisma.analystCache.findMany(),
  ]);

  const nameOf = new Map(companies.map((c) => [c.symbol.toUpperCase(), c.name]));
  const priced = quotes.filter((q) => typeof q.changePercent === "number");

  const up = priced.filter((q) => q.changePercent > 0).length;
  const down = priced.filter((q) => q.changePercent < 0).length;
  const avgChange = priced.length
    ? priced.reduce((s, q) => s + q.changePercent, 0) / priced.length
    : null;

  const sorted = [...priced].sort((a, b) => b.changePercent - a.changePercent);
  const toMover = (q: (typeof priced)[number]) => ({
    symbol: q.symbol,
    name: nameOf.get(q.symbol.toUpperCase()) ?? q.symbol,
    changePercent: q.changePercent,
  });
  const gainers = sorted.slice(0, 5).map(toMover);
  const losers = sorted.slice(-5).reverse().map(toMover);

  // Earnings within the next 7 days.
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const earningsThisWeek = earnings
    .filter((e) => e.date)
    .map((e) => ({ symbol: e.symbol, date: e.date as string, ts: new Date(`${e.date}T00:00:00`).getTime() }))
    .filter((e) => e.ts - now >= -24 * 60 * 60 * 1000 && e.ts - now <= weekMs)
    .sort((a, b) => a.ts - b.ts)
    .map((e) => ({ symbol: e.symbol, name: nameOf.get(e.symbol.toUpperCase()) ?? e.symbol, date: e.date }));

  // Analyst tilt across covered names.
  let analystCovered = 0;
  let analystBuyRated = 0;
  for (const row of analysts) {
    let data: AnalystDTO | null = null;
    try {
      data = JSON.parse(row.data) as AnalystDTO | null;
    } catch {
      continue;
    }
    const cons = consensus(data);
    if (!cons) continue;
    analystCovered++;
    if (cons.tone === "up") analystBuyRated++;
  }

  return {
    date,
    total: companies.length,
    priced: priced.length,
    up,
    down,
    avgChange,
    gainers,
    losers,
    earningsThisWeek,
    analystCovered,
    analystBuyRated,
  };
}

// POST /api/digest — generate today's briefing (cached per day). ?force=1 to regenerate.
export async function POST(req: Request) {
  if (!hasApiKey()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set. Add it to .env to enable the AI digest." },
      { status: 503 }
    );
  }

  const date = todayKey();
  const force = new URL(req.url).searchParams.get("force") === "1";

  if (!force) {
    const cached = await prisma.digest.findUnique({ where: { date } });
    if (cached) return NextResponse.json({ digest: cached, cached: true });
  }

  const snapshot = await buildSnapshot(date);
  let content: string;
  try {
    content = await generateDigest(snapshot);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate digest";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const digest = await prisma.digest.upsert({
    where: { date },
    create: { date, content },
    update: { content, createdAt: new Date() },
  });
  return NextResponse.json({ digest });
}
