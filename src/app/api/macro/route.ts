import { NextResponse } from "next/server";
import { getMacro } from "@/lib/macroCache";
import { hasFredKey } from "@/lib/fred";

export const dynamic = "force-dynamic";

// GET /api/macro?force=1 — current macro snapshot from FRED.
// Returns { configured: false } when no FRED_API_KEY is set.
export async function GET(req: Request) {
  if (!hasFredKey()) {
    return NextResponse.json({ configured: false, macro: null });
  }
  const force = new URL(req.url).searchParams.get("force") === "1";
  const macro = await getMacro(force);
  return NextResponse.json({ configured: true, macro });
}
