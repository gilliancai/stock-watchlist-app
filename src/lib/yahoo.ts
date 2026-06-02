import YahooFinance from "yahoo-finance2";

// v3 exports a class that must be instantiated. Suppress the one-time survey notice.
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// yahoo-finance2 v3 returns broad union types for quote/quoteSummary. We only read
// a handful of fields, so we narrow with minimal local shapes (runtime-safe).
type QuoteLike = {
  symbol?: string;
  longName?: string;
  shortName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  marketCap?: number;
  currency?: string;
  fullExchangeName?: string;
  exchange?: string;
};

type QuoteSummaryLike = {
  assetProfile?: Record<string, unknown>;
  summaryProfile?: Record<string, unknown>;
  price?: { longName?: string };
};

type FundamentalsSummaryLike = {
  summaryDetail?: Record<string, number | undefined>;
  defaultKeyStatistics?: Record<string, number | undefined>;
  financialData?: Record<string, number | string | undefined>;
};

type ChartLike = { quotes: Array<{ date: Date; close: number | null; adjclose?: number | null }> };

type CalendarLike = {
  calendarEvents?: { earnings?: { earningsDate?: Array<Date | string>; isEarningsDateEstimate?: boolean } };
};

// The chart endpoint's `meta` still carries a live price when the quote
// endpoint flakes out (it intermittently returns empty for valid symbols).
type ChartMetaLike = {
  symbol?: string;
  currency?: string;
  fullExchangeName?: string;
  longName?: string;
  shortName?: string;
  regularMarketPrice?: number;
  previousClose?: number;
  chartPreviousClose?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
};

export type NormalizedQuote = {
  symbol: string;
  name: string | null;
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number | null;
  dayLow: number | null;
  week52High: number | null;
  week52Low: number | null;
  marketCap: number | null;
  currency: string | null;
  exchange: string | null;
};

export type ProfileInfo = {
  longName: string | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  city: string | null;
  website: string | null;
  summary: string | null;
};

export type HistoryPoint = { date: string; close: number };

export type EarningsInfo = { date: string | null; estimate: boolean };

// Valuation / quality fundamentals. All nullable — Yahoo omits fields per symbol.
export type FundamentalsInfo = {
  trailingPE: number | null;
  forwardPE: number | null;
  pegRatio: number | null;
  priceToBook: number | null;
  dividendYield: number | null; // as a fraction (0.012 = 1.2%)
  beta: number | null;
  revenueGrowth: number | null; // YoY, fraction
  grossMargins: number | null; // fraction
  profitMargins: number | null; // fraction
  returnOnEquity: number | null; // fraction
  debtToEquity: number | null; // percent (Yahoo reports e.g. 45.2)
  recommendationKey: string | null; // e.g. "buy", "hold"
  targetMeanPrice: number | null;
  numberOfAnalystOpinions: number | null;
};

/** Fetch a normalized live quote for a symbol. Throws if the symbol is invalid. */
export async function fetchQuote(symbol: string): Promise<NormalizedQuote> {
  const q = (await yahooFinance.quote(symbol).catch(() => null)) as QuoteLike | null;
  if (q && typeof q.regularMarketPrice === "number") {
    return {
      symbol: q.symbol ?? symbol.toUpperCase(),
      name: q.longName ?? q.shortName ?? null,
      price: q.regularMarketPrice,
      change: q.regularMarketChange ?? 0,
      changePercent: q.regularMarketChangePercent ?? 0,
      dayHigh: q.regularMarketDayHigh ?? null,
      dayLow: q.regularMarketDayLow ?? null,
      week52High: q.fiftyTwoWeekHigh ?? null,
      week52Low: q.fiftyTwoWeekLow ?? null,
      marketCap: q.marketCap ?? null,
      currency: q.currency ?? null,
      exchange: q.fullExchangeName ?? q.exchange ?? null,
    };
  }

  // Fallback: the quote endpoint returned nothing usable. Yahoo's chart `meta`
  // still has a live price for valid symbols (market cap isn't available there).
  const start = new Date();
  start.setDate(start.getDate() - 7);
  const meta = (await yahooFinance
    .chart(symbol, { period1: start, interval: "1d" })
    .then((r) => (r as { meta?: ChartMetaLike }).meta ?? null)
    .catch(() => null)) as ChartMetaLike | null;

  if (meta && typeof meta.regularMarketPrice === "number") {
    const prev = meta.previousClose ?? meta.chartPreviousClose;
    const change = typeof prev === "number" ? meta.regularMarketPrice - prev : 0;
    const changePercent = typeof prev === "number" && prev ? (change / prev) * 100 : 0;
    return {
      symbol: meta.symbol ?? symbol.toUpperCase(),
      name: meta.longName ?? meta.shortName ?? null,
      price: meta.regularMarketPrice,
      change,
      changePercent,
      dayHigh: meta.regularMarketDayHigh ?? null,
      dayLow: meta.regularMarketDayLow ?? null,
      week52High: meta.fiftyTwoWeekHigh ?? null,
      week52Low: meta.fiftyTwoWeekLow ?? null,
      marketCap: null,
      currency: meta.currency ?? null,
      exchange: meta.fullExchangeName ?? null,
    };
  }

  throw new Error(`No quote data for "${symbol}"`);
}

