-- ===================================================================
-- OfferBridge — Profiles Table & Auth Trigger
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ===================================================================

-- Drop existing trigger + function if they exist
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- ─── profiles ──────────────────────────────────────────────────────
create table if not exists profiles (
  id         uuid    primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  role       text    not null default 'customer',
  -- role: 'admin' | 'customer' | 'provider' | 'customer_provider'
  created_at timestamptz not null default now()
);

-- RLS: users can only see and edit their own profile
alter table profiles enable row level security;

drop policy if exists "profiles_select" on profiles;
drop policy if exists "profiles_insert" on profiles;
drop policy if exists "profiles_update" on profiles;

create policy "profiles_select" on profiles
  for select using (auth.uid() = id);

create policy "profiles_insert" on profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update" on profiles
  for update using (auth.uid() = id);

-- ─── Trigger: auto-create profile on signup ────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'customer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Verify ────────────────────────────────────────────────────────
-- You should see "profiles" in your table list after running this.
select 'profiles table ready' as status;
