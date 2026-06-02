"use client";

import { useEffect, useState } from "react";
import type { PurchaseDTO } from "@/lib/types";
import { computePosition } from "@/lib/position";
import { formatPrice, formatSignedPrice, formatSignedPercent, todayKey } from "@/lib/format";

export default function Holdings({
  companyId,
  currentPrice,
  currency,
}: {
  companyId: number;
  currentPrice: number | null;
  currency: string | null;
}) {
  const [purchases, setPurchases] = useState<PurchaseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/companies/${companyId}/purchases`);
        const data = await res.json();
        setPurchases(Array.isArray(data) ? data : []);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, [companyId]);

  const pos = computePosition(purchases, currentPrice, currency);

  const addLot = (p: PurchaseDTO) => {
    setPurchases((prev) =>
      [...prev, p].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id))
    );
    setShowForm(false);
  };

  const removeLot = async (id: number) => {
    if (!confirm("Remove this purchase?")) return;
    await fetch(`/api/purchases/${id}`, { method: "DELETE" });
    setPurchases((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold flex items-center gap-2">
          <span className="text-accent">💼</span> Your position
        </h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-background hover:opacity-90 transition"
          >
            + Add purchase
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading position…</p>
      ) : purchases.length === 0 && !showForm ? (
        <p className="text-sm text-muted italic">
          No purchases recorded yet. Add a buy to track your shares and live profit/loss.
        </p>
      ) : (
        <>
          {purchases.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
              <Stat label="Shares" value={fmtShares(pos.shares)} />
              <Stat label="Avg cost" value={formatPrice(pos.avgPrice, currency)} />
              <Stat label="Market value" value={pos.marketValue != null ? formatPrice(pos.marketValue, currency) : "—"} />
              <Stat
                label="Unrealized P/L"
                value={
                  pos.gain != null
                    ? `${formatSignedPrice(pos.gain, currency)} (${formatSignedPercent(pos.gainPercent!)})`
                    : "—"
                }
                tone={pos.gain == null ? undefined : pos.gain >= 0 ? "up" : "down"}
              />
            </div>
          )}

          {purchases.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-border">
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium text-right">Shares</th>
                    <th className="px-3 py-2 font-medium text-right">Buy price</th>
                    <th className="px-3 py-2 font-medium text-right">Cost</th>
                    <th className="px-3 py-2 font-medium text-right">P/L</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p) => {
                    const cost = p.shares * p.pricePerShare;
                    const gain = currentPrice != null ? p.shares * currentPrice - cost : null;
                    return (
                      <tr key={p.id} className="border-b border-border/60 last:border-0">
                        <td className="px-3 py-2">
                          <div>{p.date}</div>
                          {p.note && <div className="text-xs text-muted">{p.note}</div>}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{fmtShares(p.shares)}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatPrice(p.pricePerShare, currency)}</td>
                        <td className="px-3 py-2 text-right font-mono text-muted">{formatPrice(cost, currency)}</td>
                        <td className={`px-3 py-2 text-right font-mono ${gain == null ? "text-muted" : gain >= 0 ? "text-up" : "text-down"}`}>
                          {gain != null ? formatSignedPrice(gain, currency) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => removeLot(p.id)}
                            className="text-muted hover:text-down transition text-xs"
                            title="Remove purchase"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showForm && <AddPurchaseForm companyId={companyId} onAdded={addLot} onCancel={() => setShowForm(false)} />}
    </section>
  );
}

function AddPurchaseForm({
  companyId,
  onAdded,
  onCancel,
}: {
  companyId: number;
  onAdded: (p: PurchaseDTO) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(todayKey());
  const [shares, setShares] = useState("");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/purchases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, shares: Number(shares), pricePerShare: Number(price), note }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save purchase");
        return;
      }
      onAdded(data as PurchaseDTO);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 rounded-lg border border-border bg-surface-2/40 p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="text-xs font-medium text-muted">Trade date</span>
          <input type="date" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value)} required className="input" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted">Shares</span>
          <input
            type="number"
            step="any"
            min="0"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            placeholder="2"
            required
            className="input font-mono"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted">Price per share</span>
          <input
            type="number"
            step="any"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="64.61"
            required
            className="input font-mono"
          />
        </label>
      </div>
      <label className="block">
        <span className="text-xs font-medium text-muted">Note (optional)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. opening position" className="input" />
      </label>

      {error && <p className="text-sm text-down">{error}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface-2">
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save purchase"}
        </button>
      </div>
    </form>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  const toneClass = tone === "up" ? "text-up" : tone === "down" ? "text-down" : "";
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className={`font-mono text-sm mt-0.5 ${toneClass}`}>{value}</div>
    </div>
  );
}

function fmtShares(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}
