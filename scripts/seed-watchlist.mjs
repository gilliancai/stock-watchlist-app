// One-off bulk loader: adds a categorized watchlist via the running app's API.
// Skips private/delisted names; reports added / existing / failed per ticker.
const BASE = "http://localhost:3000";

// [yahooSymbol, displayName, categoryId]
const COMPANIES = [
  // raw-materials
  ["4063.T", "Shin-Etsu Chemical", "raw-materials"],
  ["3436.T", "SUMCO", "raw-materials"],
  ["WAF.DE", "Siltronic", "raw-materials"],
  ["6488.TWO", "GlobalWafers", "raw-materials"],
  ["4186.T", "Tokyo Ohka Kogyo", "raw-materials"],
  ["2802.T", "Ajinomoto", "raw-materials"],
  ["SOI.PA", "Soitec", "raw-materials"],
  ["MP", "MP Materials", "raw-materials"],
  ["LYC.AX", "Lynas Rare Earths", "raw-materials"],
  ["USAR", "USA Rare Earth", "raw-materials"],
  ["LIN", "Linde", "raw-materials"],
  ["AI.PA", "Air Liquide", "raw-materials"],
  ["APD", "Air Products", "raw-materials"],
  // semi-equipment
  ["ASML", "ASML", "semi-equipment"],
  ["AMAT", "Applied Materials", "semi-equipment"],
  ["LRCX", "Lam Research", "semi-equipment"],
  ["KLAC", "KLA", "semi-equipment"],
  ["8035.T", "Tokyo Electron", "semi-equipment"],
  ["ASM.AS", "ASM International", "semi-equipment"],
  ["6857.T", "Advantest", "semi-equipment"],
  ["TER", "Teradyne", "semi-equipment"],
  ["BESI.AS", "BESI", "semi-equipment"],
  ["6146.T", "Disco Corp", "semi-equipment"],
  ["7735.T", "Screen Holdings", "semi-equipment"],
  ["ONTO", "Onto Innovation", "semi-equipment"],
  ["CAMT", "Camtek", "semi-equipment"],
  ["NVMI", "Nova", "semi-equipment"],
  ["ENTG", "Entegris", "semi-equipment"],
  ["6525.T", "Kokusai Electric", "semi-equipment"],
  ["MKSI", "MKS Instruments", "semi-equipment"],
  ["ACLS", "Axcelis", "semi-equipment"],
  // chip-designers
  ["NVDA", "NVIDIA", "chip-designers"],
  ["AMD", "AMD", "chip-designers"],
  ["INTC", "Intel", "chip-designers"],
  ["AVGO", "Broadcom", "chip-designers"],
  ["MRVL", "Marvell", "chip-designers"],
  ["QCOM", "Qualcomm", "chip-designers"],
  ["ARM", "Arm Holdings", "chip-designers"],
  ["2454.TW", "MediaTek", "chip-designers"],
  ["3661.TW", "Alchip Technologies", "chip-designers"],
  ["6526.T", "Socionext", "chip-designers"],
  ["CBRS", "Cerebras Systems", "chip-designers"],
  // foundries-memory
  ["TSM", "TSMC", "foundries-memory"],
  ["005930.KS", "Samsung Electronics", "foundries-memory"],
  ["000660.KS", "SK Hynix", "foundries-memory"],
  ["MU", "Micron", "foundries-memory"],
  ["GFS", "GlobalFoundries", "foundries-memory"],
  ["UMC", "UMC", "foundries-memory"],
  ["0981.HK", "SMIC", "foundries-memory"],
  ["1347.HK", "Hua Hong", "foundries-memory"],
  ["TSEM", "Tower Semiconductor", "foundries-memory"],
  ["285A.T", "Kioxia", "foundries-memory"],
  // ai-hardware-oem
  ["SMCI", "Super Micro", "ai-hardware-oem"],
  ["DELL", "Dell Technologies", "ai-hardware-oem"],
  ["HPE", "HPE", "ai-hardware-oem"],
  ["0992.HK", "Lenovo", "ai-hardware-oem"],
  ["2317.TW", "Foxconn / Hon Hai", "ai-hardware-oem"],
  ["6669.TW", "Wiwynn", "ai-hardware-oem"],
  ["2382.TW", "Quanta Computer", "ai-hardware-oem"],
  ["3231.TW", "Wistron", "ai-hardware-oem"],
  ["2356.TW", "Inventec", "ai-hardware-oem"],
  ["2376.TW", "Giga-Byte", "ai-hardware-oem"],
  ["IBM", "IBM", "ai-hardware-oem"],
  // networking
  ["ANET", "Arista Networks", "networking"],
  ["CSCO", "Cisco Systems", "networking"],
  ["CIEN", "Ciena", "networking"],
  ["COHR", "Coherent", "networking"],
  ["LITE", "Lumentum", "networking"],
  ["FN", "Fabrinet", "networking"],
  ["CLS", "Celestica", "networking"],
  ["APH", "Amphenol", "networking"],
  ["TEL", "TE Connectivity", "networking"],
  ["300308.SZ", "Innolight", "networking"],
  ["2345.TW", "Accton", "networking"],
  ["CRDO", "Credo Technology", "networking"],
  ["ALAB", "Astera Labs", "networking"],
  // storage
  ["WDC", "Western Digital", "storage"],
  ["STX", "Seagate", "storage"],
  ["PSTG", "Pure Storage", "storage"],
  ["NTAP", "NetApp", "storage"],
  // data-centers
  ["EQIX", "Equinix", "data-centers"],
  ["DLR", "Digital Realty", "data-centers"],
  ["IRM", "Iron Mountain", "data-centers"],
  ["AJBU.SI", "Keppel DC REIT", "data-centers"],
  ["GDS", "GDS Holdings", "data-centers"],
  ["VNET", "VNET Group", "data-centers"],
  ["NXT.AX", "NEXTDC", "data-centers"],
  ["GMG.AX", "Goodman Group", "data-centers"],
  ["SGRO.L", "Segro", "data-centers"],
  ["APLD", "Applied Digital", "data-centers"],
  ["CRWV", "CoreWeave", "data-centers"],
  ["NBIS", "Nebius Group", "data-centers"],
  ["IREN", "IREN", "data-centers"],
  ["WULF", "TeraWulf", "data-centers"],
  ["HUT", "Hut 8", "data-centers"],
  ["CORZ", "Core Scientific", "data-centers"],
  ["CIFR", "Cipher Mining", "data-centers"],
  // cooling-power
  ["VRT", "Vertiv Holdings", "cooling-power"],
  ["NVT", "nVent Electric", "cooling-power"],
  ["JCI", "Johnson Controls", "cooling-power"],
  ["TT", "Trane Technologies", "cooling-power"],
  ["MTRS.ST", "Munters", "cooling-power"],
  ["LR.PA", "Legrand", "cooling-power"],
  ["MOD", "Modine Manufacturing", "cooling-power"],
  ["ASTK.OL", "Asetek", "cooling-power"],
  ["2308.TW", "Delta Electronics", "cooling-power"],
  ["2301.TW", "LiteOn", "cooling-power"],
  // cloud-western
  ["MSFT", "Microsoft", "cloud-western"],
  ["AMZN", "Amazon", "cloud-western"],
  ["GOOGL", "Alphabet / Google", "cloud-western"],
  ["META", "Meta Platforms", "cloud-western"],
  ["ORCL", "Oracle", "cloud-western"],
  // cloud-asia
  ["BABA", "Alibaba", "cloud-asia"],
  ["0700.HK", "Tencent", "cloud-asia"],
  ["BIDU", "Baidu", "cloud-asia"],
  ["1024.HK", "Kuaishou", "cloud-asia"],
  ["JD", "JD.com", "cloud-asia"],
  ["688256.SS", "Cambricon", "cloud-asia"],
  ["0020.HK", "SenseTime", "cloud-asia"],
  ["002230.SZ", "iFlytek", "cloud-asia"],
  ["035420.KS", "NAVER", "cloud-asia"],
  ["4755.T", "Rakuten", "cloud-asia"],
  // ai-software
  ["PLTR", "Palantir", "ai-software"],
  ["SNOW", "Snowflake", "ai-software"],
  ["MDB", "MongoDB", "ai-software"],
  ["DDOG", "Datadog", "ai-software"],
  ["NOW", "ServiceNow", "ai-software"],
  ["CRM", "Salesforce", "ai-software"],
  ["ESTC", "Elastic", "ai-software"],
  ["CFLT", "Confluent", "ai-software"],
  ["GTLB", "GitLab", "ai-software"],
  ["NET", "Cloudflare", "ai-software"],
  ["PATH", "UiPath", "ai-software"],
  ["AI", "C3.ai", "ai-software"],
  ["WDAY", "Workday", "ai-software"],
  ["VEEV", "Veeva", "ai-software"],
  ["SAP", "SAP", "ai-software"],
  ["ZS", "Zscaler", "ai-software"],
  ["CRWD", "CrowdStrike", "ai-software"],
  // end-applications
  ["ADBE", "Adobe", "end-applications"],
  ["AAPL", "Apple", "end-applications"],
  ["TSLA", "Tesla", "end-applications"],
  ["DUOL", "Duolingo", "end-applications"],
  ["SHOP", "Shopify", "end-applications"],
  ["INTU", "Intuit", "end-applications"],
  ["HUBS", "HubSpot", "end-applications"],
  ["APP", "AppLovin", "end-applications"],
  ["TTD", "Trade Desk", "end-applications"],
  ["RXRX", "Recursion Pharma", "end-applications"],
  ["SDGR", "Schrödinger", "end-applications"],
  ["TEM", "Tempus AI", "end-applications"],
  ["KVYO", "Klaviyo", "end-applications"],
  ["FRSH", "Freshworks", "end-applications"],
  ["SOUN", "SoundHound AI", "end-applications"],
  ["IOT", "Samsara", "end-applications"],
  ["PCOR", "Procore", "end-applications"],
  // energy
  ["CEG", "Constellation Energy", "energy"],
  ["VST", "Vistra", "energy"],
  ["TLN", "Talen Energy", "energy"],
  ["NEE", "NextEra", "energy"],
  ["D", "Dominion Energy", "energy"],
  ["DUK", "Duke Energy", "energy"],
  ["SO", "Southern Company", "energy"],
  ["AEP", "AEP", "energy"],
  ["EXC", "Exelon", "energy"],
  ["PEG", "PSEG", "energy"],
  ["ETR", "Entergy", "energy"],
  ["CCJ", "Cameco", "energy"],
  ["BWXT", "BWX Technologies", "energy"],
  ["SMR", "NuScale Power", "energy"],
  ["OKLO", "Oklo", "energy"],
  ["NNE", "Nano Nuclear Energy", "energy"],
  ["LEU", "Centrus Energy", "energy"],
  ["UEC", "Uranium Energy Corp", "energy"],
  ["DNN", "Denison Mines", "energy"],
  ["NXE", "NexGen Energy", "energy"],
  ["KAP.L", "Kazatomprom", "energy"],
  ["GEV", "GE Vernova", "energy"],
  ["ENR.DE", "Siemens Energy", "energy"],
  ["7011.T", "Mitsubishi Heavy", "energy"],
  ["CAT", "Caterpillar", "energy"],
  ["CMI", "Cummins", "energy"],
  ["GNRC", "Generac", "energy"],
  ["KMI", "Kinder Morgan", "energy"],
  ["WMB", "Williams Companies", "energy"],
  ["ET", "Energy Transfer", "energy"],
  ["EQT", "EQT Corp", "energy"],
  ["ETN", "Eaton", "energy"],
  ["SU.PA", "Schneider Electric", "energy"],
  ["ABBN.SW", "ABB", "energy"],
  ["6501.T", "Hitachi", "energy"],
  ["HUBB", "Hubbell", "energy"],
  ["PWR", "Quanta Services", "energy"],
  ["MYRG", "MYR Group", "energy"],
  ["PRY.MI", "Prysmian", "energy"],
  ["NEX.PA", "Nexans", "energy"],
  ["BEPC", "Brookfield Renewable", "energy"],
  ["FSLR", "First Solar", "energy"],
  ["NXT", "Nextracker", "energy"],
];

const added = [];
const existing = [];
const failed = [];

async function addOne([symbol, name, category]) {
  try {
    const res = await fetch(`${BASE}/api/companies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, name, category }),
    });
    if (res.status === 201) added.push(symbol);
    else if (res.status === 409) existing.push(symbol);
    else {
      const body = await res.json().catch(() => ({}));
      failed.push(`${symbol} (${name}): ${res.status} ${body.error ?? ""}`.trim());
    }
  } catch (e) {
    failed.push(`${symbol} (${name}): ${e.message}`);
  }
}

// Limited concurrency to be gentle on Yahoo.
async function run() {
  const POOL = 4;
  let i = 0;
  async function worker() {
    while (i < COMPANIES.length) {
      const item = COMPANIES[i++];
      await addOne(item);
    }
  }
  await Promise.all(Array.from({ length: POOL }, worker));

  console.log(`\nADDED   ${added.length}`);
  console.log(`EXISTS  ${existing.length}  (${existing.join(", ")})`);
  console.log(`FAILED  ${failed.length}`);
  for (const f of failed) console.log("  ✗ " + f);
  console.log(`\nTotal attempted: ${COMPANIES.length}`);
}

run();
