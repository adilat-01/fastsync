import { useMemo, useState, type FormEvent } from "react";
import { useSession } from "../session";
import { EXPENSE_CATEGORIES } from "../lib/categories";
import { formatMoney, monthKey, parseMonthKey, todayISO } from "../lib/format";
import type { TxCategory } from "../types";

export function QuickAddScreen() {
  const { addTransaction, transactions } = useSession();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TxCategory>("groceries");
  const [date, setDate] = useState(todayISO());
  const [showDate, setShowDate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const month = parseMonthKey(monthKey(new Date()));
  const monthTx = useMemo(
    () => transactions.filter((t) => t.occurred_on >= month.start && t.occurred_on <= month.end),
    [month.end, month.start, transactions],
  );
  const income = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const remaining = income - expense;

  const suggestions = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const t of transactions) {
      if (t.type !== "expense") continue;
      const d = t.description.trim();
      if (!d || seen.has(d)) continue;
      seen.add(d);
      list.push(d);
      if (list.length >= 8) break;
    }
    return list;
  }, [transactions]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    setBusy(true);
    try {
      await addTransaction({
        type: "expense",
        amount: value,
        category,
        description: description.trim() || "הוצאה",
        occurred_on: date,
      });
      setAmount("");
      setDescription("");
      setDate(todayISO());
      setFlash("נשמר");
      window.setTimeout(() => setFlash(null), 1400);
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-6">
      <header className="rounded-3xl bg-ink px-5 py-5 text-paper">
        <p className="text-xs font-medium text-stone-300">יתרה פנויה החודש</p>
        <p className={`mt-1 text-3xl font-extrabold tabular-nums ${remaining < 0 ? "text-orange-300" : ""}`}>
          {formatMoney(remaining)}
        </p>
        <p className="mt-2 text-xs text-stone-400">
          הכנסות {formatMoney(income)} · הוצאות {formatMoney(expense)}
        </p>
      </header>

      <form onSubmit={onSubmit} className="mt-6">
        <label className="block">
          <span className="sr-only">סכום</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-stone-400">₪</span>
            <input
              className="w-full bg-transparent text-5xl font-extrabold tabular-nums text-ink outline-none placeholder:text-stone-300"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
              placeholder="0"
              autoFocus
              required
            />
          </div>
        </label>

        <div className="mt-5 flex flex-wrap gap-2">
          {EXPENSE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`chip ${category === cat.id ? "chip-on" : ""}`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <input
          className="field mt-4"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="סופר, דלק, פארם..."
          list="recent-descriptions"
        />
        <datalist id="recent-descriptions">
          {suggestions.map((s) => (
            <option value={s} key={s} />
          ))}
        </datalist>

        <button className="mt-3 text-sm text-stone-500" type="button" onClick={() => setShowDate((v) => !v)}>
          {showDate ? "הסתר תאריך" : `תאריך: ${date.split("-").reverse().join(".")}`}
        </button>
        {showDate && (
          <input
            className="field mt-2"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        )}

        <button className="btn-primary mt-6 w-full" disabled={busy} type="submit">
          {busy ? "שומר..." : flash === "נשמר" ? "נשמר ✓" : "הוספת הוצאה"}
        </button>
        {flash && flash !== "נשמר" && <p className="mt-3 text-sm text-burn">{flash}</p>}
      </form>
    </div>
  );
}
