// FRED (Federal Reserve Economic Data) macro snapshot. Optional — everything
// else works without FRED_API_KEY. Get a free key at
// https://fredaccount.stlouisfed.org/apikeys

const BASE = "https://api.stlouisfed.org/fred/series/observations";

export type MacroInfo = {
  tenYear: number | null; // 10-Year Treasury yield, % (DGS10)
  twoYear: number | null; // 2-Year Treasury yield, % (DGS2)
  curveSpread: number | null; // 10Y minus 2Y, % (T10Y2Y) — negative = inverted
  fedFunds: number | null; // Effective Fed Funds rate, % (FEDFUNDS)
  cpiYoY: number | null; // CPI inflation YoY, % (CPIAUCSL, units=pc1)
  asOf: string | null; // most recent observation date across series
};

export function hasFredKey(): boolean {
  return Boolean(process.env.FRED_API_KEY);
}

// Latest non-missing observation for one series. FRED marks gaps with ".".
async function latest(seriesId: string, units?: string): Promise<{ value: number; date: string } | null> {
  const key = process.env.FRED_API_KEY;
  if (!key) return null;
  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: key,
    file_type: "json",
    sort_order: "desc",
    limit: "1",
  });
  if (units) params.set("units", units);
  try {
    const res = await fetch(`${BASE}?${params}`);
    if (!res.ok) return null;
    const json = (await res.json()) as { observations?: Array<{ date: string; value: string }> };
    const obs = json.observations?.find((o) => o.value !== ".");
    if (!obs) return null;
    const value = Number(obs.value);
    return Number.isFinite(value) ? { value, date: obs.date } : null;
  } catch {
    return null;
  }
}

/** Current macro snapshot from FRED. Returns null if no key is configured. */
export async function fetchMacro(): Promise<MacroInfo | null> {
  if (!hasFredKey()) return null;

  const [ten, two, spread, funds, cpi] = await Promise.all([
    latest("DGS10"),
    latest("DGS2"),
    latest("T10Y2Y"),
    latest("FEDFUNDS"),
    latest("CPIAUCSL", "pc1"), // percent change from a year ago = YoY inflation
  ]);

  const dates = [ten, two, spread, funds, cpi].map((o) => o?.date).filter(Boolean) as string[];
  const asOf = dates.length ? dates.sort().at(-1)! : null;

  return {
    tenYear: ten?.value ?? null,
    twoYear: two?.value ?? null,
    curveSpread: spread?.value ?? null,
    fedFunds: funds?.value ?? null,
    cpiYoY: cpi?.value ?? null,
    asOf,
  };
}
