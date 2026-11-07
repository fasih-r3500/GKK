# Supabase schema for GKK

This directory holds the SQL migrations for the Supabase project behind GharKaKhana (GKK).
The database is live and populated.
`migrations/00000000000000_baseline.sql` is a schema-only dump of that database, not a reconstruction from application source.
`migrations/00000000000001_storage.sql` records the storage configuration, which the dump cannot reach because it lives in the `storage` schema rather than `public`.

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
6. Apply the storage configuration, which covers the `storage` schema that the baseline does not:

   ```sh
   psql "$DATABASE_URL" --single-transaction \
     -f supabase/migrations/00000000000001_storage.sql
   ```

   It creates the `avatars` and `dish-images` buckets as public if they are absent, sets the 5 MB size limit and the image MIME allowlist on both, and creates the four `storage.objects` policies.
   It is idempotent, so it is safe to re-run at any time.
7. Confirm under **Storage** that both buckets exist, are marked public, and show a 5 MB limit with the five image types in their settings.
   Without the storage migration, a fresh project has row level security enabled on `storage.objects` and no policies, so every upload is refused.

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

## Storage

Storage is configured in two files: `migrations/00000000000001_storage.sql` for the buckets and the `storage.objects` policies, and the application code for which bucket it reads and writes.
The baseline migration cannot cover storage: `pg_dump --schema-only --schema=public` does not emit the `storage` schema, so the buckets and their object policies were configured by hand in the dashboard and were recorded nowhere until the storage migration was added.

### Buckets

The storage migration configures two public buckets, **`avatars`** and **`dish-images`**:

- **Public:** yes on both.
  `avatars` is read with public URLs, and public means an image URL works without a signed URL.
  The app displays images by resolving the stored value with `resolveStorageImageUrl` in `services/storage.ts` (`components/chef/ChefDashboard.tsx`, `app/kitchen/[chefid].tsx`); `components/customer/CustomerHome.tsx:79` still calls `getPublicUrl` directly for kitchen photos.
- **Maximum file size:** `5242880` bytes (5 MB) per file, set as `file_size_limit` on both buckets.
- **Allowed MIME types:** `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`, set as `allowed_mime_types` on both buckets.
  These are the five types the client sends.
- **Which bucket the app actually uses:** only `avatars`.
  The app source never names `dish-images` as a bucket; it uses `dish-images` as a folder prefix inside `avatars` (the `DISH_IMAGE_PREFIX` constant in `services/storage.ts`).
  The `dish-images` bucket is provisioned and left empty, so a future move to a separate dish bucket needs no dashboard work.
- **How the app uses `avatars`:**
  - Kitchen photos upload to the bucket root and are stored in `chef_profiles.kitchen_image` as a bare file name (`components/chef/ChefOnboarding.tsx:84-98`).
  - Dish photos upload under `dish-images/` and are stored in `dishes.image_url` as a bare path such as `dish-images/<user>-<timestamp>.jpg` (`components/chef/ChefDashboard.tsx` `uploadDishImage`).
  - Both shapes are resolved for display by `resolveStorageImageUrl` in `services/storage.ts`: a bare path becomes a public URL, and a full URL (as written by older dish rows) is used as is.
  - Dish uploads send an explicit content type (`image/jpeg`, `image/png`, `image/webp`, `image/heic`, or `image/heif`) with the raw image bytes. Without it the client would default to `text/plain;charset=UTF-8`, which the MIME allowlist above rejects.

The `dish-images/` prefix inside `avatars` is the only dish-photo location the app reads or writes, and it matches the `DISH_IMAGE_PREFIX` constant in `services/storage.ts`.

The app does not enforce these limits itself; Supabase storage limits are the only hard limit.

### Storage policies

Row level security on `storage.objects` is enabled, and the storage migration adds four policies to it.
It drops each policy before creating it, so re-running the file is safe.

| Policy | Role | Command | Allows |
| --- | --- | --- | --- |
| `GKK public read storage images` | `public` | `select` | Reading any object in the `avatars` and `dish-images` buckets, signed in or not. |
| `GKK authenticated insert storage images` | `authenticated` | `insert` | A signed-in user uploading a new object into either bucket. |
| `GKK authenticated update storage images` | `authenticated` | `update` | A signed-in user replacing an object in either bucket. |
| `GKK authenticated delete storage images` | `authenticated` | `delete` | A signed-in user removing an object from either bucket. |

Every policy is restricted to those two bucket ids through `bucket_id in ('avatars', 'dish-images')`, so a future bucket is not writable or readable by these policies until it is added to them.

This is the configuration that made uploads possible again.
With row level security enabled and no policies at all, every upload was refused and the client showed no error, so dish photo failures looked like silence for weeks.
Before the storage migration existed, nothing in the repository recorded the difference between those two states.

### Known gap: no per-user folder convention

Any signed-in user can overwrite or delete another user's file if they know its path, because the write policies check only the bucket and not the object path or owner.
Object names today are predictable, since a dish photo is `dish-images/<user>-<timestamp>.<ext>` and a kitchen photo is a bare `<user>-<timestamp>.<ext>`, and a user id is visible to other signed-in users.
An upload without `upsert` fails when the object exists, but `update` and `delete` on a known path are allowed outright, so a client that sets `upsert` or sends a delete can replace or remove another user's image.

A per-user path convention, with an `auth.uid()` check on the first path segment in each write policy, is the hardening step to schedule.
It is not part of this migration because it changes the paths the app writes and needs its own change under `app/`, `components/`, and `services/`.
