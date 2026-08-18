import type { Transaction } from "../types";

export function isPersonalExpense(t: Transaction): boolean {
  return t.type === "expense" && t.paid_from === "personal";
}

export function computeCushion(
  openingBalance: number | null | undefined,
  openingSetAt: string | null | undefined,
  transactions: Transaction[],
): number | null {
  if (openingBalance == null || !openingSetAt) return null;
  const since = new Date(openingSetAt).getTime();
  let delta = 0;
  for (const t of transactions) {
    if (new Date(t.created_at).getTime() <= since) continue;
    if (t.type === "income") {
      delta += Number(t.amount);
      continue;
    }
    if (isPersonalExpense(t)) continue;
    delta -= Number(t.amount);
  }
  return Number(openingBalance) + delta;
}
