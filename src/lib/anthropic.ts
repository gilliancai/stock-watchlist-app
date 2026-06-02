import Anthropic from "@anthropic-ai/sdk";
import type { NormalizedQuote, ProfileInfo } from "./yahoo";
import { getBrokerGuide } from "./brokers";
import { CATEGORIES, isValidCategory } from "./categories";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";
// Classification is a short, cheap task — use Haiku unless overridden.
const CLASSIFY_MODEL = process.env.ANTHROPIC_CLASSIFY_MODEL ?? "claude-haiku-4-5-20251001";

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// Stable, cacheable system prompt — Claude caches this prefix across calls so
// repeated daily generations are cheaper.
const SYSTEM_PROMPT = `You are a concise, level-headed equity research assistant for a personal investing watchlist app.
For the company you're given, write a short daily insight in GitHub-flavored markdown with these sections, in order:

### Snapshot
1-2 plain-English sentences on what the company does and why it matters.

### Today's move
Interpret the latest price action (price, day change %, where it sits in its 52-week range). Be factual, not hyperbolic.

### Notable data
3-5 bullet points of the most decision-relevant facts (valuation context, market cap scale, sector position, anything notable). Use the data provided; do not invent precise figures you weren't given.

### Risks to watch
2-3 bullet points of key risks or things to monitor.

### Where to buy
One short paragraph on how a retail investor would typically buy this stock, grounded in the broker guidance provided.

Rules:
- This is educational information, not personalized financial advice. Include a one-line disclaimer at the very end.
- Keep the whole thing under ~250 words.
- Never fabricate specific numbers (earnings dates, exact ratios) that are not provided to you. Speak qualitatively when you lack data.`;

type InsightInput = {
  company: { name: string; symbol: string; exchange: string; location: string; sector: string | null; notes: string | null };
  quote: NormalizedQuote | null;
  profile: ProfileInfo | null;
};

function buildUserPrompt({ company, quote, profile }: InsightInput): string {
  const guide = getBrokerGuide(company.exchange);
  const fmt = (n: number | null | undefined, opts?: Intl.NumberFormatOptions) =>
    typeof n === "number" ? n.toLocaleString("en-US", opts) : "n/a";

  const lines = [
    `Company: ${company.name} (${company.symbol})`,
    `Listed on: ${company.exchange}`,
    `Headquarters / location: ${company.location}`,
    `Sector: ${company.sector ?? profile?.sector ?? "n/a"}`,
    profile?.industry ? `Industry: ${profile.industry}` : null,
    company.notes ? `My personal notes/thesis: ${company.notes}` : null,
    profile?.summary ? `Business summary: ${profile.summary.slice(0, 700)}` : null,
    "",
    "Latest market data:",
    quote
      ? [
          `- Price: ${fmt(quote.price)} ${quote.currency ?? ""}`.trim(),
          `- Day change: ${fmt(quote.change)} (${quote.changePercent.toFixed(2)}%)`,
          `- Day range: ${fmt(quote.dayLow)} - ${fmt(quote.dayHigh)}`,
          `- 52-week range: ${fmt(quote.week52Low)} - ${fmt(quote.week52High)}`,
          `- Market cap: ${fmt(quote.marketCap)} ${quote.currency ?? ""}`.trim(),
        ].join("\n")
      : "- (live market data unavailable right now)",
    "",
    `Broker guidance for ${guide.market}: ${guide.brokers.join(", ")}. ${guide.note}`,
    "",
    "Write today's insight now.",
  ];
  return lines.filter((l) => l !== null).join("\n");
}

/** Generate a markdown insight for a company. Throws if no API key is configured. */
export async function generateInsight(input: InsightInput): Promise<string> {
  if (!hasApiKey()) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: buildUserPrompt(input) }],
  });

  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

// ---------------------------------------------------------------------------
// Daily watchlist digest
// ---------------------------------------------------------------------------

const DIGEST_SYSTEM = `You are a concise, level-headed market analyst writing a SHORT daily briefing for a personal investing watchlist focused on the AI / semiconductor value chain.

You are given pre-computed aggregate stats for the watchlist (breadth, biggest movers, upcoming earnings, analyst tilt). Write a brief in GitHub-flavored markdown with these sections, in order:

### Market tone
1-2 sentences on the overall posture of the watchlist today (breadth + average move). Factual, not hyperbolic.

### What moved
3-4 bullets on the notable gainers/losers given. Group by theme where you can (e.g. "memory names", "power/electrification"). Only reference tickers actually provided.

### On the radar
2-3 bullets on what to watch — upcoming earnings in the list, and where the analyst tilt is notable.

Rules:
- Use ONLY the numbers provided. Never invent prices, percentages, dates, or facts you weren't given.
- This is educational information, not personalized financial advice. End with a one-line disclaimer.
- Keep the whole thing under ~200 words. Be specific and skimmable.`;

