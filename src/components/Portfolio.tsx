"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PortfolioHoldingDTO, PortfolioTotalDTO } from "@/lib/types";
import { formatPrice, formatSignedPrice, formatSignedPercent } from "@/lib/format";

export default function Portfolio({ reloadKey = 0 }: { reloadKey?: number }) {
  const [holdings, setHoldings] = useState<PortfolioHoldingDTO[]>([]);
  const [totals, setTotals] = useState<PortfolioTotalDTO[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/portfolio");
        const data = await res.json();
        if (cancelled) return;
        setHoldings(Array.isArray(data.holdings) ? data.holdings : []);
        setTotals(Array.isArray(data.totals) ? data.totals : []);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Stay out of the way until we know there's something to show.
  if (!loaded || holdings.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-surface p-5 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="font-semibold flex items-center gap-2">
          <span className="text-accent">💼</span> Portfolio
        </h2>
        <div className="flex flex-wrap gap-2">
          {totals.map((t) => (
            <TotalChip key={t.currency} total={t} />
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-border">
              <th className="px-3 py-2 font-medium">Company</th>
              <th className="px-3 py-2 font-medium text-right">Shares</th>
              <th className="px-3 py-2 font-medium text-right">Avg cost</th>
              <th className="px-3 py-2 font-medium">Bought</th>
              <th className="px-3 py-2 font-medium text-right">Price</th>
              <th className="px-3 py-2 font-medium text-right">Mkt value</th>
              <th className="px-3 py-2 font-medium text-right">P/L</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => {
              const tone = h.gain == null ? "text-muted" : h.gain >= 0 ? "text-up" : "text-down";
              return (
                <tr key={h.companyId} className="border-b border-border/60 last:border-0 hover:bg-surface-2/40 transition">
                  <td className="px-3 py-2">
                    <Link href={`/companies/${h.companyId}`} className="group">
                      <div className="font-medium group-hover:text-accent transition">{h.name}</div>
                      <div className="font-mono text-xs text-muted">{h.symbol}</div>
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{fmtShares(h.shares)}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatPrice(h.avgPrice, h.currency)}</td>
                  <td className="px-3 py-2 text-muted whitespace-nowrap">{boughtLabel(h)}</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {h.currentPrice != null ? formatPrice(h.currentPrice, h.currency) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-muted">
                    {h.marketValue != null ? formatPrice(h.marketValue, h.currency) : "—"}
                  </td>
                  <td className={`px-3 py-2 text-right font-mono ${tone}`}>
                    {h.gain != null ? (
                      <>
                        {formatSignedPrice(h.gain, h.currency)}
                        {h.gainPercent != null && (
                          <span className="block text-xs">{formatSignedPercent(h.gainPercent)}</span>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TotalChip({ total }: { total: PortfolioTotalDTO }) {
  const tone = total.gain >= 0 ? "text-up" : "text-down";
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-1.5 text-right">
      <div className="text-[11px] uppercase tracking-wide text-muted">
        {total.currency} · value {formatPrice(total.marketValue, total.currency)}
      </div>
      <div className={`font-mono text-sm ${tone}`}>
        {formatSignedPrice(total.gain, total.currency)}
        {total.gainPercent != null && ` (${formatSignedPercent(total.gainPercent)})`}
      </div>
    </div>
  );
}

function boughtLabel(h: PortfolioHoldingDTO): string {
  if (h.lotCount > 1) return `${h.lotCount} buys`;
  return h.lastBuyDate ?? "—";
}

function fmtShares(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}
