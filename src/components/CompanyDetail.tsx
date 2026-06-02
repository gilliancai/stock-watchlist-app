"use client";

import { useEffect, useState } from "react";
import type { AnalystDTO, CompanyDTO, FundamentalsDTO, HistoryPoint, ProfileDTO, QuoteDTO } from "@/lib/types";
import { formatMarketCap, formatPrice } from "@/lib/format";
import { getBrokerGuide } from "@/lib/brokers";
import { CATEGORIES, getCategory } from "@/lib/categories";
import ChangeBadge from "./ChangeBadge";
import CompanyLogo from "./CompanyLogo";
import PriceChart from "./PriceChart";
import Holdings from "./Holdings";
import InsightPanel from "./InsightPanel";

export default function CompanyDetail({ company: initial }: { company: CompanyDTO }) {
  const [company, setCompany] = useState(initial);
  const [quote, setQuote] = useState<QuoteDTO | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [fundamentals, setFundamentals] = useState<FundamentalsDTO | null>(null);
  const [analyst, setAnalyst] = useState<AnalystDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/quote/${encodeURIComponent(company.symbol)}?history=1&profile=1&fundamentals=1&analyst=1`
        );
        const data = await res.json();
        setQuote(data.quote ?? null);
        setHistory(data.history ?? []);
        setProfile(data.profile ?? null);
        setFundamentals(data.fundamentals ?? null);
        setAnalyst(data.analyst ?? null);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, [company.symbol]);

  const guide = getBrokerGuide(company.exchange);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <CompanyLogo name={company.name} symbol={company.symbol} domain={company.domain} size={52} />
            <div>
            <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted">
              <span className="font-mono">{company.symbol}</span>
              <span>·</span>
              <span>{company.exchange}</span>
              <span>·</span>
              <span>{company.location}</span>
            </div>
            <CategoryControl company={company} onSaved={setCompany} />
            </div>
          </div>
          <div className="text-right">
            {quote ? (
              <>
                <div className="text-2xl font-mono">{formatPrice(quote.price, quote.currency)}</div>
                <div className="mt-1">
                  <ChangeBadge change={quote.change} percent={quote.changePercent} />
                </div>
              </>
            ) : (
              <div className="text-muted text-sm">{loading ? "Loading price…" : "Price unavailable"}</div>
            )}
          </div>
        </div>

        {quote && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <Stat label="Day range" value={`${fmtNum(quote.dayLow)} – ${fmtNum(quote.dayHigh)}`} />
            <Stat label="52-week range" value={`${fmtNum(quote.week52Low)} – ${fmtNum(quote.week52High)}`} />
            <Stat label="Market cap" value={formatMarketCap(quote.marketCap, quote.currency)} />
            <Stat label="Sector" value={company.sector ?? profile?.sector ?? "—"} />
          </div>
        )}
      </div>

      {/* Chart */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="font-semibold mb-3">Price history</h2>
        {loading ? <p className="text-sm text-muted">Loading chart…</p> : <PriceChart history={history} currency={quote?.currency ?? null} />}
      </section>

      {/* Your position / holdings */}
      <Holdings companyId={company.id} currentPrice={quote?.price ?? null} currency={quote?.currency ?? null} />

      {/* Fundamentals (Yahoo) + Analyst consensus (Finnhub) */}
      <div className="grid lg:grid-cols-2 gap-5">
        <FundamentalsCard data={fundamentals} loading={loading} />
        <AnalystCard data={analyst} currency={quote?.currency ?? null} loading={loading} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Notable data / notes */}
        <NotesCard company={company} profile={profile} onSaved={setCompany} />

        {/* Where to buy */}
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <span className="text-accent">🛒</span> Where to buy
          </h2>
          <p className="text-sm text-muted mb-3">{guide.market}</p>
          <ul className="flex flex-wrap gap-2 mb-3">
            {guide.brokers.map((b) => (
              <li key={b} className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs">
                {b}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted">{guide.note}</p>
        </section>
      </div>

      {/* AI insight */}
      <InsightPanel companyId={company.id} />
    </div>
  );
}

function NotesCard({
  company,
  profile,
  onSaved,
}: {
  company: CompanyDTO;
  profile: ProfileDTO | null;
  onSaved: (c: CompanyDTO) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(company.notes ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const res = await fetch(`/api/companies/${company.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    if (res.ok) {
      const updated = await res.json();
      onSaved({ ...company, notes: updated.notes });
      setEditing(false);
    }
    setSaving(false);
  };

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold flex items-center gap-2">
          <span className="text-accent">📝</span> Notable data &amp; notes
        </h2>
        {!editing && (
          <button onClick={() => setEditing(true)} className="text-xs text-muted hover:text-accent">
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            className="input resize-none"
            placeholder="Your thesis, key facts, things to watch…"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setNotes(company.notes ?? "");
                setEditing(false);
              }}
              className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface-2"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ) : company.notes ? (
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{company.notes}</p>
      ) : (
        <p className="text-sm text-muted italic">No notes yet — click Edit to add your thesis or notable facts.</p>
      )}

      {profile?.summary && (
        <details className="mt-4">
          <summary className="text-xs text-muted cursor-pointer hover:text-accent">Business summary (from market data)</summary>
          <p className="text-sm text-muted mt-2 leading-relaxed">{profile.summary}</p>
        </details>
      )}
    </section>
  );
}

