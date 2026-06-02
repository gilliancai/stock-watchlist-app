"use client";

import { useEffect, useState } from "react";
import type { MacroDTO } from "@/lib/types";

// A subtle macro-context strip (rates, yield curve, inflation) from FRED.
// Renders nothing unless a FRED_API_KEY is configured and data comes back.
export default function MacroStrip() {
  const [macro, setMacro] = useState<MacroDTO | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/macro");
        const data = await res.json();
        if (data.configured && data.macro) setMacro(data.macro);
      } catch {
        /* ignore — strip simply stays hidden */
      }
    })();
  }, []);

  if (!macro) return null;

  const inverted = typeof macro.curveSpread === "number" && macro.curveSpread < 0;
  const items: { label: string; value: string; hint?: string }[] = [
    { label: "10Y UST", value: pct(macro.tenYear) },
    { label: "2Y UST", value: pct(macro.twoYear) },
    {
      label: "10Y–2Y",
      value: pct(macro.curveSpread, true),
      hint: inverted ? "inverted" : undefined,
    },
    { label: "Fed funds", value: pct(macro.fedFunds) },
    { label: "CPI YoY", value: pct(macro.cpiYoY) },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">Macro</span>
      {items.map((it) => (
        <span key={it.label} className="flex items-baseline gap-1.5">
          <span className="text-xs text-muted">{it.label}</span>
          <span className={`font-mono ${it.hint === "inverted" ? "text-down" : ""}`}>{it.value}</span>
          {it.hint && <span className="text-[10px] text-down">({it.hint})</span>}
        </span>
      ))}
      {macro.asOf && <span className="ml-auto text-[11px] text-muted/70">FRED · as of {macro.asOf}</span>}
    </div>
  );
}

// FRED rate series are already in percent units; just append "%".
function pct(n: number | null, signed = false): string {
  if (typeof n !== "number") return "—";
  const s = `${n.toFixed(2)}%`;
  return signed && n > 0 ? `+${s}` : s;
}
