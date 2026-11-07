# Supabase schema for GKK

This directory holds the SQL migrations for the Supabase project behind GharKaKhana (GKK).
The database is live and populated.
`migrations/00000000000000_baseline.sql` is a schema-only dump of that database, not a reconstruction from application source.

The baseline records the schema as it exists: nine tables in the `public` schema, the `user_type`, `order_status`, and `day_of_week` enum types, helper functions, views, triggers, indexes, and row level security policies.
It also includes the `on_auth_user_created` trigger on `auth.users`, which was appended by hand because it lives outside the `public` schema.

The three earlier migration files in this directory were reconstructed from application source while the database was mistakenly believed lost.
They were wrong: they defined three tables instead of nine, treated `user_type` as text, and would fail or mislead if applied.
They have been deleted and replaced by the baseline.

## How the baseline was captured

The file was produced from the live database with:

```sh
pg_dump --schema-only --schema=public --no-owner --no-privileges
```

The `on_auth_user_created` trigger on `auth.users` is outside the `public` schema, so `pg_dump` does not emit it.
It was appended to the end of the dump by hand so a rebuild leaves the database in the same state.

Do not edit the dumped SQL: the file is the record of the current schema.
Future changes belong in new, later migration files.

## Apply the baseline to a fresh project

The baseline documents an existing database.
Applying it creates a new database with the same schema; it does not copy any data.

1. Create a Supabase project.
2. Copy its database connection string from **Project Settings -> Database -> Connection string -> URI**.
   Use a role that can create objects in both the `public` and `auth` schemas, such as `postgres`.
3. A standard Postgres or Supabase database already has a `public` schema, so remove only the dump's `CREATE SCHEMA public;` line while streaming the file, then apply the rest in one transaction:

   ```sh
   sed '/^CREATE SCHEMA public;$/d' supabase/migrations/00000000000000_baseline.sql \
     | psql "$DATABASE_URL" --single-transaction
   ```

   The `CREATE SCHEMA public;` line fails on a fresh project because the schema already exists, and inside `--single-transaction` that failure would abort every later statement.
   Filtering that one line leaves the rest of the dump unchanged.

4. Confirm under **Table Editor** that these nine tables exist: `profiles`, `chef_profiles`, `customer_profiles`, `dishes`, `favorites`, `operating_hours`, `orders`, `order_items`, and `reviews`.
5. Confirm under **Authentication -> Policies** that row level security is enabled on all nine tables.

The file contains the `\restrict` and `\unrestrict` psql meta-commands emitted by `pg_dump`.
The dashboard SQL editor may reject those lines; use `psql`, or remove only those two lines if pasting the file into the editor.

The baseline is the first migration by timestamp, so the Supabase CLI and similar tools apply it first if this project later gains a `config.toml`.
It expects the Supabase `auth` schema and `auth.users` table to exist, which a fresh Supabase project provides.

The trigger only covers users who sign up after it is applied.
If you copy auth users from another project, give each of them a `profiles` row and the matching `customer_profiles` or `chef_profiles` row, following the logic in `public.handle_new_user`.

## Row level security

Row level security is enabled on all nine tables.
The read policies on `profiles`, `chef_profiles`, `dishes`, and `operating_hours` name `TO authenticated`, so an anonymous request returns no rows from those tables.

Some policies omit a `TO` clause, which means they are granted to the Postgres `PUBLIC` pseudo-role, and therefore to both `anon` and `authenticated`:

- `customer_profiles`: `Customers can manage their own profile`.
- `favorites`: `Customers can manage their favorites`.
- `operating_hours`: `Chefs can manage their operating hours`.
- `orders`: `Customers can create orders`, `Customers can view their own orders`, `Chefs can view orders for their kitchen`, and `Chefs can update their kitchen orders`.
- `order_items`: `Order items inherit order policies` and `Customers can create order items with orders`.
- `reviews`: `Customers can create reviews for completed orders`.
- `reviews`: `Anyone can view visible reviews`.

Every policy in that list except `Anyone can view visible reviews` is guarded by an `auth.uid()` condition, so an anonymous request matches nothing.
`Anyone can view visible reviews` has no `auth.uid()` condition and is the exception: its only condition is `is_visible = true`, so the `anon` role can read visible reviews.
The app does not query `reviews` yet.

`docs/DATABASE.md` gives the per-table conditions and the full policy list.

## Storage bucket

The app expects one public storage bucket named **`avatars`**.
No migration creates it; create it by hand in the dashboard or with the Supabase CLI.

- **Name:** `avatars`
- **Public:** yes.
  The app displays images by resolving the stored value with `resolveStorageImageUrl` in `services/storage.ts` (`components/chef/DishCard.tsx`, `components/chef/DishFormModal.tsx`, `components/customer/CustomerHome.tsx`, `app/kitchen/[chefid].tsx`).
- **How the app uses it:**
  - Kitchen photos upload to the bucket root and are stored in `chef_profiles.kitchen_image` as a bare file name (`components/chef/ChefOnboarding.tsx:84-98`).
  - Dish photos upload under `dish-images/` and are stored in `dishes.image_url` as a bare path such as `dish-images/<user>-<timestamp>.jpg` (`components/chef/DishFormModal.tsx` `uploadDishImage`).
  - Both shapes are resolved for display by `resolveStorageImageUrl` in `services/storage.ts`: a bare path becomes a public URL, and a full URL (as written by older dish rows) is used as is.
  - Dish uploads send an explicit content type (`image/jpeg`, `image/png`, `image/webp`, `image/heic`, or `image/heif`) with the raw image bytes. Without it the client would default to `text/plain;charset=UTF-8`, which the MIME allowlist below rejects.

There is no separate dish bucket. The `dish-images/` prefix inside `avatars` is the only dish-photo location the app reads or writes, and it matches the `DISH_IMAGE_PREFIX` constant in `services/storage.ts`.

The bucket itself, its public flag, its MIME allowlist, and its `storage.objects` RLS policies are configured in the Supabase dashboard. Neither the baseline migration nor any other file in this repository creates them, so a fresh project needs them created by hand before uploads or public reads work.

Set these limits on the bucket (**Storage -> `avatars` -> Settings**):

- **Allowed MIME types:** `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`.
- **Maximum file size:** 5 MB per file.

The app does not enforce these limits itself; Supabase storage limits are the only hard limit.
