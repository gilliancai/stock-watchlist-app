import type { HistoryPoint } from "@/lib/types";
import { netChangePercent } from "@/lib/format";

// Tiny inline trend line (no axes/labels) for use inside a table cell.
// Colored green/red by net direction over the period.
export default function Sparkline({
  data,
  width = 110,
  height = 32,
}: {
  data: HistoryPoint[];
  width?: number;
  height?: number;
}) {
  if (!data || data.length < 2) {
    return <span className="text-xs text-muted">—</span>;
  }

  const pad = 2;
  const closes = data.map((d) => d.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;

  const x = (i: number) => pad + (i / (data.length - 1)) * (width - 2 * pad);
  const y = (v: number) => pad + (1 - (v - min) / span) * (height - 2 * pad);

  const line = data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(d.close).toFixed(1)}`).join(" ");
  const pct = netChangePercent(data) ?? 0;
  const up = pct >= 0;
  const stroke = up ? "var(--up)" : "var(--down)";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={`12-month trend ${up ? "up" : "down"} ${pct.toFixed(1)}%`}
      className="inline-block align-middle"
    >
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
