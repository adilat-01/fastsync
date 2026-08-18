import type { TxCategory } from "../types";

export const EXPENSE_CATEGORIES: { id: TxCategory; label: string; color: string }[] = [
  { id: "groceries", label: "מזון וסופר", color: "#0f766e" },
  { id: "transport", label: "תחבורה", color: "#1d4ed8" },
  { id: "leisure", label: "פנאי", color: "#7c3aed" },
  { id: "bills", label: "חשבונות", color: "#c2410c" },
  { id: "other", label: "שונות", color: "#57534e" },
];

export const ALL_CATEGORIES: { id: TxCategory; label: string; color: string }[] = [
  ...EXPENSE_CATEGORIES,
  { id: "salary", label: "הכנסה", color: "#047857" },
];

export function categoryLabel(id: TxCategory): string {
  return ALL_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function categoryColor(id: TxCategory): string {
  return ALL_CATEGORIES.find((c) => c.id === id)?.color ?? "#57534e";
}
