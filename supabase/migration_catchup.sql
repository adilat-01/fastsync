-- Catch-up: safe to run even if some of this already ran.
-- Paste this whole file once in Supabase → SQL Editor → Run.
-- Overwriting the editor text does NOT undo previous successful runs.

-- Cushion (עו״ש)
alter table public.households
  add column if not exists opening_balance numeric(12, 2),
  add column if not exists opening_set_at timestamptz,
  add column if not exists recurring_applied_on date;

-- Categories added after the first schema
alter type public.tx_category add value if not exists 'gift';
alter type public.tx_category add value if not exists 'dining';

-- Personal vs shared payment
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

-- Allow updating household (cushion)
drop policy if exists "households update members" on public.households;
create policy "households update members"
  on public.households for update
  using (id = public.current_household_id())
  with check (id = public.current_household_id());

do $$
begin
  alter publication supabase_realtime add table public.households;
exception
  when duplicate_object then null;
end $$;

-- Recurring: don't recreate a deleted row in the same month
create or replace function public.ensure_recurring_for_current_month()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
  month_start date;
  already date;
  inserted integer := 0;
begin
  hid := public.current_household_id();
  if hid is null then
    return 0;
  end if;

  month_start := date_trunc('month', current_date)::date;

  select recurring_applied_on into already
    from public.households
   where id = hid;

  if already is not distinct from month_start then
    return 0;
  end if;

  insert into public.transactions (
    household_id, created_by, type, amount, category, description, occurred_on, recurring_template_id
  )
  select
    t.household_id,
    auth.uid(),
    t.type,
    t.amount,
    t.category,
    t.description,
    month_start,
    t.id
  from public.recurring_templates t
  where t.household_id = hid
    and t.active = true
    and not exists (
      select 1
        from public.transactions x
       where x.recurring_template_id = t.id
         and date_trunc('month', x.occurred_on::timestamp) = date_trunc('month', current_date::timestamp)
    );

  get diagnostics inserted = row_count;

  update public.households
     set recurring_applied_on = month_start
   where id = hid;

  return inserted;
end;
$$;
