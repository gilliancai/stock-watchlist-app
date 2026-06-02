import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CompanyDetail from "@/components/CompanyDetail";
import type { CompanyDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n)) notFound();

  const row = await prisma.company.findUnique({ where: { id: n } });
  if (!row) notFound();

  const company: CompanyDTO = {
    id: row.id,
    name: row.name,
    symbol: row.symbol,
    exchange: row.exchange,
    location: row.location,
    sector: row.sector,
    category: row.category,
    domain: row.domain,
    notes: row.notes,
  };

  return (
    <div className="space-y-5">
      <Link href="/" className="text-sm text-muted hover:text-accent transition">
        ← Back to watchlist
      </Link>
      <CompanyDetail company={company} />
    </div>
  );
}
