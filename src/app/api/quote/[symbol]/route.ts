import { NextResponse } from "next/server";
import { getQuote } from "@/lib/quoteCache";
import { getHistory } from "@/lib/historyCache";
import { getEarnings } from "@/lib/earningsCache";
import { getFundamentals } from "@/lib/fundamentalsCache";
import { getAnalyst } from "@/lib/analystCache";
import { fetchProfile } from "@/lib/yahoo";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ symbol: string }> };

// GET /api/quote/[symbol]?force=1&history=1&profile=1&earnings=1&fundamentals=1&analyst=1
export async function GET(req: Request, ctx: Ctx) {
  const { symbol } = await ctx.params;
  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";
  const wantHistory = url.searchParams.get("history") === "1";
  const wantProfile = url.searchParams.get("profile") === "1";
  const wantEarnings = url.searchParams.get("earnings") === "1";
  const wantFundamentals = url.searchParams.get("fundamentals") === "1";
  const wantAnalyst = url.searchParams.get("analyst") === "1";

  try {
    const [quote, history, profile, earnings, fundamentals, analyst] = await Promise.all([
      getQuote(symbol, force),
      wantHistory ? getHistory(symbol, force) : Promise.resolve(undefined),
      wantProfile ? fetchProfile(symbol) : Promise.resolve(undefined),
      wantEarnings ? getEarnings(symbol, force) : Promise.resolve(undefined),
      wantFundamentals ? getFundamentals(symbol, force) : Promise.resolve(undefined),
      wantAnalyst ? getAnalyst(symbol, force) : Promise.resolve(undefined),
    ]);
    return NextResponse.json({ quote, history, profile, earnings, fundamentals, analyst });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch quote";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
