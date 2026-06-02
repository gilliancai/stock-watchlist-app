/** Bare logo-friendly domain from a website URL (e.g. "https://www.apple.com/x" → "apple.com"). */
export function websiteToDomain(website: string | null | undefined): string | null {
  if (!website) return null;
  try {
    const url = website.includes("://") ? website : `https://${website}`;
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase() || null;
  } catch {
    return null;
  }
}

/** Today's date as yyyy-mm-dd in local time (used to key daily insights). */
export function todayKey(): string {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

/** Compact market-cap formatting: 1.23T / 45.6B / 789M. */
export function formatMarketCap(n: number | null | undefined, currency?: string | null): string {
  if (typeof n !== "number") return "—";
  const cur = currency ? `${currency} ` : "";
  if (n >= 1e12) return `${cur}${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${cur}${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${cur}${(n / 1e6).toFixed(2)}M`;
  return `${cur}${n.toLocaleString("en-US")}`;
}

/** Price with up to 2 decimals and optional currency. */
export function formatPrice(n: number | null | undefined, currency?: string | null): string {
  if (typeof n !== "number") return "—";
  const cur = currency ? `${currency} ` : "";
  return `${cur}${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Signed currency amount for gains/losses, e.g. "+USD 12.34" / "−USD 5.00". */
export function formatSignedPrice(n: number, currency?: string | null): string {
  const sign = n >= 0 ? "+" : "−";
  return `${sign}${formatPrice(Math.abs(n), currency)}`;
}

/** Signed percent, e.g. "+1.42%" / "−0.30%". */
export function formatSignedPercent(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

/** Net % change between the first and last close of a series (null if <2 points). */
export function netChangePercent(series: { close: number }[]): number | null {
  if (!series || series.length < 2) return null;
  const first = series[0].close;
  const last = series[series.length - 1].close;
  if (!first) return null;
  return ((last - first) / first) * 100;
}
