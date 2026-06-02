// One-off: normalize each company's `exchange` (the "Listed" column) to a clean,
// full exchange name. Run with the dev server up. Mirrors src/lib/exchanges.ts.
const BASE = "http://localhost:3000";

const NAMES = {
  nasdaqgs: "Nasdaq", nasdaqgm: "Nasdaq", nasdaqcm: "Nasdaq", nasdaq: "Nasdaq",
  nms: "Nasdaq", ngm: "Nasdaq", ncm: "Nasdaq",
  nyse: "New York Stock Exchange (NYSE)", nyq: "New York Stock Exchange (NYSE)",
  "nyse american": "NYSE American", ase: "NYSE American", "nyse arca": "NYSE Arca", pcx: "NYSE Arca",
  toronto: "Toronto Stock Exchange (TSX)", tor: "Toronto Stock Exchange (TSX)",
  hkse: "Hong Kong Stock Exchange (HKEX)", kse: "Korea Exchange (KRX)",
  tokyo: "Tokyo Stock Exchange (TSE)", jpx: "Tokyo Stock Exchange (TSE)",
  taiwan: "Taiwan Stock Exchange (TWSE)", "taipei exchange": "Taipei Exchange (TPEx)",
  shanghai: "Shanghai Stock Exchange (SSE)", shenzhen: "Shenzhen Stock Exchange (SZSE)",
  ses: "Singapore Exchange (SGX)", asx: "Australian Securities Exchange (ASX)",
  lse: "London Stock Exchange (LSE)",
  xetra: "Xetra (Frankfurt)", frankfurt: "Frankfurt Stock Exchange",
  amsterdam: "Euronext Amsterdam", paris: "Euronext Paris", milan: "Borsa Italiana (Milan)",
  stockholm: "Nasdaq Stockholm", swiss: "SIX Swiss Exchange", oslo: "Oslo Børs",
};
const pretty = (raw) => (raw ? NAMES[raw.trim().toLowerCase()] ?? raw.trim() : "—");

const companies = await (await fetch(`${BASE}/api/companies`)).json();
let updated = 0, unchanged = 0, failed = 0, i = 0;

async function worker() {
  while (i < companies.length) {
    const c = companies[i++];
    const next = pretty(c.exchange);
    if (next === c.exchange) { unchanged++; continue; }
    try {
      const res = await fetch(`${BASE}/api/companies/${c.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exchange: next }),
      });
      if (res.ok) updated++;
      else failed++;
    } catch { failed++; }
  }
}

await Promise.all(Array.from({ length: 6 }, worker));
console.log(`exchange backfill — updated ${updated}, unchanged ${unchanged}, failed ${failed} (of ${companies.length})`);
