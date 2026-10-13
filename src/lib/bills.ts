import { monthKey, parseMonthKey, shiftMonth } from "./format";
import type { Transaction } from "../types";

/** Stable id so the one-time electricity fix does not run twice. */
export const LEGACY_ELECTRICITY_GROUP = "e850jul";
export const LEGACY_ELECTRICITY_MONTHS = ["2026-07", "2026-08", "2026-09"];

const GROUP_MARK = " · §";

export function recentMonthKeys(count = 12, now = new Date()): string[] {
  const current = monthKey(now);
  return Array.from({ length: count }, (_, i) => shiftMonth(current, -i));
}

export function monthName(key: string, withYear = false): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(
    "he-IL",
    withYear ? { month: "long", year: "numeric" } : { month: "long" },
  );
}

export function monthChipLabel(key: string, now = new Date()): string {
  const [y, m] = key.split("-").map(Number);
  const sameYear = y === now.getFullYear();
  return new Date(y, m - 1, 1).toLocaleDateString(
    "he-IL",
    sameYear ? { month: "long" } : { month: "short", year: "2-digit" },
  );
}

export function isContiguous(sorted: string[]): boolean {
  for (let i = 1; i < sorted.length; i++) {
    if (shiftMonth(sorted[i - 1], 1) !== sorted[i]) return false;
  }
  return true;
}

export function monthsPhrase(months: string[]): string {
  const sorted = [...months].sort();
  const years = new Set(sorted.map((key) => key.slice(0, 4)));
  const name = (key: string) => monthName(key, years.size > 1);
  if (sorted.length === 1) return name(sorted[0]);
  if (isContiguous(sorted)) return `${name(sorted[0])}–${name(sorted[sorted.length - 1])}`;
  return sorted.map(name).join(", ");
}

/** Whole shekels stay whole so monthly totals still add up on screen. */
export function splitAmount(total: number, parts: number): number[] {
  if (parts <= 0) return [];
  if (parts === 1) return [total];
  const cents = Math.round(total * 100);
  const wholeShekels = cents % 100 === 0;
  const units = wholeShekels ? cents / 100 : cents;
  const base = Math.floor(units / parts);
  let remainder = units - base * parts;
  const shares = Array.from({ length: parts }, () => {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    return base + extra;
  });
  return shares.map((share) => (wholeShekels ? share : share / 100));
}

export function formatBillDescription(base: string, months: string[], groupId: string): string {
  return `${base.trim()} · ${monthsPhrase(months)} · §${groupId}`;
}

export function parseBillDescription(
  description: string,
): { base: string; span: string; groupId: string } | null {
  const mark = description.lastIndexOf(GROUP_MARK);
  if (mark < 0) return null;
  const groupId = description.slice(mark + GROUP_MARK.length);
  if (!/^[a-z0-9]+$/.test(groupId)) return null;
  const head = description.slice(0, mark);
  const sep = head.lastIndexOf(" · ");
  if (sep < 0) return null;
  const base = head.slice(0, sep).trim();
  const span = head.slice(sep + 3).trim();
  if (!base || !span) return null;
  return { base, span, groupId };
}

export function descriptionLabel(description: string): string {
  return parseBillDescription(description)?.base ?? description;
}

export type SpreadPart = {
  description: string;
  amount: number;
  occurred_on: string;
};

export function buildSpreadRows(input: {
  description: string;
  amount: number;
  months: string[];
  groupId: string;
}): SpreadPart[] {
  const months = [...input.months].sort();
  const shares = splitAmount(input.amount, months.length);
  const description = formatBillDescription(input.description, months, input.groupId);
  return months.map((key, index) => ({
    description,
    amount: shares[index],
    occurred_on: parseMonthKey(key).start,
  }));
}

export function occurredOnForSingleMonth(month: string, dateISO: string): string {
  if (dateISO.startsWith(month)) return dateISO;
  return parseMonthKey(month).start;
}