function CategoryControl({
  company,
  onSaved,
}: {
  company: CompanyDTO;
  onSaved: (c: CompanyDTO) => void;
}) {
  const [busy, setBusy] = useState(false);
  const cat = getCategory(company.category);

  const setCategory = async (value: string) => {
    setBusy(true);
    const res = await fetch(`/api/companies/${company.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: value }),
    });
    if (res.ok) onSaved({ ...company, category: (await res.json()).category });
    setBusy(false);
  };

  const reclassify = async () => {
    setBusy(true);
    const res = await fetch(`/api/companies/${company.id}/classify`, { method: "POST" });
    if (res.ok) onSaved({ ...company, category: (await res.json()).category });
    setBusy(false);
  };

  return (
    <div className="mt-2 flex items-center gap-2 flex-wrap">
      <span className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-xs text-accent">
        {cat ? cat.short : "Uncategorized"}
      </span>
      <select
        value={company.category ?? ""}
        onChange={(e) => setCategory(e.target.value)}
        disabled={busy}
        className="rounded-md border border-border bg-surface-2 px-2 py-1 text-xs text-foreground disabled:opacity-50"
        title="Change value-chain category"
      >
        <option value="">Uncategorized</option>
        {CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.short}
          </option>
        ))}
      </select>
      <button
        onClick={reclassify}
        disabled={busy}
        className="text-xs text-muted hover:text-accent disabled:opacity-50"
        title="Re-classify with AI"
      >
        {busy ? "…" : "✦ Auto"}
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className="font-mono text-sm mt-0.5">{value}</div>
    </div>
  );
}

function fmtNum(n: number | null): string {
  return typeof n === "number" ? n.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—";
}

// number → fixed-decimal string, or em-dash if missing.
const ratio = (n: number | null | undefined, d = 1) =>
  typeof n === "number" ? n.toFixed(d) : "—";
// fraction (0.123) → "12.3%", or em-dash if missing.
const pct = (n: number | null | undefined, d = 1) =>
  typeof n === "number" ? `${(n * 100).toFixed(d)}%` : "—";

// Valuation & quality fundamentals from Yahoo.
function FundamentalsCard({ data, loading }: { data: FundamentalsDTO | null; loading: boolean }) {
  const rows: [string, string][] = data
    ? [
        ["P/E (trailing)", ratio(data.trailingPE)],
        ["P/E (forward)", ratio(data.forwardPE)],
        ["PEG ratio", ratio(data.pegRatio, 2)],
        ["Price / book", ratio(data.priceToBook, 2)],
        ["Beta", ratio(data.beta, 2)],
        ["Dividend yield", pct(data.dividendYield, 2)],
        ["Revenue growth (YoY)", pct(data.revenueGrowth)],
        ["Gross margin", pct(data.grossMargins)],
        ["Profit margin", pct(data.profitMargins)],
        ["Return on equity", pct(data.returnOnEquity)],
        ["Debt / equity", ratio(data.debtToEquity)],
      ]
    : [];
  const hasAny = data && rows.some(([, v]) => v !== "—");

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="font-semibold mb-3 flex items-center gap-2">
        <span className="text-accent">📊</span> Fundamentals
        <span className="text-xs font-normal text-muted">· Yahoo Finance</span>
      </h2>
      {loading ? (
        <p className="text-sm text-muted">Loading fundamentals…</p>
      ) : !hasAny ? (
        <p className="text-sm text-muted">No fundamentals available for this symbol.</p>
      ) : (
        <dl className="grid grid-cols-2 gap-2">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="font-mono text-sm">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

// Analyst recommendation trend + price target from Finnhub. Hidden gracefully
// when no FINNHUB_API_KEY is configured (the API returns null).
function AnalystCard({
  data,
  currency,
  loading,
}: {
  data: AnalystDTO | null;
  currency: string | null;
  loading: boolean;
}) {
  const counts = data
    ? [
        { label: "Strong buy", n: data.strongBuy ?? 0, color: "var(--up)" },
        { label: "Buy", n: data.buy ?? 0, color: "var(--up)" },
        { label: "Hold", n: data.hold ?? 0, color: "var(--muted)" },
        { label: "Sell", n: data.sell ?? 0, color: "var(--down)" },
        { label: "Strong sell", n: data.strongSell ?? 0, color: "var(--down)" },
      ]
    : [];
  const total = counts.reduce((s, c) => s + c.n, 0);

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="font-semibold mb-3 flex items-center gap-2">
        <span className="text-accent">🎯</span> Analyst consensus
        <span className="text-xs font-normal text-muted">· Finnhub</span>
      </h2>
      {loading ? (
        <p className="text-sm text-muted">Loading analyst data…</p>
      ) : !data ? (
        <p className="text-sm text-muted">
          Not configured (or no coverage for this symbol). Add a free{" "}
          <code className="text-xs">FINNHUB_API_KEY</code> to enable.
        </p>
      ) : (
        <div className="space-y-3">
          {total > 0 ? (
            <>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-2">
                {counts.map(
                  (c) =>
                    c.n > 0 && (
                      <div key={c.label} style={{ width: `${(c.n / total) * 100}%`, background: c.color }} />
                    )
                )}
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {counts.map((c) => (
                  <div key={c.label} className="flex justify-between">
                    <dt className="text-muted">{c.label}</dt>
                    <dd className="font-mono">{c.n}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-xs text-muted">
                {total} analyst{total === 1 ? "" : "s"}
                {data.period ? ` · as of ${data.period}` : ""}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">No recommendation trend for this symbol.</p>
          )}
          {data.targetMean != null && (
            <div className="rounded-lg bg-surface-2 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-muted">Price target (mean)</div>
              <div className="font-mono text-sm mt-0.5">
                {formatPrice(data.targetMean, currency)}
                {data.targetLow != null && data.targetHigh != null && (
                  <span className="text-muted">
                    {" "}
                    ({formatPrice(data.targetLow, currency)} – {formatPrice(data.targetHigh, currency)})
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
