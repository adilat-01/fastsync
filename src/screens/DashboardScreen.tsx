import { useMemo, useState } from "react";
import { useSession } from "../session";
import { DonutChart } from "../components/DonutChart";
import { EXPENSE_CATEGORIES, categoryLabel } from "../lib/categories";
import {
  formatMoney,
  monthKey,
  parseMonthKey,
  percentChange,
  previousMonthKey,
  shiftMonth,
} from "../lib/format";
import type { TxCategory } from "../types";

export function DashboardScreen() {
  const { transactions, household } = useSession();
  const [selected, setSelected] = useState(monthKey(new Date()));
  const current = parseMonthKey(selected);
  const prevKey = previousMonthKey(selected);
  const prev = parseMonthKey(prevKey);

  const currentTx = useMemo(
    () => transactions.filter((t) => t.occurred_on >= current.start && t.occurred_on <= current.end),
    [current.end, current.start, transactions],
  );
  const prevTx = useMemo(
    () => transactions.filter((t) => t.occurred_on >= prev.start && t.occurred_on <= prev.end),
    [prev.end, prev.start, transactions],
  );

  const income = sumBy(currentTx, "income");
  const expense = sumBy(currentTx, "expense");
  const remaining = income - expense;

  const slices = EXPENSE_CATEGORIES.map((cat) => ({
    category: cat.id,
    amount: currentTx
      .filter((t) => t.type === "expense" && t.category === cat.id)
      .reduce((s, t) => s + Number(t.amount), 0),
  }));

  const compareRows = EXPENSE_CATEGORIES.map((cat) => {
    const now = amountIn(currentTx, cat.id);
    const before = amountIn(prevTx, cat.id);
    return { category: cat.id, now, before, change: percentChange(now, before) };
  });

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-6">
      <div className="flex items-center justify-between">
        <button className="nav-arrow" type="button" onClick={() => setSelected(shiftMonth(selected, -1))}>
          ›
        </button>
        <div className="text-center">
          <p className="text-xs text-stone-500">{household?.name}</p>
          <h1 className="text-lg font-bold text-ink">{current.label}</h1>
        </div>
        <button className="nav-arrow" type="button" onClick={() => setSelected(shiftMonth(selected, 1))}>
          ‹
        </button>
      </div>

      <section className="mt-5 grid grid-cols-3 gap-2">
        <Stat label="הכנסות" value={formatMoney(income)} />
        <Stat label="הוצאות" value={formatMoney(expense)} />
        <Stat label="יתרה" value={formatMoney(remaining)} emph={remaining < 0 ? "bad" : "good"} />
      </section>

      <section className="card mt-5 p-4">
        <h2 className="mb-3 text-sm font-bold text-ink">לאן הלך הכסף</h2>
        <DonutChart slices={slices} />
      </section>

      <section className="card mt-5 p-4">
        <h2 className="text-sm font-bold text-ink">שימור ידע · מול {prev.label}</h2>
        <p className="mt-1 text-xs leading-relaxed text-stone-500">
          כמה הוצאתם בכל קטגוריה החודש, לעומת החודש הקודם.
        </p>
        <div className="mt-3 divide-y divide-stone-100">
          {compareRows.map((row) => (
            <CompareRow key={row.category} {...row} />
          ))}
        </div>
      </section>
    </div>
  );
}

function sumBy(rows: { type: string; amount: number | string }[], type: "income" | "expense") {
  return rows.filter((t) => t.type === type).reduce((s, t) => s + Number(t.amount), 0);
}

function amountIn(rows: { type: string; category: string; amount: number | string }[], category: TxCategory) {
  return rows
    .filter((t) => t.type === "expense" && t.category === category)
    .reduce((s, t) => s + Number(t.amount), 0);
}

function Stat({
  label,
  value,
  emph,
}: {
  label: string;
  value: string;
  emph?: "good" | "bad";
}) {
  const color =
    emph === "good" ? "text-accent" : emph === "bad" ? "text-burn" : "text-ink";
  return (
    <div className="card px-2 py-3 text-center">
      <p className="text-[11px] text-stone-500">{label}</p>
      <p className={`mt-1 text-sm font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function CompareRow({
  category,
  now,
  before,
  change,
}: {
  category: TxCategory;
  now: number;
  before: number;
  change: number | null;
}) {
  const up = (change ?? 0) > 0.5;
  const down = (change ?? 0) < -0.5;
  const changeLabel =
    change === null ? "חדש" : `${change > 0 ? "+" : ""}${Math.round(change)}%`;
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div>
        <p className="text-sm font-medium text-ink">{categoryLabel(category)}</p>
        <p className="text-xs text-stone-500">
          {formatMoney(now)} · קודם {formatMoney(before)}
        </p>
      </div>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
          up ? "bg-orange-50 text-burn" : down ? "bg-teal-50 text-accent" : "bg-stone-100 text-stone-500"
        }`}
      >
        {now === 0 && before === 0 ? "—" : changeLabel}
      </span>
    </div>
  );
}
