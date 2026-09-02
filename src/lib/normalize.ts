import type { Household, Profile, RecurringTemplate, Transaction, PaidFrom } from "../types";

export function normalizeHousehold(row: Record<string, unknown>): Household {
  return {
    id: String(row.id),
    name: String(row.name),
    invite_code: String(row.invite_code),
    opening_balance: row.opening_balance != null ? Number(row.opening_balance) : null,
    opening_set_at: row.opening_set_at != null ? String(row.opening_set_at) : null,
  };
}

export function normalizeTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: String(row.id),
    household_id: String(row.household_id),
    created_by: row.created_by != null ? String(row.created_by) : null,
    type: row.type as Transaction["type"],
    amount: Number(row.amount),
    category: row.category as Transaction["category"],
    description: String(row.description),
    occurred_on: String(row.occurred_on),
    recurring_template_id: row.recurring_template_id != null ? String(row.recurring_template_id) : null,
    paid_from: (row.paid_from as PaidFrom | undefined) ?? "shared",
    paid_by: row.paid_by != null ? String(row.paid_by) : null,
    created_at: String(row.created_at),
  };
}

export function normalizeProfile(row: Record<string, unknown>): Profile {
  return {
    id: String(row.id),
    household_id: row.household_id != null ? String(row.household_id) : null,
    display_name: String(row.display_name ?? ""),
  };
}

export function normalizeTemplate(row: Record<string, unknown>): RecurringTemplate {
  return {
    id: String(row.id),
    household_id: String(row.household_id),
    type: row.type as RecurringTemplate["type"],
    amount: Number(row.amount),
    category: row.category as RecurringTemplate["category"],
    description: String(row.description),
    active: Boolean(row.active),
  };
}
