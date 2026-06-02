import { prisma } from "@/lib/prisma";
import Dashboard, { type CompanyDTO } from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const rows = await prisma.company.findMany({ orderBy: { createdAt: "desc" } });
  const companies: CompanyDTO[] = rows.map((c) => ({
    id: c.id,
    name: c.name,
    symbol: c.symbol,
    exchange: c.exchange,
    location: c.location,
    sector: c.sector,
    category: c.category,
    domain: c.domain,
    notes: c.notes,
  }));
  return <Dashboard initialCompanies={companies} />;
}
