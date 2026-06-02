"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { AnalystDTO, CompanyDTO, EarningsDTO, QuoteDTO } from "@/lib/types";
import { consensus } from "@/lib/analyst";

// At-a-glance summary of the whole watchlist, computed from already-loaded data.
export default function WatchlistPulse({
  companies,
  quotes,
  earnings,
  analysts,
}: {
  companies: CompanyDTO[];
  quotes: Record<string, QuoteDTO>;
  earnings: Record<string, EarningsDTO>;
  analysts: Record<string, AnalystDTO | null>;
}) {
  // Capture "now" once at mount — impure calls belong in a lazy initializer,
  // not inside the useMemo below.
  const [now] = useState(() => Date.now());

  const pulse = useMemo(() => {
    const withQuote = companies
      .map((c) => ({ c, q: quotes[c.symbol] }))
      .filter((x): x is { c: CompanyDTO; q: QuoteDTO } => Boolean(x.q));

    const up = withQuote.filter((x) => x.q.changePercent > 0).length;
    const down = withQuote.filter((x) => x.q.changePercent < 0).length;
    const avg =
      withQuote.length > 0
        ? withQuote.reduce((s, x) => s + x.q.changePercent, 0) / withQuote.length
        : null;

    const byMove = [...withQuote].sort((a, b) => b.q.changePercent - a.q.changePercent);
    const gainers = byMove.slice(0, 3);
    const losers = byMove.slice(-3).reverse();

    // Earnings within the next 7 days.
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const soon = companies
      .map((c) => ({ c, e: earnings[c.symbol] }))
      .filter((x) => x.e?.date)
      .map((x) => ({ c: x.c, date: new Date(`${x.e!.date}T00:00:00`) }))
      .filter((x) => {
        const d = x.date.getTime() - now;
        return d >= -24 * 60 * 60 * 1000 && d <= weekMs;
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    // Analyst tilt across covered names.
    let covered = 0;
    let buyRated = 0;
    for (const c of companies) {
      const cons = consensus(analysts[c.symbol]);
      if (!cons) continue;
      covered++;
      if (cons.tone === "up") buyRated++;
    }

    return {
      loaded: withQuote.length,
      total: companies.length,
      up,
      down,
      avg,
      gainers,
      losers,
      soon,
      covered,
      buyRated,
    };
  }, [companies, quotes, earnings, analysts, now]);

  if (pulse.loaded === 0) return null; // nothing to summarize yet

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {/* Breadth */}
      <Card title="Today's breadth">
        <div className="flex items-baseline gap-3">
          <span className="text-up">▲ {pulse.up}</span>
          <span className="text-down">▼ {pulse.down}</span>
        </div>
        {pulse.avg != null && (
          <div className={`mt-1 font-mono text-sm ${pulse.avg >= 0 ? "text-up" : "text-down"}`}>
            avg {pulse.avg >= 0 ? "+" : ""}
            {pulse.avg.toFixed(2)}%
          </div>
        )}
        <div className="mt-1 text-[11px] text-muted/70">{pulse.loaded} of {pulse.total} priced</div>
      </Card>

      {/* Movers */}
      <Card title="Today's movers">
        <div className="space-y-0.5 text-xs">
          {pulse.gainers.slice(0, 2).map((x) => (
            <Mover key={x.c.id} c={x.c} pct={x.q.changePercent} />
          ))}
          {pulse.losers.slice(0, 2).map((x) => (
            <Mover key={x.c.id} c={x.c} pct={x.q.changePercent} />
          ))}
        </div>
      </Card>

      {/* Earnings this week */}
      <Card title="Earnings this week">
        {pulse.soon.length === 0 ? (
          <div className="text-sm text-muted">None in the next 7 days</div>
        ) : (
          <>
            <div className="text-xl font-semibold">{pulse.soon.length}</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {pulse.soon.slice(0, 6).map((x) => (
                <Link
                  key={x.c.id}
                  href={`/companies/${x.c.id}`}
                  className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-muted hover:text-accent"
                >
                  {x.c.symbol}
                </Link>
              ))}
              {pulse.soon.length > 6 && <span className="text-[11px] text-muted">+{pulse.soon.length - 6}</span>}
            </div>
          </>
        )}
      </Card>

      {/* Analyst tilt */}
      <Card title="Analyst tilt">
        {pulse.covered === 0 ? (
          <div className="text-sm text-muted">No coverage loaded</div>
        ) : (
          <>
            <div className="font-mono text-xl font-semibold text-up">
              {Math.round((pulse.buyRated / pulse.covered) * 100)}%
            </div>
            <div className="mt-1 text-[11px] text-muted/70">
              buy-rated · {pulse.covered} covered
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted">{title}</div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Mover({ c, pct }: { c: CompanyDTO; pct: number }) {
  return (
    <Link href={`/companies/${c.id}`} className="flex items-center justify-between gap-2 hover:text-accent">
      <span className="truncate font-mono">{c.symbol}</span>
      <span className={`font-mono ${pct >= 0 ? "text-up" : "text-down"}`}>
        {pct >= 0 ? "+" : ""}
        {pct.toFixed(1)}%
      </span>
    </Link>
  );
}
