"use client";

import { useMemo, useState } from "react";
import type { HistoryPoint } from "@/lib/types";

const RANGES = [
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
];

export default function PriceChart({ history, currency }: { history: HistoryPoint[]; currency: string | null }) {
  const [rangeDays, setRangeDays] = useState(180);

  const data = useMemo(() => history.slice(-rangeDays), [history, rangeDays]);

  if (!history.length) {
    return <p className="text-sm text-muted">Price history unavailable.</p>;
  }

  const w = 720;
  const h = 220;
  const pad = { top: 10, right: 8, bottom: 20, left: 48 };
  const closes = data.map((d) => d.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;

  const x = (i: number) =>
    pad.left + (i / Math.max(data.length - 1, 1)) * (w - pad.left - pad.right);
  const y = (v: number) =>
    pad.top + (1 - (v - min) / span) * (h - pad.top - pad.bottom);

  const line = data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(d.close).toFixed(1)}`).join(" ");
  const area = `${line} L ${x(data.length - 1).toFixed(1)} ${h - pad.bottom} L ${x(0).toFixed(1)} ${h - pad.bottom} Z`;

  const up = data.length > 1 && data[data.length - 1].close >= data[0].close;
  const stroke = up ? "var(--up)" : "var(--down)";
  const fmt = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 2 });

  return (
    <div>
      <div className="flex justify-end gap-1 mb-2">
        {RANGES.map((r) => (
          <button
            key={r.label}
            onClick={() => setRangeDays(r.days)}
            className={`rounded px-2 py-0.5 text-xs transition ${
              rangeDays === r.days ? "bg-accent text-background" : "text-muted hover:text-foreground"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Price history chart">
        <defs>
          <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* horizontal gridlines + y labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const val = max - t * span;
          const yy = pad.top + t * (h - pad.top - pad.bottom);
          return (
            <g key={t}>
              <line x1={pad.left} y1={yy} x2={w - pad.right} y2={yy} stroke="var(--border)" strokeWidth="1" />
              <text x={pad.left - 6} y={yy + 3} textAnchor="end" fontSize="10" fill="var(--muted)">
                {fmt(val)}
              </text>
            </g>
          );
        })}
        <path d={area} fill="url(#fill)" />
        <path d={line} fill="none" stroke={stroke} strokeWidth="1.6" />
        {/* date endpoints */}
        <text x={pad.left} y={h - 6} fontSize="10" fill="var(--muted)">
          {data[0]?.date}
        </text>
        <text x={w - pad.right} y={h - 6} fontSize="10" fill="var(--muted)" textAnchor="end">
          {data[data.length - 1]?.date}
        </text>
      </svg>
      <p className="text-xs text-muted text-right">Adjusted close · {currency ?? "local currency"}</p>
    </div>
  );
}
