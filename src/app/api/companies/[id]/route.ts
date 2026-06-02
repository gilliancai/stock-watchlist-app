import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidCategory } from "@/lib/categories";

export const dynamic = "force-dynamic";

// Normalize a category field from a request body to a stored value:
// undefined = leave unchanged, "" = clear, a valid id = set, invalid = ignore.
function parseCategory(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  const s = String(v).trim();
  if (!s) return null;
  return isValidCategory(s) ? s : undefined;
}

type Ctx = { params: Promise<{ id: string }> };

async function getId(ctx: Ctx): Promise<number | null> {
  const { id } = await ctx.params;
  const n = Number(id);
  return Number.isInteger(n) ? n : null;
}

// GET /api/companies/[id]
export async function GET(_req: Request, ctx: Ctx) {
  const id = await getId(ctx);
  if (id === null) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(company);
}

// PUT /api/companies/[id] — update editable fields.
export async function PUT(req: Request, ctx: Ctx) {
  const id = await getId(ctx);
  if (id === null) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const company = await prisma.company.update({
      where: { id },
      data: {
        name: body.name !== undefined ? String(body.name).trim() : undefined,
        exchange: body.exchange !== undefined ? String(body.exchange).trim() : undefined,
        location: body.location !== undefined ? String(body.location).trim() : undefined,
        sector: body.sector !== undefined ? (String(body.sector).trim() || null) : undefined,
        category: parseCategory(body.category),
        domain: body.domain !== undefined ? (String(body.domain).trim().toLowerCase() || null) : undefined,
        notes: body.notes !== undefined ? (String(body.notes).trim() || null) : undefined,
      },
    });
    return NextResponse.json(company);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

// DELETE /api/companies/[id]
export async function DELETE(_req: Request, ctx: Ctx) {
  const id = await getId(ctx);
  if (id === null) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  try {
    await prisma.company.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
