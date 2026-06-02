import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { todayKey } from "@/lib/format";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function getId(ctx: Ctx): Promise<number | null> {
  const { id } = await ctx.params;
  const n = Number(id);
  return Number.isInteger(n) ? n : null;
}

// GET /api/companies/[id]/purchases — list buy lots, newest trade first.
export async function GET(_req: Request, ctx: Ctx) {
  const id = await getId(ctx);
  if (id === null) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const purchases = await prisma.purchase.findMany({
    where: { companyId: id },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });
  return NextResponse.json(purchases);
}

// POST /api/companies/[id]/purchases — record a buy lot.
export async function POST(req: Request, ctx: Ctx) {
  const id = await getId(ctx);
  if (id === null) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const shares = Number(body.shares);
  const pricePerShare = Number(body.pricePerShare);
  if (!Number.isFinite(shares) || shares <= 0) {
    return NextResponse.json({ error: "Shares must be a positive number" }, { status: 400 });
  }
  if (!Number.isFinite(pricePerShare) || pricePerShare < 0) {
    return NextResponse.json({ error: "Price per share must be zero or positive" }, { status: 400 });
  }

  const date = String(body.date ?? "").trim() || todayKey();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Date must be in YYYY-MM-DD format" }, { status: 400 });
  }

  const purchase = await prisma.purchase.create({
    data: {
      companyId: id,
      date,
      shares,
      pricePerShare,
      note: body.note ? String(body.note).trim() : null,
    },
  });
  return NextResponse.json(purchase, { status: 201 });
}
