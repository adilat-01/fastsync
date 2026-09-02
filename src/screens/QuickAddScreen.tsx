import { useMemo, useState, type FormEvent } from "react";
import { useSession } from "../session";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "../lib/categories";
import { computeCushion, isPersonalExpense } from "../lib/cushion";
import { formatMoney, monthKey, parseMonthKey, todayISO } from "../lib/format";
import { formatDbError } from "../lib/errors";
import type { TxCategory, TxType } from "../types";

export function QuickAddScreen() {
  const { addTransaction, transactions, household, members, user } = useSession();
  const [kind, setKind] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TxCategory>("groceries");
  const [paidFrom, setPaidFrom] = useState<"shared" | "personal">("shared");
  const [paidBy, setPaidBy] = useState<string>("");
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
  const sharedExpense = monthTx
    .filter((t) => t.type === "expense" && !isPersonalExpense(t))
    .reduce((s, t) => s + Number(t.amount), 0);
  const personalExpense = monthTx.filter(isPersonalExpense).reduce((s, t) => s + Number(t.amount), 0);
  const remaining = income - sharedExpense;
  const cushion = computeCushion(household?.opening_balance, household?.opening_set_at, transactions);

  const suggestions = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const t of transactions) {
      if (t.type !== kind) continue;
      const d = t.description.trim();
      if (!d || seen.has(d)) continue;
      seen.add(d);
      list.push(d);
      if (list.length >= 8) break;
    }
    return list;
  }, [kind, transactions]);

  function switchKind(next: TxType) {
    setKind(next);
    setCategory(next === "income" ? "gift" : "groceries");
    setPaidFrom("shared");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    setBusy(true);
    try {
      await addTransaction({
        type: kind,
        amount: value,
        category,
        description: description.trim() || (kind === "income" ? "הכנסה" : "הוצאה"),
        occurred_on: date,
        paid_from: kind === "expense" ? paidFrom : "shared",
        paid_by: kind === "expense" && paidFrom === "personal" ? paidBy || user?.id || null : null,
      });
      setAmount("");
      setDescription("");
      setDate(todayISO());
      setPaidFrom("shared");
      setFlash("נשמר");
      window.setTimeout(() => setFlash(null), 1400);
    } catch (err) {
      setFlash(formatDbError(err));
    } finally {
      setBusy(false);
    }
  }

  const cats = kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-6">
      <header className="rounded-3xl bg-ink px-5 py-5 text-paper">
        {cushion == null ? (
          <>
            <p className="text-xs font-medium text-stone-300">יתרה פנויה החודש</p>
            <p className={`mt-1 text-3xl font-extrabold tabular-nums ${remaining < 0 ? "text-orange-300" : ""}`}>
              {formatMoney(remaining)}
            </p>
            <p className="mt-2 text-xs text-stone-400">
              הכנסות {formatMoney(income)} · מהקופה {formatMoney(sharedExpense)}
              {personalExpense > 0 ? ` · אישי ${formatMoney(personalExpense)}` : ""}
            </p>
            <p className="mt-2 text-xs text-stone-500">אפשר להגדיר יתרת עו״ש במסך הגדרות — פעם אחת, ואז זה מתעדכן לבד.</p>
          </>
        ) : (
          <>
            <p className="text-xs font-medium text-stone-300">כרית חיסכון · יתרת עו״ש</p>
            <p className={`mt-1 text-3xl font-extrabold tabular-nums ${cushion < 0 ? "text-orange-300" : ""}`}>
              {formatMoney(cushion)}
            </p>
            <p className="mt-2 text-xs text-stone-400">
              החודש בקופה: נותרו {formatMoney(remaining)} · הכנסות {formatMoney(income)} · מהקופה{" "}
              {formatMoney(sharedExpense)}
              {personalExpense > 0 ? ` · אישי ${formatMoney(personalExpense)}` : ""}
            </p>
          </>
        )}
      </header>

      <form onSubmit={onSubmit} className="mt-6">
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            className={`chip ${kind === "expense" ? "chip-on" : ""}`}
            onClick={() => switchKind("expense")}
          >
            הוצאה
          </button>
          <button
            type="button"
            className={`chip ${kind === "income" ? "chip-on" : ""}`}
            onClick={() => switchKind("income")}
          >
            הכנסה חד-פעמית
          </button>
        </div>

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
          {cats.map((cat) => (
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
          placeholder={kind === "income" ? "מתנה מההורים, בונוס..." : "סופר, דלק, פארם..."}
          list="recent-descriptions"
        />
        <datalist id="recent-descriptions">
          {suggestions.map((s) => (
            <option value={s} key={s} />
          ))}
        </datalist>

        {kind === "expense" && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-stone-500">מאיפה שולם</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`chip ${paidFrom === "shared" ? "chip-on" : ""}`}
                onClick={() => setPaidFrom("shared")}
              >
                קופה משותפת
              </button>
              <button
                type="button"
                className={`chip ${paidFrom === "personal" ? "chip-on" : ""}`}
                onClick={() => {
                  setPaidFrom("personal");
                  setPaidBy((prev) => prev || user?.id || members[0]?.id || "");
                }}
              >
                חשבון אישי
              </button>
            </div>
            {paidFrom === "personal" && (
              <div className="mt-3">
                <p className="mb-2 text-xs font-medium text-stone-500">מי שילם</p>
                <div className="flex flex-wrap gap-2">
                  {members.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`chip ${paidBy === m.id ? "chip-on" : ""}`}
                      onClick={() => setPaidBy(m.id)}
                    >
                      {m.display_name || "שותף"}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-stone-500">
                  נשמר בפילוח (למשל כמה דלק החודש) ולא יורד מיתרת העו״ש המשותפת.
                </p>
              </div>
            )}
          </div>
        )}

        {kind === "income" && (
          <p className="mt-3 text-xs leading-relaxed text-stone-500">
            הכנסה חד-פעמית נכנסת לקופה המשותפת אוטומטית. אין צורך לעדכן ידנית את יתרת העו״ש.
          </p>
        )}

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
          {busy
            ? "שומר..."
            : flash === "נשמר"
              ? "נשמר ✓"
              : kind === "income"
                ? "הוספת הכנסה"
                : "הוספת הוצאה"}
        </button>
        {flash && flash !== "נשמר" && <p className="mt-3 text-sm text-burn">{flash}</p>}
      </form>
    </div>
  );
}
