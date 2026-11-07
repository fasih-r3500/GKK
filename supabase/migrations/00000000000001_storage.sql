-- Storage configuration for GharKaKhana (GKK).
--
-- Why this file exists: the buckets and the `storage.objects` policies were configured by
-- hand in the Supabase dashboard and were captured nowhere in this repository, so a rebuild
-- from `00000000000000_baseline.sql` left storage broken. Dish photo uploads failed for weeks
-- because `storage.objects` had row level security enabled with zero policies: every insert
-- was refused, and the client surfaced nothing, so the failure looked like a successful upload.
--
-- This file records that configuration. It is idempotent: every statement can be re-run
-- against a database that already has the buckets and the policies.

-- 1. Size and MIME limits on both buckets.
--    The app uploads raw image bytes with an explicit content type of image/jpeg, image/png,
--    image/webp, image/heic, or image/heif, so the allowlist here matches what the client sends.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','image/heif']
where id in ('avatars', 'dish-images');

-- 2. Create the buckets if a rebuild starts from an empty project.
--    Both are public so image reads work without a signed URL. The limits are repeated here
--    because step 1 updates only buckets that already exist.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880,
   array['image/jpeg','image/png','image/webp','image/heic','image/heif']),
  ('dish-images', 'dish-images', true, 5242880,
   array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do nothing;

-- 3. Object policies.
--    Row level security is already enabled on storage.objects in a Supabase project, and that flag
--    is not the problem: enabled with no policy denies every read and write, which is the state
--    that broke uploads. The four policies below are the fix. Each is dropped first so this
--    section can be re-run against a database that already has them.
drop policy if exists "GKK public read storage images" on storage.objects;
create policy "GKK public read storage images"
  on storage.objects
  for select
  to public
  using (bucket_id in ('avatars', 'dish-images'));

drop policy if exists "GKK authenticated insert storage images" on storage.objects;
create policy "GKK authenticated insert storage images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id in ('avatars', 'dish-images'));

drop policy if exists "GKK authenticated update storage images" on storage.objects;
create policy "GKK authenticated update storage images"
  on storage.objects
  for update
  to authenticated
  using (bucket_id in ('avatars', 'dish-images'))
  with check (bucket_id in ('avatars', 'dish-images'));

drop policy if exists "GKK authenticated delete storage images" on storage.objects;
create policy "GKK authenticated delete storage images"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id in ('avatars', 'dish-images'));
