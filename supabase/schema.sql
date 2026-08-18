-- FastSync schema: household shared ledger
-- Run this entire file in Supabase → SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'הבית שלנו',
  invite_code text not null unique,
  opening_balance numeric(12, 2),
  opening_set_at timestamptz,
  recurring_applied_on date,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  household_id uuid references public.households on delete set null,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tx_type') then
    create type public.tx_type as enum ('expense', 'income');
  end if;
  if not exists (select 1 from pg_type where typname = 'tx_category') then
    create type public.tx_category as enum (
      'groceries',
      'transport',
      'leisure',
      'bills',
      'other',
      'salary',
      'gift'
    );
  end if;
end $$;

alter type public.tx_category add value if not exists 'gift';

create table if not exists public.recurring_templates (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  type public.tx_type not null,
  amount numeric(12, 2) not null check (amount > 0),
  category public.tx_category not null,
  description text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  created_by uuid references auth.users on delete set null,
  type public.tx_type not null,
  amount numeric(12, 2) not null check (amount > 0),
  category public.tx_category not null,
  description text not null,
  occurred_on date not null default current_date,
  recurring_template_id uuid references public.recurring_templates on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists transactions_household_date_idx
  on public.transactions (household_id, occurred_on desc);

create unique index if not exists transactions_recurring_month_uidx
  on public.transactions (
    household_id,
    recurring_template_id,
    (date_trunc('month', occurred_on::timestamp))
  )
  where recurring_template_id is not null;

-- Profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.current_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from public.profiles where id = auth.uid();
$$;

create or replace function public.create_household(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
  code text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  insert into public.households (name, invite_code)
  values (coalesce(nullif(trim(p_name), ''), 'הבית שלנו'), code)
  returning id into hid;

  update public.profiles
     set household_id = hid
   where id = auth.uid();

  return hid;
end;
$$;

create or replace function public.join_household(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select id into hid
    from public.households
   where invite_code = upper(trim(p_code));

  if hid is null then
    raise exception 'invalid invite code';
  end if;

  update public.profiles
     set household_id = hid
   where id = auth.uid();

  return hid;
end;
$$;

-- Materialize recurring rows for the current month, once.
-- If the user deletes a posted row this month, it stays deleted until next month.
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

alter table public.households enable row level security;
alter table public.profiles enable row level security;
alter table public.recurring_templates enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "profiles self" on public.profiles;
create policy "profiles self"
  on public.profiles for select
  using (id = auth.uid() or household_id = public.current_household_id());

drop policy if exists "profiles insert self" on public.profiles;
create policy "profiles insert self"
  on public.profiles for insert
  with check (id = auth.uid());

drop policy if exists "profiles update self" on public.profiles;
create policy "profiles update self"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "households members" on public.households;
create policy "households members"
  on public.households for select
  using (id = public.current_household_id());

drop policy if exists "households update members" on public.households;
create policy "households update members"
  on public.households for update
  using (id = public.current_household_id())
  with check (id = public.current_household_id());

drop policy if exists "recurring members" on public.recurring_templates;
create policy "recurring members"
  on public.recurring_templates for all
  using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());

drop policy if exists "transactions members" on public.transactions;
create policy "transactions members"
  on public.transactions for all
  using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.households to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.recurring_templates to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
grant execute on function public.create_household(text) to authenticated;
grant execute on function public.join_household(text) to authenticated;
grant execute on function public.ensure_recurring_for_current_month() to authenticated;
grant execute on function public.current_household_id() to authenticated;

-- Realtime for the shared dashboard
do $$
begin
  alter publication supabase_realtime add table public.transactions;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.households;
exception
  when duplicate_object then null;
end $$;
