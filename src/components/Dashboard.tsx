"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { AnalystDTO, EarningsDTO, FundamentalsDTO, HistoryPoint, QuoteDTO } from "@/lib/types";
import { formatMarketCap, formatPrice, netChangePercent } from "@/lib/format";
import { getCategory, categoryOrder } from "@/lib/categories";
import { consensus } from "@/lib/analyst";
import AddCompanyForm from "./AddCompanyForm";
import ChangeBadge from "./ChangeBadge";
import CompanyLogo from "./CompanyLogo";
import DigestPanel from "./DigestPanel";
import MacroStrip from "./MacroStrip";
import Sparkline from "./Sparkline";
import WatchlistPulse from "./WatchlistPulse";

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

const US_EXCHANGES = new Set([
  "Nasdaq",
  "New York Stock Exchange (NYSE)",
  "NYSE American",
  "NYSE Arca",
]);

// Percent change over the trailing N months, from the cached daily history.
function pctOverMonths(history: HistoryPoint[] | undefined, months: number): number | null {
  if (!history || history.length < 2) return null;
  const last = history[history.length - 1];
  const target = new Date(`${last.date}T00:00:00`);
  target.setMonth(target.getMonth() - months);
  const targetMs = target.getTime();
  let best: HistoryPoint | null = null;
  let bestDiff = Infinity;
  for (const p of history) {
    const diff = Math.abs(new Date(`${p.date}T00:00:00`).getTime() - targetMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = p;
    }
  }
  return best && best.close ? ((last.close - best.close) * 100) / best.close : null;
}

// Per-company metrics a screen can test against.
type ScreenMetrics = {
  isUS: boolean;
  today: number | null;
  trend12: number | null;
  change3m: number | null;
  offHigh: number | null; // % below 52-week high
  pe: number | null; // forward, else trailing
  buyRated: boolean;
};

// One-click screens — same logic we ran by hand, as reusable presets.
const SCREENS: { id: string; label: string; hint: string; test: (m: ScreenMetrics) => boolean }[] = [
  {
    id: "us-uptrend",
    label: "US uptrend",
    hint: "US-listed, rising over the past 12 months",
    test: (m) => m.isUS && m.trend12 != null && m.trend12 >= 0,
  },
  {
    id: "calm-pullback",
    label: "Calm pullbacks",
    hint: "12-mo uptrend, 5–20% off its high, quiet today",
    test: (m) =>
      m.trend12 != null &&
      m.trend12 >= 0 &&
      m.offHigh != null &&
      m.offHigh >= 5 &&
      m.offHigh <= 20 &&
      m.today != null &&
      m.today >= -3 &&
      m.today <= 3,
  },
  {
    id: "buy-cheap",
    label: "Buy-rated & cheap",
    hint: "Analyst buy consensus and P/E ≤ 30",
    test: (m) => m.buyRated && m.pe != null && m.pe <= 30,
  },
  {
    id: "momentum-3m",
    label: "3-mo momentum",
    hint: "Up more than 15% over the last 3 months",
    test: (m) => m.change3m != null && m.change3m >= 15,
  },
];

