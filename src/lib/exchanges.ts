// Map Yahoo's assorted exchange codes / short names to clean, full exchange
// names for the "Listed" column. Codes are kept in parentheses so the broker
// guide's fuzzy matching (which looks for NYSE/HKEX/ASX/etc.) still works.

const EXCHANGE_NAMES: Record<string, string> = {
  // United States
  nasdaqgs: "Nasdaq",
  nasdaqgm: "Nasdaq",
  nasdaqcm: "Nasdaq",
  nasdaq: "Nasdaq",
  nms: "Nasdaq",
  ngm: "Nasdaq",
  ncm: "Nasdaq",
  nyse: "New York Stock Exchange (NYSE)",
  nyq: "New York Stock Exchange (NYSE)",
  "nyse american": "NYSE American",
  ase: "NYSE American",
  "nyse arca": "NYSE Arca",
  pcx: "NYSE Arca",
  // Canada
  toronto: "Toronto Stock Exchange (TSX)",
  tor: "Toronto Stock Exchange (TSX)",
  // Asia
  hkse: "Hong Kong Stock Exchange (HKEX)",
  kse: "Korea Exchange (KRX)",
  tokyo: "Tokyo Stock Exchange (TSE)",
  jpx: "Tokyo Stock Exchange (TSE)",
  taiwan: "Taiwan Stock Exchange (TWSE)",
  "taipei exchange": "Taipei Exchange (TPEx)",
  shanghai: "Shanghai Stock Exchange (SSE)",
  shenzhen: "Shenzhen Stock Exchange (SZSE)",
  ses: "Singapore Exchange (SGX)",
  asx: "Australian Securities Exchange (ASX)",
  // Europe
  lse: "London Stock Exchange (LSE)",
  xetra: "Xetra (Frankfurt)",
  frankfurt: "Frankfurt Stock Exchange",
  amsterdam: "Euronext Amsterdam",
  paris: "Euronext Paris",
  milan: "Borsa Italiana (Milan)",
  stockholm: "Nasdaq Stockholm",
  swiss: "SIX Swiss Exchange",
  oslo: "Oslo Børs",
};

/** Clean, full exchange name for a raw Yahoo exchange value (unknown → as-is). */
export function prettyExchange(raw: string | null | undefined): string {
  if (!raw) return "—";
  const key = raw.trim().toLowerCase();
  return EXCHANGE_NAMES[key] ?? raw.trim();
}
