"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { InsightDTO } from "@/lib/types";

export default function InsightPanel({ companyId }: { companyId: number }) {
  const [insight, setInsight] = useState<InsightDTO | null>(null);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Load today's cached insight (if any) on mount.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/insights/${companyId}`);
        const data = await res.json();
        setInsight(data.insight ?? null);
        setHasApiKey(Boolean(data.hasApiKey));
      } catch {
        /* ignore */
      } finally {
        setInitialized(true);
      }
    })();
  }, [companyId]);

  const generate = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/insights/${companyId}${force ? "?force=1" : ""}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to generate insight");
        return;
      }
      setInsight(data.insight);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold flex items-center gap-2">
          <span className="text-accent">✦</span> Today&apos;s AI Insight
        </h2>
        {insight && (
          <button
            onClick={() => generate(true)}
            disabled={loading || !hasApiKey}
            className="text-xs text-muted hover:text-accent disabled:opacity-50"
          >
            ↻ Regenerate
          </button>
        )}
      </div>

      {!hasApiKey ? (
        <ApiKeyNotice />
      ) : !initialized ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : insight ? (
        <div className="prose-insight text-sm">
          <ReactMarkdown>{insight.content}</ReactMarkdown>
          <p className="text-[11px] text-muted mt-3">
            Generated {new Date(insight.createdAt).toLocaleString()}
          </p>
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-sm text-muted mb-3">
            No insight generated for today yet. Generate an AI summary of this company, today&apos;s price action,
            notable data, risks, and how to buy it.
          </p>
          <button
            onClick={() => generate(false)}
            disabled={loading}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Generating…" : "Generate today's insight"}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-down mt-3">{error}</p>}
    </section>
  );
}

function ApiKeyNotice() {
  return (
    <div className="rounded-md border border-border bg-surface-2 p-4 text-sm text-muted">
      <p className="font-medium text-foreground mb-1">AI insights need an Anthropic API key</p>
      <p>
        Add <code className="font-mono text-accent">ANTHROPIC_API_KEY=sk-ant-…</code> to your{" "}
        <code className="font-mono">.env</code> file and restart the dev server. Everything else (prices, history,
        notes) works without it.
      </p>
    </div>
  );
}
