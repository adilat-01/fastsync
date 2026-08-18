import { useMemo, useState } from "react";
import { useSession } from "../session";
import { categoryLabel } from "../lib/categories";
import { isPersonalExpense } from "../lib/cushion";
import { formatMoney } from "../lib/format";
import type { Profile, Transaction } from "../types";

export function HistoryScreen() {
  const { transactions, deleteTransaction, members } = useSession();
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim();
    return transactions.filter((t) => {
      if (!needle) return true;
      const hay = `${t.description} ${categoryLabel(t.category)} ${t.amount} ${payerLabel(t, members)}`;
      return hay.includes(needle);
    });
  }, [q, transactions, members]);

  async function onDelete(id: string) {
    if (!window.confirm("למחוק את הרשומה?")) return;
    setBusyId(id);
    try {
      await deleteTransaction(id);
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
        {filtered.map((t) => (
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
              onClick={() => onDelete(t.id)}
            >
              מחיקה
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function payerLabel(t: Transaction, members: Profile[]): string {
  if (t.type !== "expense") return "";
  if (!isPersonalExpense(t)) return " · קופה";
  const name = members.find((m) => m.id === t.paid_by)?.display_name;
  return name ? ` · אישי · ${name}` : " · אישי";
}