export type HistoryEntry =
  | { kind: "single"; tx: Transaction }
  | { kind: "bill"; id: string; txs: Transaction[]; title: string; span: string };

export function groupTransactions(txs: Transaction[]): HistoryEntry[] {
  const buckets = new Map<string, Transaction[]>();
  const entries: HistoryEntry[] = [];
  for (const tx of txs) {
    const parsed = parseBillDescription(tx.description);
    if (!parsed) {
      entries.push({ kind: "single", tx });
      continue;
    }
    const bucket = buckets.get(parsed.groupId);
    if (bucket) {
      bucket.push(tx);
      continue;
    }
    const txsBucket = [tx];
    buckets.set(parsed.groupId, txsBucket);
    entries.push({
      kind: "bill",
      id: parsed.groupId,
      txs: txsBucket,
      title: parsed.base,
      span: parsed.span,
    });
  }
  return entries;
}

function isLegacyElectricity(t: Transaction): boolean {
  if (t.type !== "expense" || t.recurring_template_id) return false;
  if (!t.occurred_on.startsWith("2026-10")) return false;
  if (parseBillDescription(t.description)) return false;
  if (Math.abs(Number(t.amount) - 850) >= 0.05) return false;
  if (t.description.includes("חשמל")) return true;
  const generic = t.description.trim();
  return (generic === "הוצאה" || generic === "חשבונות" || generic === "חשבון") && t.category === "bills";
}

export function findLegacyElectricity(txs: Transaction[]): Transaction | null {
  const matches = txs.filter(isLegacyElectricity);
  const named = matches.filter((t) => t.description.includes("חשמל"));
  const pool = named.length > 0 ? named : matches;
  return pool.length === 1 ? pool[0] : null;
}

export function legacyElectricityDateFixes(txs: Transaction[]): { id: string; occurred_on: string }[] {
  const parts = txs.filter((t) => t.description.includes(`§${LEGACY_ELECTRICITY_GROUP}`));
  if (parts.length === 0) return [];
  const targets = buildSpreadRows({
    description: "חשמל",
    amount: 850,
    months: LEGACY_ELECTRICITY_MONTHS,
    groupId: LEGACY_ELECTRICITY_GROUP,
  });
  const used = new Set<string>();
  const fixes: { id: string; occurred_on: string }[] = [];
  for (const target of targets) {
    const sameAmount = (t: Transaction) => Math.abs(Number(t.amount) - target.amount) < 0.05;
    const match =
      parts.find((t) => !used.has(t.id) && sameAmount(t) && t.occurred_on.slice(0, 10) === target.occurred_on) ??
      parts.find((t) => !used.has(t.id) && sameAmount(t));
    if (!match) continue;
    used.add(match.id);
    if (match.occurred_on.slice(0, 10) !== target.occurred_on) {
      fixes.push({ id: match.id, occurred_on: target.occurred_on });
    }
  }
  return fixes;
}

export function planLegacyElectricityRepair(txs: Transaction[]): {
  deleteId: string;
  parts: SpreadPart[] | null;
  source: Transaction;
} | null {
  const spread = txs.find((t) => t.description.includes(`§${LEGACY_ELECTRICITY_GROUP}`));
  const original = findLegacyElectricity(txs);
  if (!original) return null;
  if (spread) {
    const originalIsLeftover = new Date(original.created_at).getTime() < new Date(spread.created_at).getTime();
    if (!originalIsLeftover) return null;
    return { deleteId: original.id, parts: null, source: original };
  }
  const base = original.description.includes("חשמל") ? original.description.trim() : "חשמל";
  return {
    deleteId: original.id,
    source: original,
    parts: buildSpreadRows({
      description: base,
      amount: Number(original.amount),
      months: LEGACY_ELECTRICITY_MONTHS,
      groupId: LEGACY_ELECTRICITY_GROUP,
    }),
  };
}
