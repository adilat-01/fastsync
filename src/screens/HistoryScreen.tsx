import { useMemo, useState } from "react";
import { useSession } from "../session";
import { groupTransactions, monthName, type HistoryEntry } from "../lib/bills";
import { categoryLabel } from "../lib/categories";
import { isPersonalExpense } from "../lib/cushion";
import { formatMoney } from "../lib/format";
import type { Profile, Transaction } from "../types";

export function HistoryScreen() {
  const { transactions, deleteTransactions, members } = useSession();
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim();
    const grouped = groupTransactions(transactions);
    if (!needle) return grouped;
    return grouped.filter((entry) => haystack(entry, members).includes(needle));
  }, [q, transactions, members]);

  async function onDelete(ids: string[], bill: boolean) {
    const message = bill ? "למחוק את החשבון מכל החודשים?" : "למחוק את הרשומה?";
    if (!window.confirm(message)) return;
    setBusyId(ids[0] ?? null);
    try {
      await deleteTransactions(ids);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-6">
      <h1 className="text-2xl font-extrabold text-ink">היסטוריה</h1>
      <input
        className="field mt-4"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="חיפוש לפי תיאור או קטגוריה"
      />
      <ul className="mt-4 space-y-2">
        {filtered.length === 0 && (
          <li className="py-10 text-center text-sm text-stone-500">אין רשומות להצגה</li>
        )}
        {filtered.map((entry) => {
          if (entry.kind === "single") {
            const t = entry.tx;
            return (
              <li className="card flex items-center gap-3 p-3" key={t.id}>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{t.description}</p>
                  <p className="text-xs text-stone-500">
                    {categoryLabel(t.category)} · {t.occurred_on.split("-").reverse().join(".")}
                    {t.recurring_template_id ? " · קבוע" : ""}
                    {payerLabel(t, members)}
                  </p>
                </div>
                <p className={`shrink-0 font-bold tabular-nums ${t.type === "income" ? "text-accent" : "text-ink"}`}>
                  {t.type === "income" ? "+" : "−"}
                  {formatMoney(Number(t.amount))}
                </p>
                <button
                  className="shrink-0 text-xs text-stone-400 hover:text-burn"
                  type="button"
                  disabled={busyId === t.id}
                  onClick={() => onDelete([t.id], false)}
                >
                  מחיקה
                </button>
              </li>
            );
          }

          const ordered = [...entry.txs].sort((a, b) => a.occurred_on.localeCompare(b.occurred_on));
          const total = ordered.reduce((sum, tx) => sum + Number(tx.amount), 0);
          const sample = ordered[0];
          return (
            <li className="card flex items-center gap-3 p-3" key={entry.id}>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{entry.title}</p>
                <p className="text-xs text-stone-500">
                  {categoryLabel(sample.category)} · {entry.span}
                  {payerLabel(sample, members)}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {ordered
                    .map((tx) => `${monthName(tx.occurred_on.slice(0, 7))} ${formatMoney(Number(tx.amount))}`)
                    .join(" · ")}
                </p>
              </div>
              <p className="shrink-0 font-bold tabular-nums text-ink">−{formatMoney(total)}</p>
              <button
                className="shrink-0 text-xs text-stone-400 hover:text-burn"
                type="button"
                disabled={busyId === sample.id}
                onClick={() => onDelete(ordered.map((tx) => tx.id), true)}
              >
                מחיקה
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function haystack(entry: HistoryEntry, members: Profile[]): string {
  if (entry.kind === "single") {
    const t = entry.tx;
    return `${t.description} ${categoryLabel(t.category)} ${t.amount} ${payerLabel(t, members)}`;
  }
  const total = entry.txs.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const months = entry.txs.map((tx) => monthName(tx.occurred_on.slice(0, 7))).join(" ");
  return `${entry.title} ${entry.span} ${months} ${categoryLabel(entry.txs[0].category)} ${total} ${payerLabel(entry.txs[0], members)}`;
}

function payerLabel(t: Transaction, members: Profile[]): string {
  if (t.type !== "expense") return "";
  if (!isPersonalExpense(t)) return " · קופה";
  const name = members.find((m) => m.id === t.paid_by)?.display_name;
  return name ? ` · אישי · ${name}` : " · אישי";
}