/** Fetch company profile / summary info. Returns nulls if unavailable. */
export async function fetchProfile(symbol: string): Promise<ProfileInfo> {
  try {
    const res = (await yahooFinance.quoteSummary(symbol, {
      modules: ["assetProfile", "summaryProfile", "price"],
    })) as QuoteSummaryLike;
    const profile = (res.assetProfile ?? res.summaryProfile ?? {}) as Record<string, string | undefined>;
    return {
      longName: res.price?.longName ?? null,
      sector: profile.sector ?? null,
      industry: profile.industry ?? null,
      country: profile.country ?? null,
      city: profile.city ?? null,
      website: profile.website ?? null,
      summary: profile.longBusinessSummary ?? null,
    };
  } catch {
    return {
      longName: null,
      sector: null,
      industry: null,
      country: null,
      city: null,
      website: null,
      summary: null,
    };
  }
}

/** Valuation & quality fundamentals for a symbol. Returns all-null if unavailable. */
export async function fetchFundamentals(symbol: string): Promise<FundamentalsInfo> {
  const empty: FundamentalsInfo = {
    trailingPE: null, forwardPE: null, pegRatio: null, priceToBook: null,
    dividendYield: null, beta: null, revenueGrowth: null, grossMargins: null,
    profitMargins: null, returnOnEquity: null, debtToEquity: null,
    recommendationKey: null, targetMeanPrice: null, numberOfAnalystOpinions: null,
  };
  try {
    const res = (await yahooFinance.quoteSummary(symbol, {
      modules: ["summaryDetail", "defaultKeyStatistics", "financialData"],
    })) as FundamentalsSummaryLike;
    const sd = res.summaryDetail ?? {};
    const ks = res.defaultKeyStatistics ?? {};
    const fd = res.financialData ?? {};
    const num = (v: number | string | undefined): number | null =>
      typeof v === "number" && Number.isFinite(v) ? v : null;
    return {
      trailingPE: num(sd.trailingPE),
      forwardPE: num(sd.forwardPE ?? ks.forwardPE),
      pegRatio: num(ks.pegRatio),
      priceToBook: num(ks.priceToBook),
      dividendYield: num(sd.dividendYield),
      beta: num(sd.beta ?? ks.beta),
      revenueGrowth: num(fd.revenueGrowth),
      grossMargins: num(fd.grossMargins),
      profitMargins: num(fd.profitMargins),
      returnOnEquity: num(fd.returnOnEquity),
      debtToEquity: num(fd.debtToEquity),
      recommendationKey: typeof fd.recommendationKey === "string" && fd.recommendationKey !== "none"
        ? fd.recommendationKey
        : null,
      targetMeanPrice: num(fd.targetMeanPrice),
      numberOfAnalystOpinions: num(fd.numberOfAnalystOpinions),
    };
  } catch {
    return empty;
  }
}

/** Next quarterly earnings date for a symbol. Returns nulls if unavailable. */
export async function fetchEarnings(symbol: string): Promise<EarningsInfo> {
  try {
    const res = (await yahooFinance.quoteSummary(symbol, { modules: ["calendarEvents"] })) as CalendarLike;
    const e = res.calendarEvents?.earnings;
    const dates = (e?.earningsDate ?? [])
      .map((d) => (d instanceof Date ? d : new Date(d)))
      .filter((d) => !Number.isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    if (!dates.length) return { date: null, estimate: false };
    // Prefer the next upcoming date; fall back to the earliest available.
    const now = Date.now();
    const next = dates.find((d) => d.getTime() >= now) ?? dates[0];
    return { date: next.toISOString().slice(0, 10), estimate: Boolean(e?.isEarningsDateEstimate) };
  } catch {
    return { date: null, estimate: false };
  }
}

/** Daily closing prices for roughly the past year. */
export async function fetchHistory(symbol: string): Promise<HistoryPoint[]> {
  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - 1);
  try {
    const rows = (await yahooFinance.chart(symbol, {
      period1: start,
      period2: end,
      interval: "1d",
    })) as ChartLike;
    return rows.quotes
      .filter((r): r is { date: Date; close: number; adjclose?: number | null } => typeof r.close === "number" && r.date instanceof Date)
      .map((r) => ({
        date: r.date.toISOString().slice(0, 10),
        // Prefer dividend- & split-adjusted close so 12-month figures reflect
        // total return, not just price return. Falls back to raw close.
        close: typeof r.adjclose === "number" ? r.adjclose : r.close,
      }));
  } catch {
    return [];
  }
}
