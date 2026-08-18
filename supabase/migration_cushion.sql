-- Run in Supabase → SQL Editor (safe to run more than once).
-- Cushion (עו״ש) + gift income category + allow updating the household.

alter table public.households
  add column if not exists opening_balance numeric(12, 2),
  add column if not exists opening_set_at timestamptz;

alter type public.tx_category add value if not exists 'gift';

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
