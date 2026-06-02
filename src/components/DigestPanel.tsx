"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { DigestDTO } from "@/lib/types";

// Daily AI briefing across the whole watchlist. Mirrors InsightPanel: loads
// today's cached digest on mount, generates on demand. Hidden if no API key.
export default function DigestPanel() {
  const [digest, setDigest] = useState<DigestDTO | null>(null);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/digest");
        const data = await res.json();
        setDigest(data.digest ?? null);
        setHasApiKey(Boolean(data.hasApiKey));
      } catch {
        /* ignore */
      } finally {
        setInitialized(true);
      }
    })();
  }, []);

  const generate = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/digest${force ? "?force=1" : ""}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to generate digest");
        return;
      }
      setDigest(data.digest);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  // No key, or nothing generated yet and still loading the cached check — stay quiet.
  if (!hasApiKey) return null;
  if (!initialized) return null;

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <span className="text-accent">✦</span> Daily briefing
          {digest && <span className="text-xs font-normal text-muted">· {digest.date}</span>}
        </h2>
        <div className="flex items-center gap-3">
          {digest && (
            <>
              <button
                onClick={() => generate(true)}
                disabled={loading}
                className="text-xs text-muted hover:text-accent disabled:opacity-50"
              >
                {loading ? "…" : "↻ Refresh"}
              </button>
              <button
                onClick={() => setCollapsed((c) => !c)}
                className="text-xs text-muted hover:text-accent"
              >
                {collapsed ? "Show" : "Hide"}
              </button>
            </>
          )}
        </div>
      </div>

      {!digest ? (
        <div className="mt-3 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-muted">
            Get an AI briefing of today&apos;s watchlist — market tone, what moved, and what&apos;s on the radar.
          </p>
          <button
            onClick={() => generate(false)}
            disabled={loading}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Generating…" : "Generate briefing"}
          </button>
        </div>
      ) : (
        !collapsed && (
          <div className="prose-insight mt-3 text-sm">
            <ReactMarkdown>{digest.content}</ReactMarkdown>
            <p className="mt-3 text-[11px] text-muted">Generated {new Date(digest.createdAt).toLocaleString()}</p>
          </div>
        )
      )}

      {error && <p className="mt-3 text-sm text-down">{error}</p>}
    </section>
  );
}
