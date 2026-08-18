import type { TxCategory } from "../types";
import { categoryColor, categoryLabel } from "../lib/categories";
import { formatMoney } from "../lib/format";

type Slice = { category: TxCategory; amount: number };

export function DonutChart({ slices }: { slices: Slice[] }) {
  const total = slices.reduce((sum, s) => sum + s.amount, 0);
  const size = 168;
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  if (total <= 0) {
    return (
      <div className="flex h-44 items-center justify-center text-sm text-stone-500">
        אין עדיין הוצאות בחודש הזה
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e7e5e4" strokeWidth={stroke} />
        {slices
          .filter((s) => s.amount > 0)
          .map((s) => {
            const len = (s.amount / total) * c;
            const circle = (
              <circle
                key={s.category}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={categoryColor(s.category)}
                strokeWidth={stroke}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += len;
            return circle;
          })}
      </svg>
      <ul className="min-w-0 flex-1 space-y-2">
        {slices
          .filter((s) => s.amount > 0)
          .map((s) => (
            <li className="flex items-center justify-between gap-2 text-sm" key={s.category}>
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: categoryColor(s.category) }} />
                <span className="truncate text-stone-700">{categoryLabel(s.category)}</span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-ink">{formatMoney(s.amount)}</span>
            </li>
          ))}
      </ul>
    </div>
  );
}
