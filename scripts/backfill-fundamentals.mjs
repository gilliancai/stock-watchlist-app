// One-off: pre-warm FundamentalsCache for every watchlist company by hitting
// the quote API with ?fundamentals=1 (which caches the result server-side).
// Run with the dev server up.  BASE=http://localhost:3001 node scripts/backfill-fundamentals.mjs
const BASE = process.env.BASE || "http://localhost:3001";

const companies = await (await fetch(`${BASE}/api/companies`)).json();
let ok = 0,
  empty = 0,
  failed = 0,
  i = 0;

async function worker() {
  while (i < companies.length) {
    const c = companies[i++];
    try {
      const data = await (
        await fetch(`${BASE}/api/quote/${encodeURIComponent(c.symbol)}?fundamentals=1`)
      ).json();
      const f = data?.fundamentals;
      if (f && (f.trailingPE != null || f.forwardPE != null || f.profitMargins != null)) ok++;
      else empty++;
    } catch {
      failed++;
    }
  }
}

await Promise.all(Array.from({ length: 5 }, worker));
console.log(`fundamentals backfill — populated ${ok}, no-data ${empty}, failed ${failed} (of ${companies.length})`);
