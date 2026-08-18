export type TxType = "expense" | "income";

export type TxCategory =
  | "groceries"
  | "transport"
  | "leisure"
  | "bills"
  | "other"
  | "salary";

export type Profile = {
  id: string;
  household_id: string | null;
  display_name: string;
};

export type Household = {
  id: string;
  name: string;
  invite_code: string;
};

export type RecurringTemplate = {
  id: string;
  household_id: string;
  type: TxType;
  amount: number;
  category: TxCategory;
  description: string;
  active: boolean;
};

export type Transaction = {
  id: string;
  household_id: string;
  created_by: string | null;
  type: TxType;
  amount: number;
  category: TxCategory;
  description: string;
  occurred_on: string;
  recurring_template_id: string | null;
  created_at: string;
};