export type DigestInput = {
  date: string;
  total: number;
  priced: number;
  up: number;
  down: number;
  avgChange: number | null;
  gainers: { symbol: string; name: string; changePercent: number }[];
  losers: { symbol: string; name: string; changePercent: number }[];
  earningsThisWeek: { symbol: string; name: string; date: string }[];
  analystCovered: number;
  analystBuyRated: number;
};

function buildDigestPrompt(d: DigestInput): string {
  const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
  const movers = (rows: DigestInput["gainers"]) =>
    rows.length ? rows.map((r) => `  - ${r.name} (${r.symbol}): ${pct(r.changePercent)}`).join("\n") : "  - (none)";
  return [
    `Date: ${d.date}`,
    `Watchlist size: ${d.total} companies (${d.priced} with live prices today)`,
    `Breadth: ${d.up} up, ${d.down} down${d.avgChange != null ? `, average ${pct(d.avgChange)}` : ""}`,
    "",
    "Top gainers today:",
    movers(d.gainers),
    "Top losers today:",
    movers(d.losers),
    "",
    d.earningsThisWeek.length
      ? `Earnings in the next 7 days:\n${d.earningsThisWeek
          .map((e) => `  - ${e.name} (${e.symbol}) on ${e.date}`)
          .join("\n")}`
      : "Earnings in the next 7 days: none",
    "",
    d.analystCovered > 0
      ? `Analyst tilt: ${d.analystBuyRated} of ${d.analystCovered} covered names are buy-rated (${Math.round(
          (d.analystBuyRated / d.analystCovered) * 100
        )}%).`
      : "Analyst tilt: no coverage data.",
    "",
    "Write today's briefing now.",
  ].join("\n");
}

/** Generate a markdown daily digest for the watchlist. Throws if no API key. */
export async function generateDigest(input: DigestInput): Promise<string> {
  if (!hasApiKey()) throw new Error("ANTHROPIC_API_KEY is not set");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [{ type: "text", text: DIGEST_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: buildDigestPrompt(input) }],
  });

  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

type ClassifyInput = {
  name: string;
  symbol: string;
  exchange: string;
  sector: string | null;
  profile: ProfileInfo | null;
};

const CLASSIFY_SYSTEM = `You sort companies into exactly one layer of the AI / semiconductor value chain.

This watchlist tracks companies by the ROLE THEY PLAY IN THE AI / SEMICONDUCTOR BUILD-OUT — which may be a secondary business line rather than the company's largest revenue source. A company best known for food, chemicals, or industrial products can belong in an upstream layer if it supplies critical inputs used to make or package chips. For example, Ajinomoto is famous for food but is on such a watchlist for ABF (Ajinomoto Build-up Film), a packaging-substrate material → it belongs in the materials/chemicals layer, not consumer end applications. Likewise specialty gases, photoresists, wafers, and advanced-packaging materials all sit in the raw-materials/chemicals layer.

Choose the single best-fit layer from this list (respond with ONLY its id — lowercase, no other text):

${CATEGORIES.map((c) => `${c.id} — ${c.label}`).join("\n")}

Rules:
- Classify by the company's most significant role in the semiconductor / AI hardware supply chain, EVEN IF that is not its primary business.
- Only fall back to the company's primary business when it has no meaningful role in this supply chain.
- Respond with just the id (e.g. "chip-designers"). If truly none fit, respond "none".`;

/**
 * Classify a company into one of the value-chain categories. Returns a category
 * id, or null if no key is configured or no category fits. Never throws.
 */
export async function classifyCompany(input: ClassifyInput): Promise<string | null> {
  if (!hasApiKey()) return null;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const facts = [
    `Company: ${input.name} (${input.symbol})`,
    `Listed on: ${input.exchange}`,
    input.sector ? `Sector: ${input.sector}` : input.profile?.sector ? `Sector: ${input.profile.sector}` : null,
    input.profile?.industry ? `Industry: ${input.profile.industry}` : null,
    input.profile?.summary ? `Business: ${input.profile.summary.slice(0, 600)}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const message = await client.messages.create({
      model: CLASSIFY_MODEL,
      max_tokens: 16,
      system: [{ type: "text", text: CLASSIFY_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: `${facts}\n\nWhich layer?` }],
    });
    const raw = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim()
      .toLowerCase();
    // Be lenient: the model may wrap the id in punctuation or a sentence.
    const match = CATEGORIES.find((c) => raw.includes(c.id));
    return match && isValidCategory(match.id) ? match.id : null;
  } catch {
    return null;
  }
}
