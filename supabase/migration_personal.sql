-- Personal vs shared wallet on expenses.
-- Run in Supabase → SQL Editor.

alter table public.transactions
  add column if not exists paid_from text not null default 'shared';

alter table public.transactions
  add column if not exists paid_by uuid references auth.users on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'transactions_paid_from_check'
  ) then
    alter table public.transactions
      add constraint transactions_paid_from_check
      check (paid_from in ('shared', 'personal'));
  end if;
end $$;
