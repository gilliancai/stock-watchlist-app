// Brand mark for the app: a gradient "squircle" badge holding an ascending
// bar chart with an upward trend arrow sweeping across it. Pure SVG so it stays
// crisp at any size and themes cleanly on the dark UI.
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="Stock Watchlist logo"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Badge background — deep navy with a faint top sheen */}
        <linearGradient id="logo-badge" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1b2740" />
          <stop offset="1" stopColor="#0a0e16" />
        </linearGradient>
        {/* Bars — blue → cyan (cool), so the green arrow above reads as a separate element */}
        <linearGradient id="logo-bars" x1="0" y1="40" x2="0" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1d4ed8" />
          <stop offset="1" stopColor="#38bdf8" />
        </linearGradient>
        {/* Trend arrow — bright green → lime, the hero element */}
        <linearGradient id="logo-line" x1="7" y1="26" x2="42" y2="7" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="1" stopColor="#bef264" />
        </linearGradient>
      </defs>

      {/* Rounded badge + 1px inner ring for polish */}
      <rect x="1" y="1" width="46" height="46" rx="13" fill="url(#logo-badge)" />
      <rect x="1.5" y="1.5" width="45" height="45" rx="12.5" stroke="#ffffff" strokeOpacity="0.08" />

      {/* Ascending bars sit in the lower band; their tops stay clear of the arrow above. */}
      <g fill="url(#logo-bars)">
        <rect x="9" y="30" width="6" height="9" rx="2" />
        <rect x="18" y="26" width="6" height="13" rx="2" />
        <rect x="27" y="22" width="6" height="17" rx="2" />
        <rect x="36" y="18" width="6" height="21" rx="2" />
      </g>

      {/* Trend arrow, floating ABOVE the bars with a clear gap. Drawn first as a dark
          "knockout" halo so it stays crisply separated from the bars at any size,
          then the bright gradient on top, ending in a clear chevron arrowhead. */}
      <g stroke="#0a0e16" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M8 23 L18 18 L28 13 L40 7" />
        <path d="M31 7 L41 6 L40 16" />
      </g>
      <g stroke="url(#logo-line)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M8 23 L18 18 L28 13 L40 7" />
        <path d="M31 7 L41 6 L40 16" />
      </g>
      {/* Vertex dots along the arrow */}
      <g fill="#ffffff">
        <circle cx="8" cy="23" r="1.7" />
        <circle cx="18" cy="18" r="1.7" />
        <circle cx="28" cy="13" r="1.7" />
      </g>
    </svg>
  );
}

// Mark + wordmark, used in the header. The accent half of the name picks up
// the brand gradient for a bit of flair.
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="text-lg font-bold tracking-tight leading-none">
        <span className="text-foreground">Stock</span>
        <span className="bg-gradient-to-r from-accent to-up bg-clip-text text-transparent"> Watchlist</span>
      </span>
    </span>
  );
}
