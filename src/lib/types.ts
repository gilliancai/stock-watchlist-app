// Plain DTOs shared between server pages and client components.

export type CompanyDTO = {
  id: number;
  name: string;
  symbol: string;
  exchange: string;
  location: string;
  sector: string | null;
  category: string | null;
  domain: string | null;
  notes: string | null;
};

export type QuoteDTO = {
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
  fetchedAt: string;
  cached: boolean;
};

export type HistoryPoint = { date: string; close: number };

export type EarningsDTO = { date: string | null; estimate: boolean };

// Mirrors FundamentalsInfo from lib/yahoo.
export type FundamentalsDTO = {
  trailingPE: number | null;
  forwardPE: number | null;
  pegRatio: number | null;
  priceToBook: number | null;
  dividendYield: number | null;
  beta: number | null;
  revenueGrowth: number | null;
  grossMargins: number | null;
  profitMargins: number | null;
  returnOnEquity: number | null;
  debtToEquity: number | null;
  recommendationKey: string | null;
  targetMeanPrice: number | null;
  numberOfAnalystOpinions: number | null;
};

// Mirrors AnalystInfo from lib/finnhub.
export type AnalystDTO = {
  strongBuy: number | null;
  buy: number | null;
  hold: number | null;
  sell: number | null;
  strongSell: number | null;
  period: string | null;
  targetMean: number | null;
  targetHigh: number | null;
  targetLow: number | null;
};

// Mirrors MacroInfo from lib/fred.
export type MacroDTO = {
  tenYear: number | null;
  twoYear: number | null;
  curveSpread: number | null;
  fedFunds: number | null;
  cpiYoY: number | null;
  asOf: string | null;
};

export type ProfileDTO = {
  longName: string | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  city: string | null;
  website: string | null;
  summary: string | null;
};

export type InsightDTO = {
  id: number;
  companyId: number;
  date: string;
  content: string;
  createdAt: string;
};

export type DigestDTO = {
  date: string;
  content: string;
  createdAt: string;
};

export type PurchaseDTO = {
  id: number;
  companyId: number;
  date: string;
  shares: number;
  pricePerShare: number;
  note: string | null;
  createdAt: string;
};

// Aggregated holding across all buy lots, valued against the latest price.
export type PositionDTO = {
  shares: number;
  costBasis: number; // total spent
  avgPrice: number;
  currentPrice: number | null;
  marketValue: number | null; // null when no live price
  gain: number | null; // marketValue - costBasis
  gainPercent: number | null;
  currency: string | null;
};

// One row of the landing-page portfolio: a held company plus its position.
export type PortfolioHoldingDTO = PositionDTO & {
  companyId: number;
  name: string;
  symbol: string;
  exchange: string;
  lotCount: number;
  firstBuyDate: string | null;
  lastBuyDate: string | null;
};

// Portfolio total, grouped by currency (we never sum across FX).
export type PortfolioTotalDTO = {
  currency: string;
  costBasis: number;
  marketValue: number;
  gain: number;
  gainPercent: number | null;
};
