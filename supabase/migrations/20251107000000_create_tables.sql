-- GKK schema reconstruction, part 1: tables and indexes.
--
-- The Supabase project at aqqyknwgspxnzahrdkbp.supabase.co is reachable again but
-- had no application schema, so these tables did not survive. Every column below
-- is derived from the application source, not from a live database backup. Each
-- table block lists the source files and lines that read or write its columns.

-- ---------------------------------------------------------------------------
-- profiles
--
-- One row per signed-in user. Created automatically by the trigger in
-- 20251107000001_handle_new_user_trigger.sql when Supabase creates an auth user.
--
--   id           app/index.tsx:34-36, app/profile.tsx:33-35,
--                components/customer/CustomerHome.tsx:42-49 (all filter by id)
--   user_type    app/index.tsx:34-36, app/profile.tsx:33-35,
--                app/auth/signup.tsx:46-51 (auth metadata)
--   full_name    app/profile.tsx:33-35, app/auth/signup.tsx:46-51
--   phone_number app/profile.tsx:33-35, app/auth/signup.tsx:46-51,
--                app/kitchen/[chefid].tsx:62-67 (embedded select profiles!inner(phone_number))
--   address      components/customer/CustomerHome.tsx:42-49
--   city         components/customer/CustomerHome.tsx:42-49
--   latitude     components/customer/CustomerHome.tsx:42-49
--   longitude    components/customer/CustomerHome.tsx:42-49
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_type text not null default 'customer'
    check (user_type in ('customer', 'chef')),
  full_name text,
  phone_number text,
  address text,
  city text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- chef_profiles
--
-- One row per chef kitchen. The id is the chef's auth user id, and it references
-- profiles.id so PostgREST can resolve the profiles!inner(phone_number) embed in
-- app/kitchen/[chefid].tsx:62-67. The trigger in
-- 20251107000001_handle_new_user_trigger.sql seeds an empty row for users who
-- sign up as chef, because ChefOnboarding only ever issues an UPDATE against
-- this table and never an INSERT.
--
--   id                   app/index.tsx:50-52, ChefDashboard.tsx:80-82,
--                        ChefOnboarding.tsx:120-133 (all filter by id)
--   kitchen_name         ChefOnboarding.tsx:122, ChefDashboard.tsx:132-134,
--                        CustomerHome.tsx:64, app/index.tsx:51
--   bio                  ChefOnboarding.tsx:123, ChefDashboard.tsx:132-134
--   kitchen_address      ChefOnboarding.tsx:124, ChefDashboard.tsx:132-134,
--                        CustomerHome.tsx:70, app/index.tsx:51
--   postcode             ChefOnboarding.tsx:125
--   latitude             ChefOnboarding.tsx:126, CustomerHome.tsx:68
--   longitude            ChefOnboarding.tsx:127, CustomerHome.tsx:69
--   cuisine_types        ChefOnboarding.tsx:128, ChefDashboard.tsx:132-134,
--                        CustomerHome.tsx:65, app/index.tsx:51
--   kitchen_image        ChefOnboarding.tsx:129 (bare file path),
--                        CustomerHome.tsx:67, ChefDashboard.tsx:324-325
--   is_active            ChefOnboarding.tsx:130 (set true),
--                        CustomerHome.tsx:72 (filter true)
--   is_accepting_orders  ChefOnboarding.tsx:131, ChefDashboard.tsx:107-109,
--                        CustomerHome.tsx:73
--   food_hygiene_rating  CustomerHome.tsx:66, app/kitchen/[chefid].tsx:193
--   is_verified          app/kitchen/[chefid].tsx:16 (ChefProfile interface)
--   average_preparation_time app/kitchen/[chefid].tsx:18 (ChefProfile interface)
--   social_media         app/kitchen/[chefid].tsx:20 (ChefProfile interface)
-- ---------------------------------------------------------------------------
create table if not exists public.chef_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  kitchen_name text,
  bio text,
  kitchen_address text,
  postcode text,
  latitude double precision,
  longitude double precision,
  cuisine_types text[] not null default '{}',
  kitchen_image text,
  is_active boolean not null default false,
  is_accepting_orders boolean not null default false,
  food_hygiene_rating real,
  is_verified boolean not null default false,
  average_preparation_time integer,
  social_media jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- dishes
--
-- One row per menu item, owned by a chef.
--
--   chef_id           ChefDashboard.tsx:244-256 (insert/update payload),
--                     app/kitchen/[chefid].tsx:80 (filter)
--   name              ChefDashboard.tsx:244-256, app/kitchen/[chefid].tsx:28
--   description       ChefDashboard.tsx:244-256, app/kitchen/[chefid].tsx:29
--   price             ChefDashboard.tsx:244-256 (parseFloat),
--                     app/kitchen/[chefid].tsx:30 (toFixed at 225)
--   category          ChefDashboard.tsx:244-256 (stored lowercased),
--                     app/kitchen/[chefid].tsx:32
--   cuisine_type      ChefDashboard.tsx:244-256, app/kitchen/[chefid].tsx:33
--   dietary_info      ChefDashboard.tsx:244-256 (string array),
--                     app/kitchen/[chefid].tsx:34
--   spice_level       ChefDashboard.tsx:244-256, app/kitchen/[chefid].tsx:35
--   preparation_time  ChefDashboard.tsx:244-256 (minutes)
--   serving_size      ChefDashboard.tsx:244-256
--   ingredients       ChefDashboard.tsx:244-256 (comma split to array)
--   image_url         ChefDashboard.tsx:244-256 (full public URL),
--                     app/kitchen/[chefid].tsx:99-100
--   is_available      ChefDashboard.tsx:279-281 (toggle),
--                     app/kitchen/[chefid].tsx:36 (interface), 81 (filter true)
--   created_at        ChefDashboard.tsx:90-93 (order by created_at desc)
-- ---------------------------------------------------------------------------
create table if not exists public.dishes (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references public.chef_profiles(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2) not null,
  category text,
  cuisine_type text,
  dietary_info text[] not null default '{}',
  spice_level integer check (spice_level >= 0 and spice_level <= 5),
  preparation_time integer,
  serving_size text,
  ingredients text[] not null default '{}',
  image_url text,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes the queries rely on.
-- ---------------------------------------------------------------------------

-- CustomerHome filters chef_profiles by is_active and is_accepting_orders
-- (components/customer/CustomerHome.tsx:72-73).
create index if not exists chef_profiles_active_accepting_idx
  on public.chef_profiles (is_active, is_accepting_orders);

-- ChefDashboard orders a chef's dishes by created_at descending
-- (components/chef/ChefDashboard.tsx:90-93).
create index if not exists dishes_chef_created_idx
  on public.dishes (chef_id, created_at desc);

-- The kitchen page filters dishes by chef_id and is_available
-- (app/kitchen/[chefid].tsx:78-81).
create index if not exists dishes_chef_available_idx
  on public.dishes (chef_id, is_available);
