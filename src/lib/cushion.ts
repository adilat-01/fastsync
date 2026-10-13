import { LEGACY_ELECTRICITY_GROUP, parseBillDescription } from "./bills";
import { monthKey } from "./format";
import type { Transaction } from "../types";

export function isPersonalExpense(t: Transaction): boolean {
  return t.type === "expense" && t.paid_from === "personal";
}

/** A bill share dated in an earlier month than it was entered is history, not cash leaving now. */
export function isRetroactiveBillShare(t: Transaction): boolean {
  if (t.type !== "expense" || !parseBillDescription(t.description)) return false;
  const occurredMonth = t.occurred_on.slice(0, 7);
  const createdMonth = monthKey(new Date(t.created_at));
  return occurredMonth < createdMonth;
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
    if (t.description.includes(`§${LEGACY_ELECTRICITY_GROUP}`)) continue;
    if (isRetroactiveBillShare(t)) continue;
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
