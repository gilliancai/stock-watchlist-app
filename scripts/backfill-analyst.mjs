// One-off: pre-warm AnalystCache for every watchlist company via the quote API
// with ?analyst=1.  Finnhub's free tier allows 60 calls/min and fetchAnalyst
// makes 2 calls per symbol, so we go sequentially with a delay (~52 calls/min).
// Run with the dev server up + FINNHUB_API_KEY set.
//   BASE=http://localhost:3001 node scripts/backfill-analyst.mjs
const BASE = process.env.BASE || "http://localhost:3001";
const DELAY_MS = Number(process.env.DELAY_MS || 2300); // per-symbol spacing

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const companies = await (await fetch(`${BASE}/api/companies`)).json();
let covered = 0,
  noCoverage = 0,
  failed = 0;

for (let i = 0; i < companies.length; i++) {
  const c = companies[i];
  try {
    const data = await (
      await fetch(`${BASE}/api/quote/${encodeURIComponent(c.symbol)}?analyst=1`)
    ).json();
    if (data?.analyst) covered++;
    else noCoverage++;
  } catch {
    failed++;
  }
  if ((i + 1) % 25 === 0) console.log(`  …${i + 1}/${companies.length} (covered ${covered})`);
  await sleep(DELAY_MS);
}

console.log(
  `analyst backfill — covered ${covered}, no-coverage ${noCoverage}, failed ${failed} (of ${companies.length})`
);
