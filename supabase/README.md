# Supabase setup for GKK

This directory holds the SQL migrations that reconstruct the application schema
GKK expects. The tables were defined only in the Supabase dashboard before the
project lost its schema, so every column is derived from the application source
and traced in the migration comments.

The migrations are idempotent and timestamp-ordered. They do not modify the live
database by themselves.

## Apply the migrations

Apply the files yourself in the Supabase dashboard SQL editor, in timestamp order.

1. Open the Supabase dashboard for the project
   `aqqyknwgspxnzahrdkbp.supabase.co`.
2. In the sidebar, open **SQL Editor** and create a new query.
3. Paste the contents of each file and run it, one file at a time, in this order:
   1. `migrations/20251107000000_create_tables.sql`
   2. `migrations/20251107000001_handle_new_user_trigger.sql`
   3. `migrations/20251107000002_enable_rls_and_policies.sql`
4. Confirm under **Table Editor** that `profiles`, `chef_profiles`, and `dishes`
   now exist.
5. Under **Authentication -> Users**, confirm a new signup creates a `profiles`
   row (and, for a chef signup, a `chef_profiles` row).

The dashboard SQL editor runs as `postgres`, which can create objects in both the
`public` and `auth` schemas. That is the role the migrations expect. The files are
safe to re-run.

The trigger only covers users who sign up after it is applied. If the restored
project still has auth users from before the schema was lost, give each of them a
`profiles` row by hand (and, for `user_type = chef`, a matching `chef_profiles`
row) before they sign in.

## Storage bucket

The app expects one public storage bucket named **`avatars`**. The migration files
do not create it; create it by hand.

- **Name:** `avatars`
- **Public:** yes. The app calls `getPublicUrl` to display images
  (`components/customer/CustomerHome.tsx:83-84`,
  `components/chef/ChefDashboard.tsx:324-325`).
- **How the app uses it:**
  - Kitchen photos upload to the bucket root and are stored in
    `chef_profiles.kitchen_image` as a bare file name
    (`components/chef/ChefOnboarding.tsx:84-103`).
  - Dish photos upload under `dish-images/` and are stored in `dishes.image_url`
    (`components/chef/ChefDashboard.tsx:199-224`).

Set these limits on the bucket (**Storage -> `avatars` -> Settings**):

- **Allowed MIME types:** `image/jpeg`, `image/png`, `image/webp`, `image/heic`,
  `image/heif`.
- **Maximum file size:** 5 MB per file.

The app does not enforce these limits itself; Supabase storage limits are the only
hard limit.
