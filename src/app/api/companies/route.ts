import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchQuote, fetchProfile } from "@/lib/yahoo";
import { classifyCompany } from "@/lib/anthropic";
import { isValidCategory } from "@/lib/categories";
import { prettyExchange } from "@/lib/exchanges";
import { websiteToDomain } from "@/lib/format";

export const dynamic = "force-dynamic";

// GET /api/companies — list all watched companies (newest first).
export async function GET() {
  const companies = await prisma.company.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(companies);
}

// POST /api/companies — add a company. Validates the symbol against Yahoo first.
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const symbol = String(body.symbol ?? "").trim().toUpperCase();
  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
  }

  const existing = await prisma.company.findUnique({ where: { symbol } });
  if (existing) {
    return NextResponse.json(
      { error: `${symbol} is already on your watchlist` },
      { status: 409 }
    );
  }

  // Validate the symbol and backfill name/exchange when the user left them blank.
  let validated;
  try {
    validated = await fetchQuote(symbol);
  } catch {
    return NextResponse.json(
      { error: `Could not find a stock with symbol "${symbol}". Check the ticker.` },
      { status: 422 }
    );
  }

  const sector = body.sector ? String(body.sector).trim() : null;
  const name = String(body.name ?? "").trim() || validated.name || symbol;
  const exchange = String(body.exchange ?? "").trim() || prettyExchange(validated.exchange) || "—";

  // Fetch the company profile once: used to backfill the location (country) and,
  // when needed, to ground AI categorization. Best-effort.
  const profile = await fetchProfile(symbol).catch(() => null);

  // Category: honor an explicit valid choice, otherwise auto-classify via AI
  // (best-effort — falls back to null/uncategorized if no key or no fit).
  let category: string | null = null;
  const requested = body.category ? String(body.category).trim() : "";
  if (requested && isValidCategory(requested)) {
    category = requested;
  } else if (!requested) {
    category = await classifyCompany({ name, symbol, exchange, sector, profile });
  }

  const company = await prisma.company.create({
    data: {
      symbol,
      name,
      exchange,
      // Default location to the company's country when the caller didn't set one.
      location: String(body.location ?? "").trim() || profile?.country || "—",
      sector,
      category,
      domain: websiteToDomain(profile?.website ?? null),
      notes: body.notes ? String(body.notes).trim() : null,
    },
  });

  return NextResponse.json(company, { status: 201 });
}
