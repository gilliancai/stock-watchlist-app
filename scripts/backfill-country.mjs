// One-off: set each company's `location` to its country (from Yahoo profile,
// with an exchange-suffix fallback). Run with the dev server up.
const BASE = "http://localhost:3000";

// Fallback country by Yahoo symbol suffix when the profile lacks a country.
const SUFFIX_COUNTRY = {
  ".T": "Japan",
  ".TW": "Taiwan",
  ".TWO": "Taiwan",
  ".HK": "Hong Kong",
  ".KS": "South Korea",
  ".SZ": "China",
  ".SS": "China",
  ".DE": "Germany",
  ".F": "Germany",
  ".PA": "France",
  ".AS": "Netherlands",
  ".AX": "Australia",
  ".L": "United Kingdom",
  ".ST": "Sweden",
  ".MI": "Italy",
  ".SW": "Switzerland",
  ".SI": "Singapore",
  ".OL": "Norway",
  ".TO": "Canada",
};

function fallbackCountry(symbol) {
  const dot = symbol.lastIndexOf(".");
  if (dot === -1) return "United States"; // unsuffixed → US listing
  return SUFFIX_COUNTRY[symbol.slice(dot)] ?? null;
}

const companies = await (await fetch(`${BASE}/api/companies`)).json();
let updated = 0,
  unchanged = 0,
  failed = 0,
  i = 0;

async function worker() {
  while (i < companies.length) {
    const c = companies[i++];
    try {
      const data = await (await fetch(`${BASE}/api/quote/${encodeURIComponent(c.symbol)}?profile=1`)).json();
      const country = data?.profile?.country || fallbackCountry(c.symbol);
      if (!country) {
        failed++;
        continue;
      }
      if (country === c.location) {
        unchanged++;
        continue;
      }
      const res = await fetch(`${BASE}/api/companies/${c.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: country }),
      });
      if (res.ok) updated++;
      else failed++;
    } catch {
      failed++;
    }
  }
}

await Promise.all(Array.from({ length: 5 }, worker));
console.log(`country backfill — updated ${updated}, unchanged ${unchanged}, failed ${failed} (of ${companies.length})`);
