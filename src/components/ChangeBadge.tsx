export default function ChangeBadge({ change, percent }: { change: number; percent: number }) {
  const up = change >= 0;
  const sign = up ? "+" : "";
  return (
    <span className={`font-mono ${up ? "text-up" : "text-down"}`}>
      {up ? "▲" : "▼"} {sign}
      {change.toFixed(2)} ({sign}
      {percent.toFixed(2)}%)
    </span>
  );
}
