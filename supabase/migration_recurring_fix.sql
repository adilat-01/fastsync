-- Run in Supabase → SQL Editor after migration_cushion.sql.
-- Stops deleted recurring rows from coming back on the current-month dashboard.

alter table public.households
  add column if not exists recurring_applied_on date;

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
