"use client";

import { useState } from "react";
import type { CompanyDTO } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";

const EXCHANGES = ["NASDAQ", "NYSE", "HKEX", "LSE", "TSE", "TSX", "ASX", "SSE", "SZSE"];

export default function AddCompanyForm({
  onAdded,
  onClose,
}: {
  onAdded: (c: CompanyDTO) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    symbol: "",
    name: "",
    exchange: "",
    location: "",
    sector: "",
    category: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      onAdded(data as CompanyDTO);
    } catch {
      setError("Network error — is the dev server running?");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Add a company</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground">✕</button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <Field label="Ticker symbol *" hint="e.g. AAPL, 0700.HK, NVDA">
            <input
              required
              value={form.symbol}
              onChange={set("symbol")}
              placeholder="AAPL"
              className="input font-mono uppercase"
              autoFocus
            />
          </Field>
          <Field label="Company name" hint="Leave blank to auto-fill from market data">
            <input value={form.name} onChange={set("name")} placeholder="Apple Inc." className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Listed on">
              <input
                value={form.exchange}
                onChange={set("exchange")}
                placeholder="NASDAQ"
                list="exchange-list"
                className="input"
              />
              <datalist id="exchange-list">
                {EXCHANGES.map((x) => (
                  <option key={x} value={x} />
                ))}
              </datalist>
            </Field>
            <Field label="Location">
              <input value={form.location} onChange={set("location")} placeholder="Cupertino, USA" className="input" />
            </Field>
          </div>
          <Field label="Sector">
            <input value={form.sector} onChange={set("sector")} placeholder="Technology" className="input" />
          </Field>
          <Field label="Value-chain category" hint="Leave on Auto-detect to let AI classify it">
            <select value={form.category} onChange={set("category")} className="input">
              <option value="">✦ Auto-detect (AI)</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.short}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Notable data / your notes">
            <textarea
              value={form.notes}
              onChange={set("notes")}
              placeholder="Why you're watching this company, your thesis, key facts…"
              rows={3}
              className="input resize-none"
            />
          </Field>

          {error && <p className="text-sm text-down">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-surface-2">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Validating…" : "Add to watchlist"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-muted/70 mt-0.5 block">{hint}</span>}
    </label>
  );
}
