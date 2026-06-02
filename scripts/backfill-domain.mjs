// One-off: set each company's `domain` (bare website domain) from the Yahoo
// profile, used to render company logos. Run with the dev server up.
// Override the port with BASE, e.g. BASE=http://localhost:3001 node scripts/backfill-domain.mjs
const BASE = process.env.BASE || "http://localhost:3001";

function websiteToDomain(website) {
  if (!website) return null;
  try {
    const url = website.includes("://") ? website : `https://${website}`;
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase() || null;
  } catch {
    return null;
  }
}

const companies = await (await fetch(`${BASE}/api/companies`)).json();
let updated = 0,
  unchanged = 0,
  missing = 0,
  failed = 0,
  i = 0;

async function worker() {
  while (i < companies.length) {
    const c = companies[i++];
    try {
      const data = await (await fetch(`${BASE}/api/quote/${encodeURIComponent(c.symbol)}?profile=1`)).json();
      const domain = websiteToDomain(data?.profile?.website);
      if (!domain) {
        missing++;
        continue;
      }
      if (domain === c.domain) {
        unchanged++;
        continue;
      }
      const res = await fetch(`${BASE}/api/companies/${c.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      if (res.ok) updated++;
      else failed++;
    } catch {
      failed++;
    }
  }
}

await Promise.all(Array.from({ length: 5 }, worker));
console.log(
  `domain backfill — updated ${updated}, unchanged ${unchanged}, no-website ${missing}, failed ${failed} (of ${companies.length})`
);