export default function Dashboard({ initialCompanies }: { initialCompanies: CompanyDTO[] }) {
  const [companies, setCompanies] = useState<CompanyDTO[]>(initialCompanies);
  const [quotes, setQuotes] = useState<Record<string, QuoteDTO>>({});
  const [histories, setHistories] = useState<Record<string, HistoryPoint[]>>({});
  const [earnings, setEarnings] = useState<Record<string, EarningsDTO>>({});
  const [fundamentals, setFundamentals] = useState<Record<string, FundamentalsDTO>>({});
  const [analysts, setAnalysts] = useState<Record<string, AnalystDTO | null>>({});
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [screen, setScreen] = useState<string | null>(null);
  const [filters, setFilters] = useState<{ q: string; exchange: string[]; location: string[]; category: string[] }>({
    q: "",
    exchange: [],
    location: [],
    category: [],
  });

  // Fetch a quote, plus (on the initial load) the 12-month history for the
  // sparkline and the next-earnings date — both slow-moving and cached server-side.
  const loadQuote = useCallback(async (symbol: string, force = false, withExtras = false) => {
    try {
      const params = new URLSearchParams();
      if (force) params.set("force", "1");
      if (withExtras) {
        params.set("history", "1");
        params.set("earnings", "1");
        params.set("fundamentals", "1");
        params.set("analyst", "1");
      }
      const qs = params.toString();
      const res = await fetch(`/api/quote/${encodeURIComponent(symbol)}${qs ? `?${qs}` : ""}`);
      const data = await res.json();
      if (data.quote) setQuotes((prev) => ({ ...prev, [symbol]: data.quote }));
      if (data.history) setHistories((prev) => ({ ...prev, [symbol]: data.history }));
      if (data.earnings) setEarnings((prev) => ({ ...prev, [symbol]: data.earnings }));
      if (data.fundamentals) setFundamentals((prev) => ({ ...prev, [symbol]: data.fundamentals }));
      // Store null too (= "loaded, no analyst coverage") so the cell shows "—", not a perpetual "…".
      if (data.analyst !== undefined) setAnalysts((prev) => ({ ...prev, [symbol]: data.analyst }));
    } catch {
      /* ignore individual quote failures */
    }
  }, []);

  const refreshAll = useCallback(
    async (force = false, withHistory = false) => {
      setLoadingQuotes(true);
      // Limited concurrency: with a large watchlist, firing every request at
      // once rate-limits the upstream data source. Rows fill in as they resolve.
      const POOL = 6;
      const queue = [...companies];
      const worker = async () => {
        while (queue.length) {
          const c = queue.shift();
          if (c) await loadQuote(c.symbol, force, withHistory);
        }
      };
      await Promise.all(Array.from({ length: Math.min(POOL, companies.length) }, worker));
      setLoadingQuotes(false);
    },
    [companies, loadQuote]
  );

  // On mount / when the list changes, load quotes plus the 12-month history once
  // (history is slow-moving, so the Refresh button below skips it to stay fast).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (companies.length) refreshAll(false, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies.length]);

  // Distinct dropdown options, derived from the current watchlist.
  const exchangeOptions = useMemo(
    () => [...new Set(companies.map((c) => c.exchange).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [companies]
  );
  const locationOptions = useMemo(
    () => [...new Set(companies.map((c) => c.location).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [companies]
  );
  const categoryOptions = useMemo(() => {
    const ids = [...new Set(companies.map((c) => c.category).filter((c): c is string => Boolean(c)))];
    return ids
      .sort((a, b) => categoryOrder(a) - categoryOrder(b))
      .map((id) => ({ value: id, label: getCategory(id)?.short ?? id }));
  }, [companies]);

  // Apply the active filters. Each multi-filter is OR within itself (any of the
  // chosen exchanges) and AND across filters (exchange AND location AND …).
  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const activeScreen = SCREENS.find((s) => s.id === screen);
    return companies.filter((c) => {
      if (filters.exchange.length && !filters.exchange.includes(c.exchange)) return false;
      if (filters.location.length && !filters.location.includes(c.location)) return false;
      if (filters.category.length && !(c.category && filters.category.includes(c.category))) return false;
      if (q && !`${c.name} ${c.symbol}`.toLowerCase().includes(q)) return false;
      if (activeScreen) {
        const quote = quotes[c.symbol];
        const f = fundamentals[c.symbol];
        const cons = consensus(analysts[c.symbol]);
        const metrics: ScreenMetrics = {
          isUS: US_EXCHANGES.has(c.exchange),
          today: quote?.changePercent ?? null,
          trend12: netChangePercent(histories[c.symbol] ?? []),
          change3m: pctOverMonths(histories[c.symbol], 3),
          offHigh:
            quote && quote.week52High ? ((quote.week52High - quote.price) * 100) / quote.week52High : null,
          pe: f?.forwardPE ?? f?.trailingPE ?? null,
          buyRated: cons?.tone === "up",
        };
        if (!activeScreen.test(metrics)) return false;
      }
      return true;
    });
  }, [companies, filters, screen, quotes, histories, fundamentals, analysts]);

  const filtersActive = Boolean(
    filters.q || filters.exchange.length || filters.location.length || filters.category.length || screen
  );

  // Group the filtered companies into value-chain layers, ordered top→bottom.
  const groups = useMemo(() => {
    const sorted = [...filtered].sort(
      (a, b) => categoryOrder(a.category) - categoryOrder(b.category) || a.name.localeCompare(b.name)
    );
    const out: { key: string; label: string; rows: CompanyDTO[] }[] = [];
    for (const c of sorted) {
      const cat = getCategory(c.category);
      const key = cat?.id ?? "uncategorized";
      const last = out[out.length - 1];
      if (!last || last.key !== key) {
        out.push({ key, label: cat?.short ?? "Uncategorized", rows: [c] });
      } else {
        last.rows.push(c);
      }
    }
    return out;
  }, [filtered]);

  const handleAdded = (c: CompanyDTO) => {
    setCompanies((prev) => [c, ...prev]);
    setShowAdd(false);
    loadQuote(c.symbol, true, true);
  };

  const handleDelete = async (id: number, symbol: string) => {
    if (!confirm(`Remove ${symbol} from your watchlist?`)) return;
    await fetch(`/api/companies/${id}`, { method: "DELETE" });
    setCompanies((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-5">
      <MacroStrip />

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your Watchlist</h1>
          <p className="text-sm text-muted mt-1">
            {filtersActive
              ? `${filtered.length} of ${companies.length} shown`
              : `${companies.length} ${companies.length === 1 ? "company" : "companies"} tracked`}
            <span className="text-muted/70"> · prices may be delayed (Yahoo Finance)</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshAll(true)}
            disabled={loadingQuotes || companies.length === 0}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm hover:bg-surface-2 disabled:opacity-50 transition"
          >
            {loadingQuotes ? "Refreshing…" : "↻ Refresh prices"}
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-background hover:opacity-90 transition"
          >
            + Add company
          </button>
        </div>
      </div>

      {companies.length === 0 ? (
        <EmptyState onAdd={() => setShowAdd(true)} />
      ) : (
        <>
        <WatchlistPulse companies={companies} quotes={quotes} earnings={earnings} analysts={analysts} />

        <DigestPanel />

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            placeholder="Search name or ticker…"
            className="input max-w-[220px]"
          />
          <MultiFilter
            label="Listed"
            selected={filters.exchange}
            onChange={(v) => setFilters((f) => ({ ...f, exchange: v }))}
            options={exchangeOptions.map((x) => ({ value: x, label: x }))}
          />
          <MultiFilter
            label="Location"
            selected={filters.location}
            onChange={(v) => setFilters((f) => ({ ...f, location: v }))}
            options={locationOptions.map((x) => ({ value: x, label: x }))}
          />
          <MultiFilter
            label="Category"
            selected={filters.category}
            onChange={(v) => setFilters((f) => ({ ...f, category: v }))}
            options={categoryOptions}
          />
          {filtersActive && (
            <button
              onClick={() => {
                setFilters({ q: "", exchange: [], location: [], category: [] });
                setScreen(null);
              }}
              className="text-sm text-muted hover:text-accent transition"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* One-click smart screens */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-muted">Screens</span>
          {SCREENS.map((s) => {
            const active = screen === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setScreen(active ? null : s.id)}
                title={s.hint}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  active
                    ? "border-accent bg-accent/15 text-foreground"
                    : "border-border bg-surface text-muted hover:bg-surface-2"
                }`}
              >
                {s.label}
              </button>
            );
          })}
          {screen && (
            <span className="text-xs text-muted">
              {SCREENS.find((s) => s.id === screen)?.hint}
            </span>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface/50 p-10 text-center text-sm text-muted">
            No companies match these filters.
          </div>
        ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-border">
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Listed</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium text-right">Price</th>
                <th className="px-4 py-3 font-medium text-right">Today</th>
                <th className="px-4 py-3 font-medium text-right">Mkt Cap</th>
                <th className="px-4 py-3 font-medium text-right">P/E</th>
                <th className="px-4 py-3 font-medium text-center">12-mo trend</th>
                <th className="px-4 py-3 font-medium">Analyst</th>
                <th className="px-4 py-3 font-medium">Next earnings</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <Fragment key={g.key}>
                  <tr className="bg-surface-2/60 border-b border-border">
                    <td colSpan={11} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-accent">
                      {g.label}
                      <span className="ml-2 font-normal text-muted">
                        {g.rows.length} {g.rows.length === 1 ? "company" : "companies"}
                      </span>
                    </td>
                  </tr>
                  {g.rows.map((c) => {
                    const q = quotes[c.symbol];
                    return (
                      <tr key={c.id} className="border-b border-border/60 hover:bg-surface-2/40 transition">
                        <td className="px-4 py-3">
                          <Link href={`/companies/${c.id}`} className="group flex items-center gap-3">
                            <CompanyLogo name={c.name} symbol={c.symbol} domain={c.domain} />
                            <span className="min-w-0">
                              <div className="font-medium group-hover:text-accent transition">{c.name}</div>
                              <div className="font-mono text-xs text-muted">{c.symbol}</div>
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted">{c.exchange}</td>
                        <td className="px-4 py-3 text-muted">{c.location}</td>
                        <td className="px-4 py-3 text-right font-mono">
                          {q ? formatPrice(q.price, q.currency) : <span className="text-muted">…</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {q ? <ChangeBadge change={q.change} percent={q.changePercent} /> : <span className="text-muted">…</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-muted">
                          {q ? formatMarketCap(q.marketCap, q.currency) : "…"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-muted">
                          <PECell data={fundamentals[c.symbol]} />
                        </td>
                        <td className="px-4 py-3">
                          {histories[c.symbol] ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <Sparkline data={histories[c.symbol]} />
                              <YearChange data={histories[c.symbol]} />
                            </div>
                          ) : (
                            <span className="block text-center text-muted">…</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <AnalystBadge data={analysts[c.symbol]} />
                        </td>
                        <td className="px-4 py-3">
                          <EarningsCell info={earnings[c.symbol]} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDelete(c.id, c.symbol)}
                            className="text-muted hover:text-down transition text-xs"
                            title="Remove"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        )}
        </>
      )}

      {showAdd && <AddCompanyForm onAdded={handleAdded} onClose={() => setShowAdd(false)} />}
    </div>
  );
}

// A dropdown of checkboxes — pick any number of values for one column.
function MultiFilter({
  label,
  selected,
  onChange,
  options,
}: {
  label: string;
  selected: string[];
  onChange: (next: string[]) => void;
  options: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);

  const active = selected.length > 0;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-md border px-2.5 py-2 text-sm transition ${
          active ? "border-accent bg-accent/10 text-foreground" : "border-border bg-surface text-muted hover:bg-surface-2"
        }`}
      >
        {label}
        {active && <span className="rounded-full bg-accent px-1.5 text-xs font-medium text-background">{selected.length}</span>}
        <span className="text-[10px]">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 z-20 mt-1 max-h-72 w-64 overflow-auto rounded-md border border-border bg-surface p-1 shadow-xl">
          {options.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-muted">No options</div>
          ) : (
            options.map((o) => {
              const checked = selected.includes(o.value);
              return (
                <label
                  key={o.value}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-surface-2"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(o.value)}
                    className="accent-[var(--accent)]"
                  />
                  <span className={checked ? "text-foreground" : "text-muted"}>{o.label}</span>
                </label>
              );
            })
          )}
          {active && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mt-1 w-full rounded px-2 py-1 text-left text-xs text-muted hover:text-accent"
            >
              Clear {label.toLowerCase()}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Next quarterly earnings date. "~" marks a Yahoo estimate; upcoming dates
// within two weeks are highlighted.
function EarningsCell({ info }: { info: EarningsDTO | undefined }) {
  if (info === undefined) return <span className="text-muted">…</span>;
  if (!info.date) return <span className="text-muted">—</span>;

  const d = new Date(`${info.date}T00:00:00`);
  const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const days = Math.ceil((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  const soon = days >= 0 && days <= 14;

  return (
    <span
      className={`whitespace-nowrap text-sm ${soon ? "text-accent font-medium" : "text-muted"}`}
      title={info.estimate ? "Estimated date" : "Confirmed date"}
    >
      {info.estimate ? "~" : ""}
      {label}
      {soon && <span className="ml-1 text-xs">({days === 0 ? "today" : `${days}d`})</span>}
    </span>
  );
}

// Forward P/E (preferred) or trailing P/E. Em-dash when unavailable.
function PECell({ data }: { data: FundamentalsDTO | undefined }) {
  if (data === undefined) return <span>…</span>;
  const pe = data.forwardPE ?? data.trailingPE;
  if (pe == null) return <span className="text-muted/60">—</span>;
  const fwd = data.forwardPE != null;
  return (
    <span title={fwd ? "Forward P/E" : "Trailing P/E"}>
      {pe.toFixed(1)}
      {fwd && <span className="text-[10px] text-muted/70">f</span>}
    </span>
  );
}

// Compact analyst-consensus chip (colored dot + rating). undefined = still
// loading; null or no usable trend = no coverage.
function AnalystBadge({ data }: { data: AnalystDTO | null | undefined }) {
  if (data === undefined) return <span className="text-muted">…</span>;
  const c = consensus(data);
  if (!c) return <span className="text-muted/60">—</span>;
  const dot = c.tone === "up" ? "bg-up" : c.tone === "down" ? "bg-down" : "bg-muted";
  const text = c.tone === "up" ? "text-up" : c.tone === "down" ? "text-down" : "text-muted";
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap text-xs" title={`${c.total} analysts`}>
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span className={text}>{c.label}</span>
      <span className="text-muted/60">{c.total}</span>
    </span>
  );
}

// Net change over the loaded ~12-month history (dividend-adjusted total return),
// colored by direction.
function YearChange({ data }: { data: HistoryPoint[] }) {
  const pct = netChangePercent(data);
  if (pct == null) return null;
  const cls = pct >= 0 ? "text-up" : "text-down";
  return (
    <span className={`font-mono text-xs ${cls}`} title="Total return over the past 12 months (dividend-adjusted)">
      {pct >= 0 ? "+" : ""}
      {pct.toFixed(1)}%
    </span>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface/50 p-12 text-center">
      <div className="text-4xl mb-3">📈</div>
      <h2 className="text-lg font-medium">No companies yet</h2>
      <p className="text-sm text-muted mt-1 mb-4">
        Add a company by its ticker symbol to start tracking its price and getting daily AI insights.
      </p>
      <button
        onClick={onAdd}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background hover:opacity-90 transition"
      >
        + Add your first company
      </button>
    </div>
  );
}
