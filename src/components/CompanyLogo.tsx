"use client";

import { useState } from "react";

// Initials from a company name: first letters of up to two significant words,
// skipping corporate-suffix noise ("Inc", "Corp", …). Falls back to the symbol.
function initials(name: string, symbol: string): string {
  const skip = new Set(["inc", "corp", "co", "ltd", "plc", "the", "group", "holdings", "company", "&"]);
  const words = name
    .replace(/[.,]/g, "")
    .split(/\s+/)
    .filter((w) => w && !skip.has(w.toLowerCase()));
  const pick = words.length ? words : [symbol];
  return (pick[0][0] + (pick[1]?.[0] ?? "")).toUpperCase();
}

// Deterministic hue so each company gets a stable, distinct fallback color.
function hue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

export default function CompanyLogo({
  name,
  symbol,
  domain,
  size = 36,
}: {
  name: string;
  symbol: string;
  domain: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = domain && !failed;

  if (showImage) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white"
        style={{ width: size, height: size }}
      >
        {/* Third-party icon CDN; plain img keeps it un-optimized + lets us fall back on error. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://icons.duckduckgo.com/ip3/${domain}.ico`}
          alt={`${name} logo`}
          width={size}
          height={size}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain p-1"
        />
      </span>
    );
  }

  const h = hue(symbol || name);
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-lg border border-border font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        background: `linear-gradient(135deg, hsl(${h} 55% 42%), hsl(${(h + 40) % 360} 55% 30%))`,
      }}
    >
      {initials(name, symbol)}
    </span>
  );
}
