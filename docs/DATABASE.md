# GKK database

This document describes the reconstructed Supabase schema for GKK. The schema is
defined by the timestamp-ordered SQL files in `supabase/migrations/` and was
derived from the application queries, not from a live database backup. Each
migration file lists the source lines its columns came from.

## How to read this

- Primary keys are UUIDs. `profiles.id` and `chef_profiles.id` are the Supabase
  auth user id.
- Arrays (`cuisine_types`, `dietary_info`, `ingredients`) are Postgres `text[]`
  arrays because the app calls `.join(", ")` on them.
- Every table has Row Level Security enabled. Signed-in users can write only their
  own rows, browse reads are allowed for signed-in users, and anonymous access is
  denied.

## Tables

### profiles

One row per signed-in user. Created automatically by the `on_auth_user_created`
trigger when a new auth user signs up, copying `full_name`, `phone_number`, and
`user_type` from the signup metadata (`app/auth/signup.tsx`).

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | uuid, primary key | The Supabase auth user id. |
| `user_type` | text, `customer` or `chef` | Which home screen the app shows after sign-in. |
| `full_name` | text | Display name from the signup form. |
| `phone_number` | text | Contact number, stored in `+92XXXXXXXXXX` form. |
| `address` | text | Customer's current address, saved from a location lookup. |
| `city` | text | Customer's current city. |
| `latitude` | double precision | Customer's current latitude. |
| `longitude` | double precision | Customer's current longitude. |
| `created_at` | timestamptz | Row creation time. |
| `updated_at` | timestamptz | Row update time. |

### chef_profiles

One row per chef kitchen. The `on_auth_user_created` trigger seeds a row for users
who sign up as `chef`; the chef onboarding wizard then fills it in with an update
(`components/chef/ChefOnboarding.tsx`). The seeded row is inactive and not
accepting orders until onboarding completes, so it does not appear in the customer
browse feed early.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | uuid, primary key | The chef's auth user id, references `profiles.id`. |
| `kitchen_name` | text | Kitchen display name. |
| `bio` | text | Kitchen description shown to customers. |
| `kitchen_address` | text | Street address shown on the kitchen page. |
| `postcode` | text | Kitchen postcode. |
| `latitude` | double precision | Kitchen latitude, for distance sort and maps. |
| `longitude` | double precision | Kitchen longitude. |
| `cuisine_types` | text[] | Cuisines the kitchen offers. |
| `kitchen_image` | text | Bare file name in the `avatars` storage bucket. |
| `is_active` | boolean | Whether the kitchen is listed in the customer home feed. |
| `is_accepting_orders` | boolean | Whether customers can order; toggled from the chef dashboard. |
| `food_hygiene_rating` | real | Hygiene rating shown as stars. |
| `is_verified` | boolean | Verification flag. |
| `average_preparation_time` | integer | Average preparation time in minutes. |
| `social_media` | jsonb | Social media links. |
| `created_at` | timestamptz | Row creation time. |
| `updated_at` | timestamptz | Row update time. |

### dishes

One row per menu item, owned by a chef. Managed from the dish editor in
`components/chef/ChefDashboard.tsx` and read by the customer kitchen page
`app/kitchen/[chefid].tsx`.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | uuid, primary key | Dish id. |
| `chef_id` | uuid, foreign key | The owning chef, references `chef_profiles.id`. |
| `name` | text | Dish name. |
| `description` | text | Dish description. |
| `price` | numeric(10,2) | Price in PKR. |
| `category` | text | Starter, main, dessert, side, or drink (stored lowercased). |
| `cuisine_type` | text | Dish cuisine. |
| `dietary_info` | text[] | Dietary tags such as Vegetarian or Halal. |
| `spice_level` | integer, 0 to 5 | Spice level. |
| `preparation_time` | integer | Preparation time in minutes. |
| `serving_size` | text | Serving size description. |
| `ingredients` | text[] | Ingredient list, comma split by the editor. |
| `image_url` | text | Dish image URL. The app currently stores a full public URL. |
| `is_available` | boolean | Whether the dish is on the menu. |
| `created_at` | timestamptz | Creation time, used to order the chef's menu. |
| `updated_at` | timestamptz | Row update time. |

## Relationships

- `profiles.id` references `auth.users.id` with cascade delete.
- `chef_profiles.id` references `profiles.id` with cascade delete. It shares its
  id with the matching `profiles` row, and this foreign key is what lets the
  kitchen page embed `profiles` inside a `chef_profiles` query.
- `dishes.chef_id` references `chef_profiles.id` with cascade delete.

## Security

Row Level Security is enabled on all three tables. Anonymous access is denied
everywhere. For signed-in users:

- `profiles`: read and update your own row. Signed-in users may also read a chef's
  row, which is how the kitchen page shows the chef's `phone_number` through its
  embedded select. That read policy is per-row, so it exposes the chef's whole
  profiles row; this is the documented trade-off of keeping chef phone numbers
  visible to signed-in users.
- `chef_profiles`: any signed-in user may read any chef profile to browse. A chef
  may insert and update only their own row.
- `dishes`: any signed-in user may read any dish. A chef may insert, update, and
  delete only dishes whose `chef_id` matches their auth uid.

Two source facts drove those policies: the kitchen page reads another user's
`phone_number` via `profiles!inner(phone_number)`
(`app/kitchen/[chefid].tsx:62-67`), and the customer home updates the signed-in
user's own `profiles` row by id with no server-side ownership check
(`components/customer/CustomerHome.tsx:42-49`). The update policy supplies the
check the app omits.

## Migration files

- `supabase/migrations/20251107000000_create_tables.sql`
- `supabase/migrations/20251107000001_handle_new_user_trigger.sql`
- `supabase/migrations/20251107000002_enable_rls_and_policies.sql`

Apply instructions live in `supabase/README.md`.
