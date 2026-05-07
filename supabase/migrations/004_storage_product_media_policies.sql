-- Standard v21 / Batch 7
-- Storage RLS policies for the product-media bucket.
--
-- The bucket itself must be created via the Supabase dashboard (or the
-- supabase CLI) before applying this migration — Supabase doesn't let you
-- create storage buckets from raw SQL on managed projects. Once created,
-- mark the bucket public so getPublicUrl() works without signed URLs.
--
-- These policies sit on storage.objects. They piggyback on the path layout
-- the app writes to:
--
--   sellers/{seller_id}/products/{product_id}/{timestamp}-{name}
--
-- That pattern lets us verify ownership purely from the path (no joins
-- against products needed). The path is built server-side in lib/storage.ts;
-- a malicious client would have to forge the path to bypass these checks,
-- which is also blocked by the API route's ownership check on the product.
--
-- Policies are idempotent via DROP POLICY IF EXISTS so the migration is
-- re-runnable.
--
-- For deletes the API route checks ownership before deleting; these policies
-- act as a defense-in-depth backstop.

-- Public read (anyone can fetch a product image once it has been uploaded).
-- Required because we render images from the public marketplace and product
-- pages without an authenticated session.
drop policy if exists "product-media public read" on storage.objects;
create policy "product-media public read" on storage.objects
for select
using (bucket_id = 'product-media');

-- Sellers may insert into their own seller_id prefix.
drop policy if exists "product-media seller insert" on storage.objects;
create policy "product-media seller insert" on storage.objects
for insert
with check (
  bucket_id = 'product-media'
  and auth.uid() is not null
  and exists (
    select 1
    from public.sellers s
    where s.profile_id = auth.uid()
      and split_part(name, '/', 1) = 'sellers'
      and split_part(name, '/', 2) = s.id::text
  )
);

-- Sellers may update / delete their own objects.
drop policy if exists "product-media seller update" on storage.objects;
create policy "product-media seller update" on storage.objects
for update
using (
  bucket_id = 'product-media'
  and exists (
    select 1
    from public.sellers s
    where s.profile_id = auth.uid()
      and split_part(name, '/', 1) = 'sellers'
      and split_part(name, '/', 2) = s.id::text
  )
);

drop policy if exists "product-media seller delete" on storage.objects;
create policy "product-media seller delete" on storage.objects
for delete
using (
  bucket_id = 'product-media'
  and exists (
    select 1
    from public.sellers s
    where s.profile_id = auth.uid()
      and split_part(name, '/', 1) = 'sellers'
      and split_part(name, '/', 2) = s.id::text
  )
);

-- Admins can do anything in the bucket (defense-in-depth for moderation).
drop policy if exists "product-media admin all" on storage.objects;
create policy "product-media admin all" on storage.objects
for all
using (bucket_id = 'product-media' and public.is_admin())
with check (bucket_id = 'product-media' and public.is_admin());
