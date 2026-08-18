import type { Transaction } from "../types";

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
    delta += t.type === "income" ? Number(t.amount) : -Number(t.amount);
  }
  return Number(openingBalance) + delta;
}
