-- GKK schema reconstruction, part 3: Row Level Security.
--
-- Anonymous access is denied everywhere. Every table has RLS enabled and no
-- policy targets the anon role, so an unauthenticated request sees no rows.
--
-- The browse flow (customer home and the kitchen page) runs only after sign-in
-- because app/_layout.tsx redirects signed-out users to /auth/login. The read
-- policies below are therefore granted to the authenticated role, not to anon.
--
-- Two facts about the current app constrain these policies:
--
--   1. app/kitchen/[chefid].tsx:62-67 reads another user's phone_number through an
--      embedded select (profiles!inner(phone_number)). Row Level Security is
--      per-row, not per-column, so the profiles read policy must expose a chef's
--      whole profiles row to every signed-in user. That is the documented
--      trade-off: chef phone numbers are visible to signed-in users for now.
--
--   2. components/customer/CustomerHome.tsx:42-49 updates the signed-in user's own
--      profiles row by id with no server-side ownership check. The update policy
--      below supplies that check: Postgres rejects the write unless auth.uid()
--      equals the row id.

alter table public.profiles enable row level security;
alter table public.chef_profiles enable row level security;
alter table public.dishes enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

-- Owners read their own row. Signed-in users may also read a chef's row so the
-- kitchen page can show that chef's phone_number.
drop policy if exists "profiles_select_own_or_chef" on public.profiles;
create policy "profiles_select_own_or_chef"
  on public.profiles
  for select
  to authenticated
  using (
    auth.uid() = id
    or exists (select 1 from public.chef_profiles cp where cp.id = profiles.id)
  );

-- Owners may update only their own row. This is the server-side ownership check
-- the customer home screen omits.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- chef_profiles
-- ---------------------------------------------------------------------------

-- Signed-in users may read any chef profile to browse the customer home feed and
-- the kitchen page.
drop policy if exists "chef_profiles_select" on public.chef_profiles;
create policy "chef_profiles_select"
  on public.chef_profiles
  for select
  to authenticated
  using (true);

-- A chef may create only their own row (id equals their auth uid). The app seeds
-- this row via the signup trigger, but this policy keeps the insert path safe for
-- any future direct insert.
drop policy if exists "chef_profiles_insert_own" on public.chef_profiles;
create policy "chef_profiles_insert_own"
  on public.chef_profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

-- A chef may update only their own row.
drop policy if exists "chef_profiles_update_own" on public.chef_profiles;
create policy "chef_profiles_update_own"
  on public.chef_profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- A chef may delete only their own row.
drop policy if exists "chef_profiles_delete_own" on public.chef_profiles;
create policy "chef_profiles_delete_own"
  on public.chef_profiles
  for delete
  to authenticated
  using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- dishes
-- ---------------------------------------------------------------------------

-- Signed-in users may read any dish to browse a chef's menu.
drop policy if exists "dishes_select" on public.dishes;
create policy "dishes_select"
  on public.dishes
  for select
  to authenticated
  using (true);

-- A chef may insert only dishes whose chef_id matches their auth uid.
drop policy if exists "dishes_insert_own" on public.dishes;
create policy "dishes_insert_own"
  on public.dishes
  for insert
  to authenticated
  with check (auth.uid() = chef_id);

-- A chef may update only their own dishes.
drop policy if exists "dishes_update_own" on public.dishes;
create policy "dishes_update_own"
  on public.dishes
  for update
  to authenticated
  using (auth.uid() = chef_id)
  with check (auth.uid() = chef_id);

-- A chef may delete only their own dishes.
drop policy if exists "dishes_delete_own" on public.dishes;
create policy "dishes_delete_own"
  on public.dishes
  for delete
  to authenticated
  using (auth.uid() = chef_id);
