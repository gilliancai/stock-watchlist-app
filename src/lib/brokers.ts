// Lightweight "where to buy" guidance keyed by exchange. This is suggestion-level
// (brokers that generally provide access to a given market), not brokerage
// integration. Used both to render the UI section and to ground the AI prompt.

export type BrokerGuide = {
  market: string;
  brokers: string[];
  note: string;
};

const GUIDES: Record<string, BrokerGuide> = {
  NASDAQ: {
    market: "United States (NASDAQ)",
    brokers: ["Interactive Brokers", "Fidelity", "Charles Schwab", "Robinhood", "E*TRADE"],
    note: "Widely available through any US brokerage and most international brokers offering US-market access.",
  },
  NYSE: {
    market: "United States (NYSE)",
    brokers: ["Interactive Brokers", "Fidelity", "Charles Schwab", "Robinhood", "E*TRADE"],
    note: "Widely available through any US brokerage and most international brokers offering US-market access.",
  },
  HKEX: {
    market: "Hong Kong (HKEX)",
    brokers: ["Interactive Brokers", "Futu/moomoo", "Tiger Brokers", "HSBC", "Boom Securities"],
    note: "Trade via brokers with Hong Kong market access; mind board-lot sizes and HKD settlement.",
  },
  LSE: {
    market: "London (LSE)",
    brokers: ["Interactive Brokers", "Hargreaves Lansdown", "AJ Bell", "Trading 212", "Freetrade"],
    note: "Available through UK brokers and international brokers with LSE access; trades settle in GBP/GBX.",
  },
  TSE: {
    market: "Tokyo (TSE)",
    brokers: ["Interactive Brokers", "Rakuten Securities", "SBI Securities", "Monex"],
    note: "Access via brokers supporting the Tokyo Stock Exchange; JPY settlement and board lots apply.",
  },
  SSE: {
    market: "Shanghai (SSE)",
    brokers: ["Domestic Chinese brokers", "Stock Connect (via HK brokers)", "Interactive Brokers (eligible accounts)"],
    note: "Mainland A-shares are access-restricted; foreign investors typically use Stock Connect.",
  },
  SZSE: {
    market: "Shenzhen (SZSE)",
    brokers: ["Domestic Chinese brokers", "Stock Connect (via HK brokers)", "Interactive Brokers (eligible accounts)"],
    note: "Mainland A-shares are access-restricted; foreign investors typically use Stock Connect.",
  },
  TSX: {
    market: "Canada (TSX)",
    brokers: ["Interactive Brokers", "Questrade", "Wealthsimple", "TD Direct Investing"],
    note: "Available through Canadian brokers and international brokers with TSX access; CAD settlement.",
  },
  ASX: {
    market: "Australia (ASX)",
    brokers: ["Interactive Brokers", "CommSec", "Stake", "SelfWealth"],
    note: "Trade via Australian brokers or international brokers with ASX access; AUD settlement.",
  },
};

const DEFAULT_GUIDE: BrokerGuide = {
  market: "International",
  brokers: ["Interactive Brokers", "Saxo Bank", "your local full-service brokerage"],
  note: "A global broker such as Interactive Brokers typically provides access to this listing. Confirm market support and FX/settlement currency before trading.",
};

/** Best-effort broker guidance for an exchange label (case-insensitive, fuzzy). */
export function getBrokerGuide(exchange: string): BrokerGuide {
  const key = exchange.trim().toUpperCase();
  if (GUIDES[key]) return GUIDES[key];
  // Fuzzy: match common aliases contained in the provided exchange string.
  for (const [code, guide] of Object.entries(GUIDES)) {
    if (key.includes(code)) return guide;
  }
  if (key.includes("NEW YORK")) return GUIDES.NYSE;
  if (key.includes("NASDAQ")) return GUIDES.NASDAQ;
  if (key.includes("HONG KONG")) return GUIDES.HKEX;
  if (key.includes("LONDON")) return GUIDES.LSE;
  if (key.includes("TOKYO")) return GUIDES.TSE;
  return DEFAULT_GUIDE;
}
